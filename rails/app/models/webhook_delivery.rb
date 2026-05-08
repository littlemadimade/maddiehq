class WebhookDelivery < ApplicationRecord
  belongs_to :webhook
  scope :recent, -> { order(created_at: :desc).limit(20) }
end
