# Use Resend for email delivery when API key is present
# Falls back to :test in test, :smtp/:sendmail in dev, :log if nothing configured

if ENV["RESEND_API_KEY"].present?
  # Resend uses their own API, configure via resend gem
  Rails.application.config.action_mailer.delivery_method = :resend
elsif Rails.env.development?
  Rails.application.config.action_mailer.delivery_method = :letter_opener if defined?(LetterOpener)
  Rails.application.config.action_mailer.delivery_method ||= :log
elsif Rails.env.test?
  Rails.application.config.action_mailer.delivery_method = :test
end

Rails.application.config.action_mailer.default_url_options = {
  host: ENV.fetch("APP_URL", "http://localhost:3014").gsub(%r{https?://}, ""),
  protocol: ENV.fetch("APP_URL", "http://localhost:3014").start_with?("https") ? "https" : "http"
}
