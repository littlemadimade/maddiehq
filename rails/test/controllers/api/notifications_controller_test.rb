require "test_helper"

class Api::NotificationsControllerTest < ActionDispatch::IntegrationTest
  test "GET /api/notifications without auth returns 401" do
    get "/api/notifications"
    assert_response :unauthorized
  end

  test "GET /api/notifications returns notifications for current user" do
    session = sessions(:regular_session)

    get "/api/notifications", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok
    json = JSON.parse(response.body)
    assert json.key?("notifications")
    assert json.key?("unreadCount")
    assert_equal 1, json["unreadCount"] # 1 unread fixture
  end

  test "POST /api/notifications/:id/read marks notification as read" do
    session = sessions(:regular_session)
    notif = notifications(:welcome)

    post "/api/notifications/#{notif.id}/read", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok
    assert notif.reload.read
  end

  test "POST /api/notifications/read-all marks all as read" do
    session = sessions(:regular_session)

    post "/api/notifications/read-all", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok
    assert_equal 0, Notification.where(user_id: "usr-regular-0001", read: false).count
  end
end
