module Api
  module Settings
    class BaseController < ApplicationController
      skip_before_action :verify_authenticity_token
      before_action :authenticate_user!

      private

      def current_user
        @current_user ||= begin
          token = cookies.signed[:session_token] || request.headers["Authorization"]&.delete_prefix("Bearer ")
          return nil unless token
          session = Session.active.find_by(token: token)
          session&.user
        end
      end

      def authenticate_user!
        unless current_user
          render json: { error: "Not authenticated" }, status: :unauthorized
        end
      end
    end
  end
end
