class CleanupSessionsJob
  def self.perform
    count = Session.where('expires_at < ?', Time.current).delete_all
    Rails.logger.info("[CleanupSessionsJob] Cleaned up #{count} expired session(s)")
    count
  end
end
