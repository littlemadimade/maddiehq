class AuthController < ApplicationController
  # GET /auth
  def show
    redirect_to "/app" if current_user
  end

  # GET /forgot-password
  def forgot_password
  end

  # GET /reset-password
  def reset_password
  end

  # GET /verify-email
  def verify_email
  end

  private

  def current_user
    @current_user ||= begin
      token = cookies.signed[:session_token]
      return nil unless token
      session = Session.active.find_by(token: token)
      session&.user
    end
  end
end
