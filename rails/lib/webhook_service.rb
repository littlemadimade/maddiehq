require 'net/http'
require 'openssl'

module WebhookService
  def self.emit_event(user_id, event, payload)
    webhooks = Webhook.where(user_id: user_id, active: true)
    webhooks.each do |webhook|
      next unless webhook.subscribes_to?(event)

      delivery = WebhookDelivery.create!(
        webhook: webhook,
        event: event,
        payload: payload.to_json
      )

      JobQueue.enqueue('deliver_webhook', payload: {
        'delivery_id' => delivery.id,
        'webhook_id' => webhook.id
      })
    end
  end

  def self.deliver(delivery_id, webhook_id)
    delivery = WebhookDelivery.find(delivery_id)
    webhook = Webhook.find(webhook_id)

    body = {
      event: delivery.event,
      payload: JSON.parse(delivery.payload),
      timestamp: Time.current.to_i,
      webhook_id: webhook.id
    }.to_json

    signature = OpenSSL::HMAC.hexdigest('SHA256', webhook.secret, body)

    delivery.update!(attempts: delivery.attempts + 1)

    uri = URI(webhook.url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'
    http.open_timeout = 5
    http.read_timeout = 10

    req = Net::HTTP::Post.new(uri.path.presence || '/')
    req['Content-Type'] = 'application/json'
    req['X-Webhook-Signature'] = "sha256=#{signature}"
    req['X-Webhook-Event'] = delivery.event
    req['X-Webhook-Id'] = delivery.id
    req.body = body

    res = http.request(req)
    response_body = res.body.to_s[0..1000]

    delivery.update!(
      response_status: res.code.to_i,
      response_body: response_body,
      success: res.is_a?(Net::HTTPSuccess),
      completed_at: Time.current
    )

    raise "Webhook returned #{res.code}" unless res.is_a?(Net::HTTPSuccess)

    Rails.logger.info("[WebhookService] Delivered #{delivery.id} to #{webhook.url}: #{res.code}")
  rescue => e
    delivery&.update(last_error: e.message)
    Rails.logger.warn("[WebhookService] Failed #{delivery_id}: #{e.message}")
    raise
  end

  def self.send_test(user_id, webhook_id)
    webhook = Webhook.find_by!(id: webhook_id, user_id: user_id)

    delivery = WebhookDelivery.create!(
      webhook: webhook,
      event: 'test.ping',
      payload: { test: true }.to_json
    )

    deliver(delivery.id, webhook.id)
    delivery.reload
  end
end
