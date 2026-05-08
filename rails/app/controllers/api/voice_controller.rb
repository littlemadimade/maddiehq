module Api
  class VoiceController < BaseController
    before_action :authenticate_user!

    # POST /api/voice/speak
    def speak
      api_key = ENV["ELEVENLABS_API_KEY"]
      voice_id = ENV.fetch("ELEVENLABS_VOICE_ID", "cgSgspJ2msm6clMCkdW9")

      unless api_key.present?
        return render json: { error: "Voice services not configured" }, status: :service_unavailable
      end

      text = params[:text]
      unless text.present?
        return render json: { error: "No text provided" }, status: :bad_request
      end

      uri = URI("https://api.elevenlabs.io/v1/text-to-speech/#{voice_id}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true

      request = Net::HTTP::Post.new(uri.path)
      request["xi-api-key"] = api_key
      request["Content-Type"] = "application/json"
      request.body = {
        text: text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }.to_json

      response = http.request(request)

      unless response.is_a?(Net::HTTPSuccess)
        Rails.logger.error "[voice] ElevenLabs error: #{response.code}"
        return render json: { error: "TTS failed" }, status: :bad_gateway
      end

      content_type = response["content-type"] || ""
      unless content_type.include?("audio")
        return render json: { error: "TTS returned invalid audio" }, status: :bad_gateway
      end

      send_data response.body,
        type: "audio/mpeg",
        disposition: "inline"
    end
  end
end
