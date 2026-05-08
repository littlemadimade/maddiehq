class Conversation < ApplicationRecord
  belongs_to :user
  has_many :chat_messages, dependent: :destroy

  before_create :set_id

  private

  def set_id
    self.id ||= SecureRandom.uuid
  end
end
