require_relative "../../../lib/analytics" unless defined?(Analytics)

module Api
  class AnalyticsController < BaseController
    # POST /api/analytics/track
    #
    # Server-side proxy for client analytics events.
    # Keeps API keys off the client and attaches user_id from session.
    def track
      event = params[:event]
      properties = params[:properties]&.to_unsafe_h || {}

      unless event.present?
        return render json: { error: "event is required" }, status: :bad_request
      end

      Analytics.track(event, properties, user_id: current_user&.id)

      render json: { ok: true }
    rescue => e
      # Never fail on analytics
      Rails.logger.warn("[analytics] track error: #{e.message}")
      render json: { ok: true }
    end
  end
end
