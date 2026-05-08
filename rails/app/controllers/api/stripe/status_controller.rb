module Api
  module Stripe
    class StatusController < BaseController
      before_action :authenticate_user!

      def show
        render json: {
          plan: current_user.effective_plan || "free",
          status: current_user.subscription_status || "inactive"
        }
      end
    end
  end
end
