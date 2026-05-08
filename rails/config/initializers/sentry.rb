# Sentry error monitoring — free tier: 5K errors/month
# Set SENTRY_DSN to enable. Without it, Sentry is completely disabled.

if ENV["SENTRY_DSN"].present?
  Sentry.init do |config|
    config.dsn = ENV["SENTRY_DSN"]
    config.environment = Rails.env
    config.breadcrumbs_logger = [:active_support_logger, :http_logger]

    # Performance monitoring — sample 10% in production
    config.traces_sample_rate = Rails.env.production? ? 0.1 : 1.0

    # Filter sensitive params from reports
    config.send_default_pii = false
  end
end
