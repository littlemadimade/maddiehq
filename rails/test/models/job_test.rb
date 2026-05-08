require "test_helper"

class JobTest < ActiveSupport::TestCase
  test "validates presence of job_type" do
    job = Job.new(status: 'pending')
    assert_not job.valid?
    assert_includes job.errors[:job_type], "can't be blank"
  end

  test "validates status inclusion" do
    job = Job.new(job_type: 'test', status: 'invalid')
    assert_not job.valid?
    assert_includes job.errors[:status], "is not included in the list"
  end

  test "valid statuses are accepted" do
    %w[pending running completed failed].each do |status|
      job = Job.new(job_type: 'test', status: status)
      assert job.valid?, "Expected status '#{status}' to be valid"
    end
  end

  test "defaults to pending status" do
    job = Job.create!(job_type: 'test')
    assert_equal 'pending', job.status
    assert_equal 0, job.attempts
    assert_equal 3, job.max_attempts
  end

  test "pending scope returns only pending jobs with past scheduled_at" do
    past_pending = Job.create!(job_type: 'test', status: 'pending', scheduled_at: 1.minute.ago)
    future_pending = Job.create!(job_type: 'test', status: 'pending', scheduled_at: 1.hour.from_now)
    completed = Job.create!(job_type: 'test', status: 'completed', scheduled_at: 1.minute.ago)

    pending = Job.pending.to_a
    assert_includes pending, past_pending
    assert_not_includes pending, future_pending
    assert_not_includes pending, completed
  end

  test "recent scope returns last 50 jobs ordered by created_at desc" do
    first = Job.create!(job_type: 'test')
    second = Job.create!(job_type: 'test')

    recent = Job.recent.to_a
    assert_equal second, recent.first
    assert_equal first, recent.last
  end
end
