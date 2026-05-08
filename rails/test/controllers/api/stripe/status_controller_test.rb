require "test_helper"

class Api::Stripe::StatusControllerTest < ActionDispatch::IntegrationTest
  # Integration tests can't set a signed cookie jar, so auth via Bearer token.
  def auth_headers_for(user)
    session = Session.create!(
      user: user,
      expires_at: 7.days.from_now,
      ip_address: "127.0.0.1",
      user_agent: "Minitest"
    )
    { "Authorization" => "Bearer #{session.token}" }
  end

  test "GET /api/stripe/status returns plan and status for authenticated user" do
    get "/api/stripe/status", headers: auth_headers_for(users(:regular))
    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal "free", json["plan"]
    assert_equal "inactive", json["status"]
  end

  test "GET /api/stripe/status returns pro plan for subscribed user" do
    get "/api/stripe/status", headers: auth_headers_for(users(:admin))
    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal "pro", json["plan"]
    assert_equal "active", json["status"]
  end

  test "GET /api/stripe/status returns 401 when unauthenticated" do
    get "/api/stripe/status"
    assert_response :unauthorized
  end
end
