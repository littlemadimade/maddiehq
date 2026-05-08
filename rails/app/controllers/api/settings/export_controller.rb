module Api
  module Settings
    class ExportController < BaseController
      # GET /api/settings/export
      def show
        items = current_user.items.order(created_at: :asc).map do |item|
          { id: item.id, name: item.name, description: item.description, created_at: item.created_at.iso8601 }
        end

        export_data = {
          account: {
            email: current_user.email,
            emailVerified: current_user.email_verified,
            plan: current_user.plan || "free",
            createdAt: current_user.created_at.iso8601
          },
          items: items,
          exportedAt: Time.current.iso8601
        }

        send_data(
          JSON.pretty_generate(export_data),
          filename: "maddiehq-export-#{Date.today.iso8601}.json",
          type: "application/json",
          disposition: "attachment"
        )
      end
    end
  end
end
