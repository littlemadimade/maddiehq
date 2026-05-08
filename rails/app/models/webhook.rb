class Webhook < ApplicationRecord
  belongs_to :user
  has_many :webhook_deliveries, dependent: :destroy
  validates :url, presence: true
  validates :secret, presence: true

  before_validation :generate_secret, on: :create

  scope :active, -> { where(active: true) }

  def parsed_events
    JSON.parse(events || '[]')
  rescue JSON::ParserError
    []
  end

  def subscribes_to?(event)
    evts = parsed_events
    evts.empty? || evts.include?(event) || evts.include?('*')
  end

  private

  def generate_secret
    self.secret ||= SecureRandom.hex(32)
  end
end
