class Api::Auth::TwoFactorController < ApplicationController
  skip_before_action :verify_authenticity_token
  wrap_parameters false
  before_action :authenticate_user!, only: [:enable, :disable, :verify_setup]
  before_action :rate_limit!

  def enable
    password = params[:password]

    if password.blank?
      return render json: { error: "Password is required" }, status: :unprocessable_entity
    end

    unless current_user.authenticate(password)
      return render json: { error: "Invalid password" }, status: :unauthorized
    end

    if current_user.two_factor_enabled?
      return render json: { error: "Two-factor authentication is already enabled" }, status: :conflict
    end

    totp_secret = ROTP::Base32.random
    totp = ROTP::TOTP.new(totp_secret, issuer: ENV.fetch("APP_NAME", "MaddieHQ"))
    provisioning_uri = totp.provisioning_uri(current_user.email)

    backup_codes = 10.times.map { SecureRandom.hex(4) }

    # Create or update the TwoFactor record
    two_factor = current_user.two_factor || current_user.build_two_factor
    two_factor.assign_attributes(
      secret: totp_secret,
      backup_codes: backup_codes.to_json
    )
    two_factor.save!

    current_user.update!(two_factor_enabled: true)

    render json: {
      secret: totp_secret,
      uri: provisioning_uri,
      qrCode: generate_qr_svg(provisioning_uri),
      backupCodes: backup_codes
    }
  end

  def verify_setup
    code = params[:code]

    if code.blank?
      return render json: { error: "Code is required" }, status: :unprocessable_entity
    end

    two_factor = current_user.two_factor
    unless two_factor
      return render json: { error: "Two-factor authentication is not set up" }, status: :unprocessable_entity
    end

    totp = ROTP::TOTP.new(two_factor.secret)
    unless totp.verify(code, drift_behind: 30, drift_ahead: 30)
      return render json: { error: "Invalid verification code" }, status: :unauthorized
    end

    render json: { message: "Two-factor authentication verified and enabled" }
  end

  def verify
    code = params[:code]
    temp_token = params[:tempToken]

    if code.blank? || temp_token.blank?
      return render json: { error: "Code and temp token are required" }, status: :unprocessable_entity
    end

    verification = Verification.active.find_by(identifier: "2fa-temp:#{temp_token}")

    unless verification
      return render json: { error: "Invalid or expired temp token" }, status: :unauthorized
    end

    user = User.find_by(id: verification.value)

    unless user
      return render json: { error: "User not found" }, status: :not_found
    end

    two_factor = user.two_factor
    unless two_factor
      return render json: { error: "Two-factor authentication is not set up" }, status: :unprocessable_entity
    end

    totp = ROTP::TOTP.new(two_factor.secret)
    valid_code = totp.verify(code, drift_behind: 30, drift_ahead: 30)

    # Also check backup codes if TOTP didn't match
    unless valid_code
      backup_codes = JSON.parse(two_factor.backup_codes)
      if backup_codes.include?(code)
        backup_codes.delete(code)
        two_factor.update!(backup_codes: backup_codes.to_json)
        valid_code = true
      end
    end

    unless valid_code
      return render json: { error: "Invalid verification code" }, status: :unauthorized
    end

    verification.destroy!

    # Create a session now that 2FA is verified
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
      authenticated: true
    }
  end

  def disable
    password = params[:password]

    if password.blank?
      return render json: { error: "Password is required" }, status: :unprocessable_entity
    end

    unless current_user.authenticate(password)
      return render json: { error: "Invalid password" }, status: :unauthorized
    end

    unless current_user.two_factor_enabled?
      return render json: { error: "Two-factor authentication is not enabled" }, status: :conflict
    end

    current_user.two_factor&.destroy!
    current_user.update!(two_factor_enabled: false)

    render json: { message: "Two-factor authentication disabled" }
  end

  private

  def generate_qr_svg(uri)
    qrcode = RQRCode::QRCode.new(uri)
    qrcode.as_svg(
      color: "000",
      shape_rendering: "crispEdges",
      module_size: 4,
      standalone: true,
      use_path: true
    )
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
