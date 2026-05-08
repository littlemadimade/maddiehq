require_relative "../../../lib/realtime" unless defined?(Realtime)

module Api
  class RealtimeController < BaseController
    include ActionController::Live

    def show
      authenticate_user!

      channel = params[:channel]

      # Only allow users to subscribe to their own notification channel
      allowed_channel = "notifications:#{current_user.id}"
      unless channel == allowed_channel
        return render json: { error: "Forbidden" }, status: :forbidden
      end

      response.headers["Content-Type"] = "text/event-stream"
      response.headers["Cache-Control"] = "no-cache"
      response.headers["Connection"] = "keep-alive"
      response.headers["X-Accel-Buffering"] = "no" # Disable nginx buffering

      stream = response.stream

      Realtime.add_subscriber(channel, stream)

      # Send initial ping
      stream.write("data: {\"type\":\"connected\"}\n\n")

      # Keep connection alive with periodic pings
      loop do
        sleep 30
        stream.write(": ping\n\n")
      end
    rescue ActionController::Live::ClientDisconnected, IOError
      # Client disconnected — clean up
    ensure
      Realtime.remove_subscriber(channel, stream) if stream
      stream&.close
    end
  end
end
