module Api
  module Admin
    class LogsController < BaseController
      before_action -> { require_permission!("admin:logs") }

      # GET /api/admin/logs
      def index
        page = page_param
        limit = per_page_param(25)
        offset = (page - 1) * limit

        scope = AdminLog.joins(:admin)

        scope = scope.where(action: params[:action]) if params[:action].present?
        scope = scope.where(admin_id: params[:admin_id]) if params[:admin_id].present?
        scope = scope.where(target_type: params[:target_type]) if params[:target_type].present?

        search_term = params[:search].presence || params[:q]
        if search_term.present?
          scope = scope.where("admin_logs.details LIKE ? OR admin_logs.action LIKE ?",
                              "%#{search_term}%", "%#{search_term}%")
        end

        from_date = params[:start_date].presence || params[:from]
        if from_date.present?
          scope = scope.where("admin_logs.created_at >= ?", from_date)
        end

        to_date = params[:end_date].presence || params[:to]
        if to_date.present?
          scope = scope.where("admin_logs.created_at <= ?", "#{to_date}T23:59:59")
        end

        total = scope.count

        logs = scope.select(
          "admin_logs.id, admin_logs.admin_id, users.email AS admin_email, " \
          "admin_logs.action, admin_logs.target_type, admin_logs.target_id, " \
          "admin_logs.details, admin_logs.created_at"
        ).order("admin_logs.created_at DESC").limit(limit).offset(offset)

        data = logs.map do |log|
          {
            id: log.id,
            admin_id: log.admin_id,
            admin_email: log.admin_email,
            action: log.action,
            target_type: log.target_type,
            target_id: log.target_id,
            details: parse_details(log.details),
            created_at: log.created_at.iso8601
          }
        end

        render json: {
          data: data,
          total: total,
          page: page,
          limit: limit,
          total_pages: (total.to_f / limit).ceil
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
