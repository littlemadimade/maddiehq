require_relative "../../../lib/chat_engine"

module Api
  class ChatController < BaseController
    before_action :authenticate_user!

    # POST /api/chat
    # Streams AI response via SSE
    def create
      messages = params[:messages]&.map { |m| { role: m[:role], content: m[:content] } }

      unless messages.is_a?(Array) && messages.any?
        return render json: { error: "Messages array is required" }, status: :bad_request
      end

      response.headers["Content-Type"] = "text/event-stream"
      response.headers["Cache-Control"] = "no-cache"
      response.headers["Connection"] = "keep-alive"

      begin
        ChatEngine.stream(
          messages: messages,
          user_id: current_user.id,
          user_context: params[:user_context] || ""
        ) do |event|
          response.stream.write("data: #{event.to_json}\n\n")
        end
      rescue => e
        Rails.logger.error "[chat] Stream error: #{e.message}"
        response.stream.write("data: #{{ error: 'Something went wrong' }.to_json}\n\n")
      ensure
        response.stream.close
      end
    end
  end
end
