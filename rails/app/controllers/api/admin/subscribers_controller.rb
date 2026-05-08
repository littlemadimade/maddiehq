module Api
  module Admin
    class SubscribersController < BaseController
      before_action -> { require_permission!("admin:crm") }

      # GET /api/admin/subscribers
      def index
        page = page_param
        limit = per_page_param(50)
        offset = (page - 1) * limit

        scope = NewsletterSubscriber.all

        if params[:search].present?
          scope = scope.where("email LIKE ?", "%#{params[:search]}%")
        end

        total = scope.count

        subscribers = scope.select(:id, :email, :status, :created_at)
                           .order(created_at: :desc)
                           .limit(limit)
                           .offset(offset)

        data = subscribers.map do |s|
          {
            id: s.id,
            email: s.email,
            status: s.status,
            created_at: s.created_at.iso8601
          }
        end

        render json: { data: data, total: total, page: page, limit: limit }
      end

      # DELETE /api/admin/subscribers/:id
      def destroy
        subscriber = NewsletterSubscriber.find_by(id: params[:id])
        return render json: { error: "Subscriber not found" }, status: :not_found unless subscriber

        email = subscriber.email
        subscriber.destroy!

        log_action(
          "subscriber_delete",
          target_type: "subscriber",
          target_id: email
        )

        render json: { data: { deleted: true } }
      end
    end
  end
end
