class AdminLog < ApplicationRecord
  belongs_to :admin, class_name: "User"

  validates :action, presence: true

  scope :recent, -> { order(created_at: :desc) }
end
