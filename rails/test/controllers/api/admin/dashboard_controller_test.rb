require "test_helper"

class Api::Admin::DashboardControllerTest < ActionDispatch::IntegrationTest
  test "GET /api/admin/dashboard as admin returns dashboard data" do
    session = sessions(:admin_session)

    get "/api/admin/dashboard", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok

    json = JSON.parse(response.body)
    data = json["data"]

    assert data.key?("total_users")
    assert data.key?("new_users_today")
    assert data.key?("new_users_week")
    assert data.key?("total_items")
    assert data.key?("active_subscriptions")
    assert data.key?("revenue_estimate")
    assert data.key?("recent_signups")
    assert data.key?("recent_admin_logs")

    assert_kind_of Integer, data["total_users"]
    assert data["total_users"] > 0
  end

  test "GET /api/admin/dashboard as regular user returns 403" do
    session = sessions(:regular_session)

    get "/api/admin/dashboard", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :forbidden

    json = JSON.parse(response.body)
    assert_match(/forbidden/i, json["error"])
  end

  test "GET /api/admin/dashboard without auth returns 401" do
    get "/api/admin/dashboard"

    assert_response :unauthorized

    json = JSON.parse(response.body)
    assert_match(/not authenticated/i, json["error"])
  end

  test "GET /api/admin/dashboard with expired session returns 401" do
    session = sessions(:admin_session)
    session.update_column(:expires_at, 1.hour.ago)

    get "/api/admin/dashboard", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :unauthorized
  end
end
