class SyncStripeStatusJob
  def self.perform
    unless ENV['STRIPE_SECRET_KEY'].present?
      Rails.logger.info("[SyncStripeStatusJob] Skipped — STRIPE_SECRET_KEY not set")
      return 0
    end

    Stripe.api_key = ENV['STRIPE_SECRET_KEY']
    synced = 0

    User.where.not(stripe_customer_id: [nil, '']).find_each do |user|
      begin
        subscriptions = Stripe::Subscription.list(customer: user.stripe_customer_id, limit: 1)
        sub = subscriptions.data.first

        new_status = if sub.nil?
          'inactive'
        elsif sub.status == 'active'
          'active'
        elsif sub.status == 'past_due'
          'past_due'
        else
          'canceled'
        end

        if user.subscription_status != new_status
          user.update!(subscription_status: new_status)
          Rails.logger.info("[SyncStripeStatusJob] Updated #{user.email}: #{user.subscription_status_before_last_save} -> #{new_status}")
        end

        synced += 1
      rescue Stripe::StripeError => e
        Rails.logger.error("[SyncStripeStatusJob] Error for user #{user.id}: #{e.message}")
      end
    end

    Rails.logger.info("[SyncStripeStatusJob] Synced #{synced} user(s)")
    synced
  end
end
