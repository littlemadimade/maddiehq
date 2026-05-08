module Api
  class SubscribeController < BaseController
    # POST /api/subscribe
    def create
      email = params[:email]&.strip&.downcase

      if email.blank? || !email.match?(/\A[^\s@]+@[^\s@]+\.[^\s@]+\z/)
        raise Errors::BadRequestError, "A valid email address is required"
      end

      begin
        NewsletterSubscriber.create!(email: email, status: "active")
      rescue ActiveRecord::RecordNotUnique
        # Already subscribed -- treat as success
      end

      render json: { data: { subscribed: true } }, status: :created
    end
  end
end
