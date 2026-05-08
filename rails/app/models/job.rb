class Job < ApplicationRecord
  validates :job_type, presence: true
  validates :status, inclusion: { in: %w[pending running completed failed] }

  scope :pending, -> { where(status: 'pending').where('scheduled_at <= ?', Time.current) }
  scope :recent, -> { order(created_at: :desc).limit(50) }
end
