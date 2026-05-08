# Plan helper utilities.
#
# Usage:
#   PlanHelpers.paid_plan?(user)     # => true for pro or lifetime
#   PlanHelpers.lifetime?(user)      # => true for lifetime only

module PlanHelpers
  def self.paid_plan?(user)
    effective = user.effective_plan
    %w[pro lifetime].include?(effective)
  end

  def self.lifetime?(user)
    user.effective_plan == "lifetime"
  end
end
