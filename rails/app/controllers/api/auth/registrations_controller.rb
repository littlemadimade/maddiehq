class Api::Auth::RegistrationsController < ApplicationController
  skip_before_action :verify_authenticity_token
  wrap_parameters false
  before_action :rate_limit!, only: [:create, :verify_email]

  def create
    email = params[:email]&.strip&.downcase
    password = params[:password]
    name = params[:name]&.strip.presence

    if email.blank? || password.blank? || name.blank?
      return render json: { error: "Email, password, and name are required" }, status: :unprocessable_entity
    end

    unless email.match?(URI::MailTo::EMAIL_REGEXP)
      return render json: { error: "Invalid email format" }, status: :unprocessable_entity
    end

    if password.length < 8
      return render json: { error: "Password must be at least 8 characters" }, status: :unprocessable_entity
    end

    if User.exists?(email: email)
      return render json: { error: "Email already in use" }, status: :conflict
    end

    ActiveRecord::Base.transaction do
      @user = User.create!(email: email, name: name)

      Account.create!(
        user: @user,
        provider_id: "credential",
        account_id: email,
        password: BCrypt::Password.create(password)
      )

      @session = Session.create!(
        user: @user,
        expires_at: 7.days.from_now,
        ip_address: request.remote_ip,
        user_agent: request.user_agent
      )

      # Create email verification token
      @verification = Verification.create!(
        identifier: "email-verification:#{email}",
        value: SecureRandom.hex(32),
        expires_at: 24.hours.from_now
      )
    end

    cookies.signed[:session_token] = {
      value: @session.token,
      expires: @session.expires_at,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax
    }

    # Send welcome email (fire-and-forget)
    begin
      AppMailer.welcome_email(email).deliver_later
    rescue => e
      Rails.logger.warn("[auth] Welcome email failed: #{e.message}")
    end

    # Send verification email (fire-and-forget)
    begin
      verify_url = "#{helpers.app_url}/verify-email?token=#{@verification.value}"
      AppMailer.verification_email(email, verify_url).deliver_later
    rescue => e
      Rails.logger.warn("[auth] Verification email failed: #{e.message}")
    end

    render json: {
      user: { id: @user.id, email: @user.email, name: @user.name },
      session: { token: @session.token, expires_at: @session.expires_at }
    }, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def verify_email
    token = params[:token]

    if token.blank?
      return render json: { error: "Token is required" }, status: :unprocessable_entity
    end

    verification = Verification.active.find_by(value: token)

    unless verification&.identifier&.start_with?("email-verification:")
      return render json: { error: "Invalid or expired token" }, status: :unprocessable_entity
    end

    email = verification.identifier.delete_prefix("email-verification:")
    user = User.find_by(email: email)

    unless user
      return render json: { error: "User not found" }, status: :not_found
    end

    user.update!(email_verified: true)
    verification.destroy!

    render json: { message: "Email verified successfully" }
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
