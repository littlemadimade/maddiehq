module Api
  module Stripe
    class WebhooksController < BaseController
      def create
        unless stripe_configured?
          return render json: { error: "Stripe is not configured" }, status: :service_unavailable
        end

        payload = request.raw_post
        sig_header = request.headers["Stripe-Signature"]

        begin
          event = ::Stripe::Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        rescue JSON::ParserError
          return render json: { error: "Invalid payload" }, status: :bad_request
        rescue ::Stripe::SignatureVerificationError
          return render json: { error: "Invalid signature" }, status: :bad_request
        end

        case event.type
        when "checkout.session.completed"
          handle_checkout_completed(event.data.object)
        when "customer.subscription.updated"
          handle_subscription_updated(event.data.object)
        when "customer.subscription.deleted"
          handle_subscription_deleted(event.data.object)
        when "invoice.payment_failed"
          handle_payment_failed(event.data.object)
        end

        render json: { received: true }
      end

      private

      def handle_checkout_completed(session)
        customer_id = session.customer

        user = User.find_by(stripe_customer_id: customer_id)
        return unless user

        if session.mode == "payment"
          # Lifetime one-time payment
          user.update!(plan: "lifetime", subscription_status: "active")

          # Send confirmation email
          AppMailer.lifetime_purchase_email(user.email).deliver_later if user.email.present?
        else
          # Subscription checkout
          subscription_id = session.subscription
          user.update!(
            plan: "pro",
            subscription_status: "active",
            stripe_subscription_id: subscription_id
          )

          # Send subscription confirmation email (fire-and-forget)
          EmailHelper.send_subscription_confirmation(user.email, "pro") if user.email.present?
        end
      end

      def handle_subscription_updated(subscription)
        customer_id = subscription.customer

        user = User.find_by(stripe_customer_id: customer_id)
        return unless user

        user.update!(subscription_status: subscription.status)
      end

      def handle_subscription_deleted(subscription)
        customer_id = subscription.customer

        user = User.find_by(stripe_customer_id: customer_id)
        return unless user

        # Guard: never downgrade lifetime users
        return if user.plan == "lifetime"

        user.update!(
          plan: "free",
          subscription_status: "inactive",
          stripe_subscription_id: nil
        )
      end

      def handle_payment_failed(invoice)
        customer_id = invoice.customer

        user = User.find_by(stripe_customer_id: customer_id)
        return unless user

        user.update!(subscription_status: "past_due")
      end
    end
  end
end
