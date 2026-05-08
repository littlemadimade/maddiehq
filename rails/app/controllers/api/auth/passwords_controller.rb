class Api::Auth::PasswordsController < ApplicationController
  skip_before_action :verify_authenticity_token
  wrap_parameters false
  before_action :rate_limit!

  def forgot
    email = params[:email]&.strip&.downcase

    if email.blank?
      return render json: { error: "Email is required" }, status: :unprocessable_entity
    end

    user = User.find_by(email: email)

    # Always return success to prevent email enumeration
    if user
      # Clean up any existing password reset tokens for this email
      Verification.where("identifier = ?", "password-reset:#{email}").destroy_all

      verification = Verification.create!(
        identifier: "password-reset:#{email}",
        value: SecureRandom.hex(32),
        expires_at: 1.hour.from_now
      )

      # Fire-and-forget reset email via the background mailer pipeline.
      # EmailHelper swallows delivery errors so the request completes even
      # when RESEND_API_KEY is unset or the provider is unreachable.
      reset_url = "#{helpers.app_url}/reset-password?token=#{CGI.escape(verification.value)}"
      EmailHelper.send_password_reset(email, reset_url)
    end

    render json: { message: "If an account exists with that email, a password reset link has been sent" }
  end

  def reset
    token = params[:token]
    new_password = params[:password]

    if token.blank? || new_password.blank?
      return render json: { error: "Token and password are required" }, status: :unprocessable_entity
    end

    if new_password.length < 8
      return render json: { error: "Password must be at least 8 characters" }, status: :unprocessable_entity
    end

    verification = Verification.active.find_by(value: token)

    unless verification&.identifier&.start_with?("password-reset:")
      return render json: { error: "Invalid or expired token" }, status: :unprocessable_entity
    end

    email = verification.identifier.delete_prefix("password-reset:")
    user = User.find_by(email: email)

    unless user
      return render json: { error: "User not found" }, status: :not_found
    end

    account = user.credential_account
    unless account
      return render json: { error: "No credential account found" }, status: :unprocessable_entity
    end

    account.update!(password: BCrypt::Password.create(new_password))
    verification.destroy!

    # Invalidate all existing sessions for security
    user.sessions.destroy_all

    render json: { message: "Password reset successfully" }
  end

  private

  def rate_limit!
    auth_rate_limiter.check!(request)
  rescue RateLimitExceeded => e
    render json: { error: "Too many requests" }, status: :too_many_requests,
           headers: { "Retry-After" => e.retry_after.to_s }
  end

  def auth_rate_limiter
    @auth_rate_limiter ||= RateLimiter.new(limit: 5, window_seconds: 60)
  end
end
