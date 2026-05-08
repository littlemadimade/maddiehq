class NewsletterSubscriber < ApplicationRecord
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :status, inclusion: { in: %w[active unsubscribed] }, allow_nil: true

  scope :active, -> { where(status: "active") }
end
