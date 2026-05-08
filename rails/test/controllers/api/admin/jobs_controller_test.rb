require "test_helper"
require_relative "../../../../lib/job_queue"

class Api::Admin::JobsControllerTest < ActionDispatch::IntegrationTest
  setup do
    JobQueue.reset!
    JobQueue.register('test_job') { "ok" }
  end

  # ── Authentication ──

  test "GET /api/admin/jobs without auth returns 401" do
    get "/api/admin/jobs"
    assert_response :unauthorized
  end

  test "GET /api/admin/jobs as regular user returns 403" do
    session = sessions(:regular_session)
    get "/api/admin/jobs", headers: { "Authorization" => "Bearer #{session.token}" }
    assert_response :forbidden
  end

  # ── Index ──

  test "GET /api/admin/jobs as admin returns job stats and recent jobs" do
    session = sessions(:admin_session)
    Job.create!(job_type: 'test_job', status: 'completed')
    Job.create!(job_type: 'test_job', status: 'pending')
    Job.create!(job_type: 'test_job', status: 'failed')

    get "/api/admin/jobs", headers: { "Authorization" => "Bearer #{session.token}" }
    assert_response :ok

    json = JSON.parse(response.body)
    data = json["data"]

    assert data.key?("counts")
    assert data.key?("jobs")
    assert data.key?("registered_types")
    assert_includes data["registered_types"], "test_job"
    assert_equal 1, data["counts"]["completed"]
    assert_operator data["jobs"].size, :>=, 3
  end

  test "GET /api/admin/jobs with status filter" do
    session = sessions(:admin_session)
    Job.create!(job_type: 'test_job', status: 'failed', last_error: 'boom')
    Job.create!(job_type: 'test_job', status: 'completed')

    get "/api/admin/jobs?status=failed", headers: { "Authorization" => "Bearer #{session.token}" }
    assert_response :ok

    json = JSON.parse(response.body)
    jobs = json["data"]["jobs"]
    assert jobs.all? { |j| j["status"] == "failed" }
  end

  # ── Create ──

  test "POST /api/admin/jobs enqueues a job" do
    session = sessions(:admin_session)

    post "/api/admin/jobs",
      params: { job_type: "test_job", payload: { key: "value" } },
      headers: { "Authorization" => "Bearer #{session.token}" },
      as: :json

    assert_response :created

    json = JSON.parse(response.body)
    assert_equal "test_job", json["data"]["job_type"]
    assert_equal "pending", json["data"]["status"]
  end

  test "POST /api/admin/jobs without job_type returns 400" do
    session = sessions(:admin_session)

    post "/api/admin/jobs",
      params: { payload: {} },
      headers: { "Authorization" => "Bearer #{session.token}" },
      as: :json

    assert_response :bad_request
  end

  # ── Process ──

  test "POST /api/admin/jobs/process processes pending jobs" do
    session = sessions(:admin_session)
    JobQueue.enqueue('test_job')

    post "/api/admin/jobs/process",
      headers: { "Authorization" => "Bearer #{session.token}" }

    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal 1, json["data"]["processed"]
    assert_equal 0, json["data"]["failed"]
  end
end
