require_relative "../../../../lib/admin_helpers" unless defined?(AdminHelpers)

module Api
  module Admin
    class BaseController < ApplicationController
      skip_before_action :verify_authenticity_token
      before_action :require_admin!

      private

      def current_user
        @current_user ||= begin
          token = cookies.signed[:session_token] || request.headers["Authorization"]&.delete_prefix("Bearer ")
          return nil unless token

          session = Session.active.find_by(token: token)
          session&.user
        end
      end

      def require_admin!
        unless current_user
          return render json: { error: "Not authenticated" }, status: :unauthorized
        end
        # Check RBAC or superadmin flag
        unless current_user.admin? || Rbac.user_permissions(current_user.id).any?
          render json: { error: "Forbidden" }, status: :forbidden
        end
      end

      def require_permission!(permission)
        unless Rbac.has_permission?(current_user.id, permission)
          render json: { error: "Forbidden" }, status: :forbidden
        end
      end

      def log_action(action, target_type: nil, target_id: nil, details: nil)
        AdminHelpers.log_action(
          admin_id: current_user.id,
          action: action,
          target_type: target_type,
          target_id: target_id,
          details: details
        )
      end

      def page_param
        [(params[:page] || 1).to_i, 1].max
      end

      def per_page_param(default = 20)
        [[1, (params[:per_page] || params[:limit] || default).to_i].max, 100].min
      end
    end
  end
end
