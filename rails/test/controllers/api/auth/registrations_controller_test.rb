require "test_helper"

class Api::Auth::RegistrationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    # Disable rate limiting for tests by overriding the method
    Api::Auth::RegistrationsController.define_method(:rate_limit!) { nil }
  end

  teardown do
    # Restore original rate_limit! behavior
    Api::Auth::RegistrationsController.class_eval do
      private

      def rate_limit!
        auth_rate_limiter.check!(request)
      rescue RateLimitExceeded => e
        render json: { error: "Too many requests" }, status: :too_many_requests,
               headers: { "Retry-After" => e.retry_after.to_s }
      end
    end
  end

  test "POST /api/auth/signup creates user and returns session" do
    assert_difference("User.count", 1) do
      post "/api/auth/signup", params: {
        email: "newuser@example.com",
        password: "securepassword",
        name: "New User"
      }, as: :json
    end

    assert_response :created

    json = JSON.parse(response.body)
    assert json["user"]["id"].present?
    assert_equal "newuser@example.com", json["user"]["email"]
    assert_equal "New User", json["user"]["name"]
    assert json["session"]["token"].present?
  end

  test "POST /api/auth/signup sets session cookie" do
    post "/api/auth/signup", params: {
      email: "cookietest@example.com",
      password: "securepassword",
      name: "Cookie User"
    }, as: :json

    assert_response :created
    assert cookies[:session_token].present?
  end

  test "POST /api/auth/signup with missing email returns 422" do
    post "/api/auth/signup", params: {
      password: "securepassword",
      name: "No Email"
    }, as: :json

    assert_response :unprocessable_entity

    json = JSON.parse(response.body)
    assert json["error"].present?
  end

  test "POST /api/auth/signup with missing password returns 422" do
    post "/api/auth/signup", params: {
      email: "nopass@example.com",
      name: "No Password"
    }, as: :json

    assert_response :unprocessable_entity
  end

  test "POST /api/auth/signup with missing name returns 422" do
    post "/api/auth/signup", params: {
      email: "noname@example.com",
      password: "securepassword"
    }, as: :json

    assert_response :unprocessable_entity
  end

  test "POST /api/auth/signup with short password returns 422" do
    post "/api/auth/signup", params: {
      email: "short@example.com",
      password: "short",
      name: "Short Pass"
    }, as: :json

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert_match(/at least 8 characters/i, json["error"])
  end

  test "POST /api/auth/signup with invalid email returns 422" do
    post "/api/auth/signup", params: {
      email: "not-an-email",
      password: "securepassword",
      name: "Bad Email"
    }, as: :json

    assert_response :unprocessable_entity
  end

  test "POST /api/auth/signup with duplicate email returns 409" do
    existing = users(:regular)

    post "/api/auth/signup", params: {
      email: existing.email,
      password: "securepassword",
      name: "Duplicate"
    }, as: :json

    assert_response :conflict

    json = JSON.parse(response.body)
    assert_match(/already in use/i, json["error"])
  end

  test "POST /api/auth/signup creates credential account" do
    assert_difference("Account.count", 1) do
      post "/api/auth/signup", params: {
        email: "withaccount@example.com",
        password: "securepassword",
        name: "With Account"
      }, as: :json
    end

    user = User.find_by(email: "withaccount@example.com")
    account = user.credential_account
    assert_not_nil account
    assert_equal "credential", account.provider_id
    assert BCrypt::Password.new(account.password) == "securepassword"
  end
end
