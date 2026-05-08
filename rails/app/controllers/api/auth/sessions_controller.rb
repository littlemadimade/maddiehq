class Api::Auth::SessionsController < ApplicationController
  skip_before_action :verify_authenticity_token
  wrap_parameters false
  before_action :rate_limit!, only: [:create]
  before_action :authenticate_user!, only: [:destroy]

  def create
    email = params[:email]&.strip&.downcase
    password = params[:password]

    if email.blank? || password.blank?
      return render json: { error: "Email and password are required" }, status: :unprocessable_entity
    end

    user = User.find_by(email: email)

    unless user&.authenticate(password)
      return render json: { error: "Invalid email or password" }, status: :unauthorized
    end

    if user.disabled?
      return render json: { error: "Account is disabled" }, status: :forbidden
    end

    # Check if 2FA is enabled
    if user.two_factor_enabled?
      temp_token = SecureRandom.hex(32)
      Verification.create!(
        identifier: "2fa-temp:#{temp_token}",
        value: user.id,
        expires_at: 5.minutes.from_now
      )

      return render json: { twoFactorRequired: true, tempToken: temp_token }
    end

    create_session_for(user)
  end

  def show
    if current_user
      render json: {
        user: {
          id: current_user.id,
          email: current_user.email,
          name: current_user.name,
          image: current_user.image,
          emailVerified: current_user.email_verified,
          twoFactorEnabled: current_user.two_factor_enabled,
          plan: current_user.plan,
          subscriptionStatus: current_user.subscription_status,
          isAdmin: current_user.is_admin
        }
      }
    else
      render json: { user: nil }
    end
  end

  def destroy
    token = cookies.signed[:session_token] || request.headers["Authorization"]&.delete_prefix("Bearer ")
    session = Session.find_by(token: token) if token
    session&.destroy!

    cookies.delete(:session_token)

    render json: { message: "Logged out successfully" }
  end

  private

  def create_session_for(user)
    session = Session.create!(
      user: user,
      expires_at: 7.days.from_now,
      ip_address: request.remote_ip,
      user_agent: request.user_agent
    )

    cookies.signed[:session_token] = {
      value: session.token,
      expires: session.expires_at,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax
    }

    render json: {
      user: { id: user.id, email: user.email, name: user.name },
      session: { token: session.token, expires_at: session.expires_at },
      authenticated: true
    }
  end

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
