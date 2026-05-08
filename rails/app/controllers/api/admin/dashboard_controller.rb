module Api
  module Admin
    class DashboardController < BaseController
      # GET /api/admin/dashboard
      def show
        total_users = User.count
        new_users_today = User.where("created_at >= ?", Time.current.beginning_of_day).count
        new_users_week = User.where("created_at >= ?", 7.days.ago).count

        total_items = Item.count

        active_subscriptions = User.where(subscription_status: "active").count
        pro_price = 9.99
        revenue_estimate = active_subscriptions * pro_price

        recent_signups = User.order(created_at: :desc).limit(5).map do |u|
          {
            id: u.id,
            email: u.email,
            name: u.name,
            created_at: u.created_at.iso8601
          }
        end

        recent_admin_logs = AdminLog.includes(:admin)
                                    .order(created_at: :desc)
                                    .limit(10).map do |log|
          {
            id: log.id,
            admin_id: log.admin_id,
            admin_email: log.admin&.email,
            action: log.action,
            target_type: log.target_type,
            target_id: log.target_id,
            details: parse_details(log.details),
            created_at: log.created_at.iso8601
          }
        end

        render json: {
          data: {
            total_users: total_users,
            new_users_today: new_users_today,
            new_users_week: new_users_week,
            total_items: total_items,
            active_subscriptions: active_subscriptions,
            revenue_estimate: revenue_estimate,
            recent_signups: recent_signups,
            recent_admin_logs: recent_admin_logs
          }
        }
      end

      private

      def parse_details(details)
        return nil if details.blank?
        JSON.parse(details)
      rescue JSON::ParserError
        details
      end
    end
  end
end
