class Verification < ApplicationRecord
  validates :identifier, presence: true
  validates :value, presence: true
  validates :expires_at, presence: true

  scope :active, -> { where("expires_at > ?", Time.current) }

  def expired?
    expires_at < Time.current
  end
end
