module Api
  class WebhooksController < BaseController
    before_action :authenticate_user!
    before_action :set_webhook, only: [:show, :update, :destroy, :test, :deliveries]

    def index
      webhooks = current_user.webhooks.order(created_at: :desc)
      # Strip secrets from response
      safe = webhooks.map { |w| w.attributes.except('secret') }
      render json: { webhooks: safe }
    end

    def show
      render json: { webhook: @webhook.attributes.except('secret') }
    end

    def create
      url = params[:url]&.strip
      raise Errors::BadRequestError, "URL is required" if url.blank?

      begin
        uri = URI.parse(url)
        raise unless uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS)
      rescue
        raise Errors::BadRequestError, "Invalid URL"
      end

      validate_webhook_url!(url)

      events = params[:events].is_a?(Array) ? params[:events] : []

      webhook = current_user.webhooks.create!(
        url: url,
        events: events.to_json
      )

      render json: { webhook: webhook }, status: :created
    end

    def update
      updates = {}
      if params[:url].present?
        validate_webhook_url!(params[:url])
        updates[:url] = params[:url]
      end
      updates[:events] = params[:events].to_json if params.key?(:events)
      updates[:active] = params[:active] if params.key?(:active)

      @webhook.update!(updates) if updates.any?
      render json: { webhook: @webhook.attributes.except('secret') }
    end

    def destroy
      @webhook.destroy!
      render json: { ok: true }
    end

    def test
      delivery = WebhookService.send_test(current_user.id, @webhook.id)
      render json: { delivery: delivery }
    rescue => e
      render json: { delivery: nil, error: e.message }
    end

    def deliveries
      limit = (params[:limit] || 20).to_i
      deliveries = @webhook.webhook_deliveries.recent.limit(limit)
      render json: { deliveries: deliveries }
    end

    private

    def validate_webhook_url!(url)
      unless url.start_with?('https://') || (!Rails.env.production? && url.start_with?('http://localhost'))
        raise Errors::BadRequestError, "Webhook URL must use HTTPS"
      end

      if Rails.env.production?
        host = URI.parse(url).host.to_s
        blocked = host.match?(/\A(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|localhost|::1|metadata\.google\.internal|metadata\.internal)/i)
        raise Errors::BadRequestError, "Webhook URL cannot target internal addresses" if blocked
      end
    end

    def set_webhook
      @webhook = current_user.webhooks.find(params[:id])
    end
  end
end
