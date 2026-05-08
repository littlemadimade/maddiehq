require "test_helper"

class Api::Auth::SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    # Disable rate limiting for tests by overriding the method
    Api::Auth::SessionsController.define_method(:rate_limit!) { nil }
  end

  teardown do
    # Restore original rate_limit! behavior
    Api::Auth::SessionsController.class_eval do
      private

      def rate_limit!
        auth_rate_limiter.check!(request)
      rescue RateLimitExceeded => e
        render json: { error: "Too many requests" }, status: :too_many_requests,
               headers: { "Retry-After" => e.retry_after.to_s }
      end
    end
  end

  # ── POST /api/auth/login ──

  test "POST /api/auth/login with valid credentials returns user and session" do
    post "/api/auth/login", params: {
      email: "regular@example.com",
      password: "password123"
    }, as: :json

    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal users(:regular).id, json["user"]["id"]
    assert_equal "regular@example.com", json["user"]["email"]
    assert json["session"]["token"].present?
  end

  test "POST /api/auth/login sets session cookie" do
    post "/api/auth/login", params: {
      email: "regular@example.com",
      password: "password123"
    }, as: :json

    assert_response :ok
    assert cookies[:session_token].present?
  end

  test "POST /api/auth/login with wrong password returns 401" do
    post "/api/auth/login", params: {
      email: "regular@example.com",
      password: "wrongpassword"
    }, as: :json

    assert_response :unauthorized

    json = JSON.parse(response.body)
    assert_match(/invalid/i, json["error"])
  end

  test "POST /api/auth/login with non-existent email returns 401" do
    post "/api/auth/login", params: {
      email: "nobody@example.com",
      password: "password123"
    }, as: :json

    assert_response :unauthorized
  end

  test "POST /api/auth/login with missing fields returns 422" do
    post "/api/auth/login", params: {}, as: :json

    assert_response :unprocessable_entity
  end

  test "POST /api/auth/login with disabled account returns 403" do
    post "/api/auth/login", params: {
      email: "disabled@example.com",
      password: "password123"
    }, as: :json

    assert_response :forbidden

    json = JSON.parse(response.body)
    assert_match(/disabled/i, json["error"])
  end

  # ── GET /api/auth/session ──

  test "GET /api/auth/session when authenticated returns user data" do
    session = sessions(:regular_session)

    get "/api/auth/session", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal users(:regular).id, json["user"]["id"]
    assert_equal "regular@example.com", json["user"]["email"]
  end

  test "GET /api/auth/session when not authenticated returns null user" do
    get "/api/auth/session"

    assert_response :ok

    json = JSON.parse(response.body)
    assert_nil json["user"]
  end

  test "GET /api/auth/session with expired session returns null user" do
    session = sessions(:regular_session)
    session.update_column(:expires_at, 1.hour.ago)

    get "/api/auth/session", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok
    json = JSON.parse(response.body)
    assert_nil json["user"]
  end

  # ── DELETE /api/auth/logout ──

  test "DELETE /api/auth/logout destroys session and returns success" do
    session = sessions(:regular_session)

    assert_difference("Session.count", -1) do
      delete "/api/auth/logout", headers: {
        "Authorization" => "Bearer #{session.token}"
      }
    end

    assert_response :ok

    json = JSON.parse(response.body)
    assert_match(/logged out/i, json["message"])
  end

  test "DELETE /api/auth/logout without auth returns 401" do
    delete "/api/auth/logout", as: :json

    assert_response :unauthorized
  end
end
