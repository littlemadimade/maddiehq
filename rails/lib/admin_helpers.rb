module AdminHelpers
  def self.log_action(admin_id:, action:, target_type: nil, target_id: nil, details: nil)
    AdminLog.create!(
      admin_id: admin_id,
      action: action,
      target_type: target_type,
      target_id: target_id,
      details: details.is_a?(Hash) ? details.to_json : details
    )
  end

  def self.effective_plan(user_id)
    user = User.find_by(id: user_id)
    return { plan: "free", override: false, expires_at: nil } unless user

    override = PlanOverride.find_by(user_id: user_id)
    if override && !override.expired?
      { plan: override.plan, override: true, expires_at: override.expires_at&.iso8601 }
    else
      { plan: user.plan || "free", override: false, expires_at: nil }
    end
  end
end
