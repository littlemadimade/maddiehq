class Waitlist < ApplicationRecord
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :referral_code, presence: true, uniqueness: true

  scope :waiting, -> { where(status: "waiting") }
  scope :invited, -> { where(status: "invited") }

  before_validation :generate_referral_code, on: :create

  private

  def generate_referral_code
    self.referral_code ||= SecureRandom.alphanumeric(8).upcase
  end
end
