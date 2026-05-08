class ChatMessage < ApplicationRecord
  belongs_to :conversation

  before_create :set_id

  validates :role, inclusion: { in: %w[user assistant system] }

  private

  def set_id
    self.id ||= SecureRandom.uuid
  end
end
