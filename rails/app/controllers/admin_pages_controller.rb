class AdminPagesController < ApplicationController
  before_action :require_admin!
  layout "admin"

  def dashboard; end
  def users; end
  def user_detail; end
  def analytics; end
  def logs; end
  def database; end
  def database_raw; end
  def crm; end
  def blog_editor; end
  def waitlist; end
  def roles; end

  private

  def current_user
    @current_user ||= begin
      token = cookies.signed[:session_token]
      return nil unless token
      session = Session.active.find_by(token: token)
      session&.user
    end
  end

  def require_admin!
    redirect_to "/auth" unless current_user
    return if performed?
    redirect_to "/app" unless current_user&.admin?
  end
end
