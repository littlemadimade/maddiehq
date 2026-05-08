require "test_helper"
require_relative "../../lib/job_queue"

class JobQueueTest < ActiveSupport::TestCase
  setup do
    JobQueue.reset!
  end

  test "register and registered_types" do
    JobQueue.register('test_job') { "hello" }
    assert_includes JobQueue.registered_types, 'test_job'
  end

  test "enqueue creates a pending job" do
    job = JobQueue.enqueue('test_job', payload: { foo: 'bar' })
    assert_equal 'test_job', job.job_type
    assert_equal 'pending', job.status
    assert_equal '{"foo":"bar"}', job.payload
    assert_equal 0, job.attempts
  end

  test "enqueue with scheduled_at sets future schedule" do
    future = 1.hour.from_now
    job = JobQueue.enqueue('test_job', scheduled_at: future)
    assert_in_delta future.to_f, job.scheduled_at.to_f, 1.0
  end

  test "process runs registered handler and marks completed" do
    called = false
    JobQueue.register('test_job') { |_payload| called = true }
    JobQueue.enqueue('test_job')

    results = JobQueue.process
    assert called
    assert_equal 1, results[:processed]
    assert_equal 0, results[:failed]

    job = Job.last
    assert_equal 'completed', job.status
    assert_equal 1, job.attempts
    assert_not_nil job.completed_at
  end

  test "process passes parsed payload to handler" do
    received_payload = nil
    JobQueue.register('test_job') { |payload| received_payload = payload }
    JobQueue.enqueue('test_job', payload: { key: 'value' })

    JobQueue.process
    assert_equal({ 'key' => 'value' }, received_payload)
  end

  test "process handles failure and retries with backoff" do
    call_count = 0
    JobQueue.register('failing_job') do
      call_count += 1
      raise "Something went wrong"
    end

    JobQueue.enqueue('failing_job')
    results = JobQueue.process

    assert_equal 0, results[:processed]
    assert_equal 1, results[:failed]
    assert_equal 1, call_count

    job = Job.last
    assert_equal 'pending', job.status  # retryable — back to pending
    assert_equal 1, job.attempts
    assert_equal "Something went wrong", job.last_error
    assert job.scheduled_at > Time.current  # backoff applied
  end

  test "process marks failed after max_attempts" do
    JobQueue.register('failing_job') { raise "fail" }
    job = JobQueue.enqueue('failing_job')
    job.update!(attempts: 2, max_attempts: 3)

    JobQueue.process

    job.reload
    assert_equal 'failed', job.status
    assert_equal 3, job.attempts
  end

  test "process skips jobs without registered handler" do
    JobQueue.enqueue('unknown_type')
    results = JobQueue.process

    assert_equal 0, results[:processed]
    assert_equal 1, results[:failed]

    job = Job.last
    assert_equal 'failed', job.status
    assert_match(/No handler registered/, job.last_error)
  end

  test "process skips future scheduled jobs" do
    JobQueue.register('test_job') { "ok" }
    JobQueue.enqueue('test_job', scheduled_at: 1.hour.from_now)

    results = JobQueue.process
    assert_equal 0, results[:processed]
  end

  test "process respects limit" do
    JobQueue.register('test_job') { "ok" }
    3.times { JobQueue.enqueue('test_job') }

    results = JobQueue.process(limit: 2)
    assert_equal 2, results[:processed]
  end
end
