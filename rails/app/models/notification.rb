class Notification < ApplicationRecord
  belongs_to :user
  validates :title, presence: true
  validates :notification_type, inclusion: { in: %w[info success warning error] }

  scope :unread, -> { where(read: false) }
  scope :recent, -> { order(created_at: :desc).limit(50) }
end
