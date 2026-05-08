class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception, unless: -> { request.format.json? }

  helper_method :current_user, :user_signed_in?

  private

  def current_user
    @current_user ||= begin
      token = cookies.signed[:session_token] || request.headers["Authorization"]&.delete_prefix("Bearer ")
      return nil unless token
      session = Session.active.find_by(token: token)
      return nil unless session
      session.user
    end
  end

  def user_signed_in?
    current_user.present?
  end

  def authenticate_user!
    unless current_user
      respond_to do |format|
        format.json { render json: { error: "Not authenticated" }, status: :unauthorized }
        format.html { redirect_to "/auth" }
      end
    end
  end

  def require_admin!
    authenticate_user!
    return if performed?
    unless current_user&.admin?
      respond_to do |format|
        format.json { render json: { error: "Forbidden" }, status: :forbidden }
        format.html { redirect_to "/app" }
      end
    end
  end
end
