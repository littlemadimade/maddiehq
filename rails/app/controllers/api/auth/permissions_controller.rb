require_relative "../../../../lib/rbac" unless defined?(Rbac)

module Api
  module Auth
    class PermissionsController < BaseController
      before_action :authenticate_user!

      def show
        permissions = Rbac.user_permissions(current_user.id)
        roles = current_user.roles.map { |r| { id: r.id, name: r.name } }

        render json: {
          permissions: permissions,
          roles: roles,
          isAdmin: current_user.admin?,
        }
      end
    end
  end
end
