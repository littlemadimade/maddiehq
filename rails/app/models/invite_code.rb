class InviteCode < ApplicationRecord
  belongs_to :used_by, class_name: "User", optional: true
  belongs_to :created_by, class_name: "User"

  validates :code, presence: true, uniqueness: true

  scope :available, -> { where(used_by_id: nil).where("expires_at IS NULL OR expires_at > ?", Time.current) }

  before_validation :generate_code, on: :create

  def available?
    used_by_id.nil? && (expires_at.nil? || expires_at > Time.current)
  end

  def redeem!(user)
    update!(used_by: user, used_at: Time.current)
  end

  private

  def generate_code
    self.code ||= SecureRandom.alphanumeric(12).upcase
  end
end
