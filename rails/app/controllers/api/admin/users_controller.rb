module Api
  module Admin
    class UsersController < BaseController
      before_action -> { require_permission!("admin:users") }

      # GET /api/admin/users
      def index
        page = page_param
        limit = per_page_param
        offset = (page - 1) * limit

        search = params[:search] || params[:q]
        plan_filter = params[:plan]
        status_filter = params[:status]

        scope = User.left_joins(:plan_override)

        if search.present?
          scope = scope.where("LOWER(users.email) LIKE ?", "%#{search.downcase}%")
        end

        if plan_filter.present? && plan_filter != "all"
          if plan_filter == "override"
            scope = scope.where("plan_overrides.plan IS NOT NULL AND (plan_overrides.expires_at IS NULL OR plan_overrides.expires_at > ?)", Time.current)
          else
            scope = scope.where(
              "(COALESCE(CASE WHEN plan_overrides.expires_at IS NULL OR plan_overrides.expires_at > ? THEN plan_overrides.plan END, users.plan)) = ?",
              Time.current, plan_filter
            )
          end
        end

        if status_filter == "disabled"
          scope = scope.where(disabled: true)
        elsif status_filter == "active"
          scope = scope.where(disabled: [false, nil])
        end

        total = scope.count
        users = scope.select(
          "users.id, users.email, users.name, users.plan, users.created_at, users.is_admin, " \
          "users.subscription_status, users.disabled, " \
          "plan_overrides.plan AS override_plan, plan_overrides.expires_at AS override_expires_at"
        ).order(created_at: :desc).limit(limit).offset(offset)

        data = users.map do |u|
          has_active_override = u.override_plan.present? &&
            (u.override_expires_at.nil? || u.override_expires_at > Time.current)
          {
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
            effective_plan: has_active_override ? u.override_plan : u.plan,
            has_override: has_active_override,
            created_at: u.created_at.iso8601,
            is_admin: u.is_admin,
            subscription_status: u.subscription_status,
            disabled: u.disabled || false
          }
        end

        render json: {
          data: data,
          total: total,
          page: page,
          limit: limit,
          pages: (total.to_f / limit).ceil
        }
      end

      # GET /api/admin/users/:id
      def show
        user = User.find_by(id: params[:id])
        return render json: { error: "User not found" }, status: :not_found unless user

        effective = AdminHelpers.effective_plan(user.id)
        override = user.plan_override

        plan_override_data = if override
          {
            plan: override.plan,
            reason: override.reason,
            expires_at: override.expires_at&.iso8601,
            created_at: override.created_at.iso8601,
            granted_by: override.granted_by,
            active: effective[:override]
          }
        end

        render json: {
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            effective_plan: effective[:plan],
            created_at: user.created_at.iso8601,
            is_admin: user.is_admin,
            subscription_status: user.subscription_status,
            stripe_customer_id: user.stripe_customer_id,
            stripe_subscription_id: user.stripe_subscription_id,
            email_verified: user.email_verified,
            disabled: user.disabled || false,
            plan_override: plan_override_data,
            items_count: user.items.count
          }
        }
      end

      # PATCH /api/admin/users/:id/status
      def status
        user = User.find_by(id: params[:id])
        return render json: { error: "User not found" }, status: :not_found unless user

        disabled = params[:disabled]
        unless [true, false].include?(disabled)
          return render json: { error: "disabled (boolean) is required" }, status: :bad_request
        end

        user.update!(disabled: disabled)

        log_action(
          disabled ? "user_disabled" : "user_enabled",
          target_type: "user",
          target_id: user.id
        )

        render json: { data: { success: true, disabled: disabled } }
      end

      # PATCH /api/admin/users/:id/email
      def email
        user = User.find_by(id: params[:id])
        return render json: { error: "User not found" }, status: :not_found unless user

        new_email = params[:email]
        unless new_email.present? && new_email.match?(URI::MailTo::EMAIL_REGEXP)
          return render json: { error: "Valid email is required" }, status: :bad_request
        end

        old_email = user.email
        user.update!(email: new_email)

        log_action(
          "user_email_changed",
          target_type: "user",
          target_id: user.id,
          details: { old_email: old_email, new_email: new_email }
        )

        render json: { data: { success: true, email: new_email } }
      rescue ActiveRecord::RecordNotUnique
        render json: { error: "Email already in use" }, status: :conflict
      end

      # POST /api/admin/users/:id/reset-pw
      def reset_password
        user = User.find_by(id: params[:id])
        return render json: { error: "User not found" }, status: :not_found unless user

        token = SecureRandom.hex(32)
        expires_at = 1.hour.from_now

        Verification.create!(
          id: SecureRandom.hex(16),
          identifier: "reset-password:#{user.email}",
          value: token,
          expires_at: expires_at
        )

        log_action(
          "password_reset_sent",
          target_type: "user",
          target_id: user.id
        )

        render json: { data: { success: true } }
      end

      # POST /api/admin/users/:id/plan
      def plan
        user = User.find_by(id: params[:id])
        return render json: { error: "User not found" }, status: :not_found unless user

        plan_name = params[:plan]
        reason = params[:reason]
        expires_at = params[:expires_at]

        unless plan_name.present?
          return render json: { error: "plan is required" }, status: :bad_request
        end
        unless reason.present?
          return render json: { error: "reason is required" }, status: :bad_request
        end

        override = PlanOverride.find_or_initialize_by(user_id: user.id)
        override.assign_attributes(
          plan: plan_name,
          reason: reason,
          granted_by: current_user.id,
          expires_at: expires_at.present? ? Time.parse(expires_at) : nil
        )
        override.save!

        log_action(
          "plan_override",
          target_type: "user",
          target_id: user.id,
          details: { plan: plan_name, reason: reason, expires_at: expires_at }
        )

        render json: { data: { success: true, plan: plan_name, reason: reason, expires_at: expires_at } }
      end
    end
  end
end
