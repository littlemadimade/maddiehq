class CleanupUnverifiedJob
  def self.perform
    users = User.where(email_verified: false).where('created_at < ?', 7.days.ago)
    count = users.count
    users.destroy_all
    Rails.logger.info("[CleanupUnverifiedJob] Cleaned up #{count} unverified user(s)")
    count
  end
end
