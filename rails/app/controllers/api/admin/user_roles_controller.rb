module Api
  module Admin
    class UserRolesController < BaseController
      before_action -> { require_permission!("admin:roles") }

      def update
        user = User.find(params[:user_id])
        role = Role.find(params[:role_id])

        assignment = UserRole.find_or_initialize_by(user: user, role: role)
        assignment.assigned_by = current_user.id

        if assignment.save
          log_action("role_assign", target_type: "user", target_id: user.id,
                     details: { role: role.name })
          render json: { data: { success: true } }
        else
          render json: { error: assignment.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      def destroy
        user = User.find(params[:user_id])
        role = Role.find(params[:role_id])

        assignment = UserRole.find_by!(user: user, role: role)
        assignment.destroy!

        log_action("role_unassign", target_type: "user", target_id: user.id,
                   details: { role: role.name })
        render json: { data: { success: true } }
      end
    end
  end
end
