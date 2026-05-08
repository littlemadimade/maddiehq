class PlanOverride < ApplicationRecord
  belongs_to :user
  belongs_to :granter, class_name: "User", foreign_key: :granted_by

  validates :plan, presence: true, inclusion: { in: %w[free pro enterprise] }
  validates :user_id, uniqueness: true

  def expired?
    expires_at.present? && expires_at < Time.current
  end
end
