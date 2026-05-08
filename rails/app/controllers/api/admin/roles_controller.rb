require_relative "../../../../lib/rbac" unless defined?(Rbac)

module Api
  module Admin
    class RolesController < BaseController
      before_action -> { require_permission!("admin:roles") }

      def index
        roles = Role.all.order(:name)
        render json: {
          data: roles.map { |r| role_json(r) },
          permissions: Rbac::PERMISSION_GROUPS,
        }
      end

      def create
        id = SecureRandom.uuid
        role = Role.new(
          id: id,
          name: params[:name],
          description: params[:description],
          permissions: (params[:permissions] || []).to_json,
          is_system: false
        )

        if role.save
          log_action("role_create", target_type: "role", target_id: id, details: { name: role.name })
          render json: { data: role_json(role) }, status: :created
        else
          render json: { error: role.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      def update
        role = Role.find(params[:id])

        if role.is_system
          return render json: { error: "Cannot modify system roles" }, status: :forbidden
        end

        role.name = params[:name] if params[:name].present?
        role.description = params[:description] if params.key?(:description)
        role.permissions = params[:permissions].to_json if params[:permissions].present?

        if role.save
          log_action("role_update", target_type: "role", target_id: role.id)
          render json: { data: role_json(role) }
        else
          render json: { error: role.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      def destroy
        role = Role.find(params[:id])

        if role.is_system
          return render json: { error: "Cannot delete system roles" }, status: :forbidden
        end

        role.destroy!
        log_action("role_delete", target_type: "role", target_id: role.id, details: { name: role.name })
        render json: { data: { deleted: true } }
      end

      private

      def role_json(role)
        {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.parsed_permissions,
          isSystem: role.is_system,
          userCount: role.user_roles.count,
          createdAt: role.created_at,
          updatedAt: role.updated_at,
        }
      end
    end
  end
end
