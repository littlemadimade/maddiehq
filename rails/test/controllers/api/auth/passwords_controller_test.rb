require "test_helper"

class Api::Auth::PasswordsControllerTest < ActionDispatch::IntegrationTest
  include ActionMailer::TestHelper

  setup do
    # Disable rate limiting for tests
    Api::Auth::PasswordsController.define_method(:rate_limit!) { nil }
    @user = users(:regular)
  end

  teardown do
    Api::Auth::PasswordsController.class_eval do
      private

      def rate_limit!
        auth_rate_limiter.check!(request)
      rescue RateLimitExceeded => e
        render json: { error: "Too many requests" }, status: :too_many_requests,
               headers: { "Retry-After" => e.retry_after.to_s }
      end
    end
  end

  test "POST /api/auth/forgot-password with known email creates reset token and enqueues email" do
    assert_enqueued_emails 1 do
      post "/api/auth/forgot-password", params: { email: @user.email }, as: :json
    end

    assert_response :ok
    token = Verification.find_by("identifier = ?", "password-reset:#{@user.email}")
    assert_not_nil token
    assert token.expires_at > Time.current
  end

  test "POST /api/auth/forgot-password with unknown email still returns 200 (no enumeration) and sends no email" do
    assert_enqueued_emails 0 do
      post "/api/auth/forgot-password", params: { email: "nobody@example.com" }, as: :json
    end

    assert_response :ok
    json = JSON.parse(response.body)
    assert_match(/password reset link has been sent/i, json["message"])
  end

  test "POST /api/auth/forgot-password with blank email returns 422" do
    post "/api/auth/forgot-password", params: { email: "" }, as: :json
    assert_response :unprocessable_entity
  end
end
