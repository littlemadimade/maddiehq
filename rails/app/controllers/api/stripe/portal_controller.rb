module Api
  module Stripe
    class PortalController < BaseController
      before_action :authenticate_user!

      def show
        unless stripe_configured?
          return render json: { error: "Stripe is not configured" }, status: :service_unavailable
        end

        unless current_user.stripe_customer_id
          return render json: { error: "No Stripe customer found" }, status: :bad_request
        end

        app_url = ENV.fetch("APP_URL", "http://localhost:3014")

        portal_session = ::Stripe::BillingPortal::Session.create(
          customer: current_user.stripe_customer_id,
          return_url: "#{app_url}/settings"
        )

        render json: { url: portal_session.url }
      rescue ::Stripe::StripeError => e
        render json: { error: e.message }, status: :bad_request
      rescue => e
        render json: { error: e.message }, status: :internal_server_error
      end
    end
  end
end
