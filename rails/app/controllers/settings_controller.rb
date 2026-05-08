class SettingsController < ApplicationController
  before_action :authenticate_user!

  # GET /settings
  def show
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

  def authenticate_user!
    redirect_to "/auth" unless current_user
  end
end
