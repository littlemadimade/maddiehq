require_relative "../../lib/job_queue"
require_relative "../../lib/cron_scheduler"
require_relative "../../lib/webhook_service"

Rails.application.config.after_initialize do
  # Register job handlers
  JobQueue.register('cleanup_sessions') { CleanupSessionsJob.perform }
  JobQueue.register('cleanup_unverified') { CleanupUnverifiedJob.perform }
  JobQueue.register('sync_stripe_status') { SyncStripeStatusJob.perform }
  JobQueue.register('deliver_webhook') { |payload| DeliverWebhookJob.perform(payload) }

  # Start cron only if enabled
  if ENV['ENABLE_CRON'] == 'true'
    CronScheduler.register('cleanup_sessions', 24.hours.to_i) { JobQueue.enqueue('cleanup_sessions') }
    CronScheduler.register('cleanup_unverified', 24.hours.to_i) { JobQueue.enqueue('cleanup_unverified') }
    CronScheduler.register('sync_stripe_status', 1.hour.to_i) { JobQueue.enqueue('sync_stripe_status') }
    CronScheduler.start
  end
end
