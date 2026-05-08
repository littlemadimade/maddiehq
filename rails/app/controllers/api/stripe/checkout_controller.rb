module Api
  module Stripe
    class CheckoutController < BaseController
      before_action :authenticate_user!

      def create
        unless stripe_configured?
          return render json: { error: "Stripe is not configured" }, status: :service_unavailable
        end

        # Get or create Stripe customer
        customer_id = current_user.stripe_customer_id

        unless customer_id
          customer = ::Stripe::Customer.create(
            email: current_user.email,
            name: current_user.name,
            metadata: { user_id: current_user.id }
          )
          current_user.update!(stripe_customer_id: customer.id)
          customer_id = customer.id
        end

        # Create checkout session
        app_url = ENV.fetch("APP_URL", "http://localhost:3014")

        checkout_session = ::Stripe::Checkout::Session.create(
          customer: customer_id,
          mode: "subscription",
          line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
          success_url: "#{app_url}/settings?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "#{app_url}/settings"
        )

        render json: { url: checkout_session.url }
      rescue ::Stripe::StripeError => e
        render json: { error: e.message }, status: :bad_request
      rescue => e
        render json: { error: e.message }, status: :internal_server_error
      end
    end
  end
end
