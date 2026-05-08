class DeliverWebhookJob
  def self.perform(payload)
    delivery_id = payload['delivery_id']
    webhook_id = payload['webhook_id']

    raise "Missing delivery_id or webhook_id" unless delivery_id && webhook_id

    WebhookService.deliver(delivery_id, webhook_id)
  end
end
