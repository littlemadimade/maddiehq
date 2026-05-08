module EmailHelper
  def self.send_welcome(email)
    AppMailer.welcome_email(email).deliver_later
  rescue => e
    Rails.logger.error("[email] Welcome email failed: #{e.message}")
  end

  def self.send_verification(email, url)
    AppMailer.verification_email(email, url).deliver_later
  rescue => e
    Rails.logger.error("[email] Verification email failed: #{e.message}")
  end

  def self.send_password_reset(email, url)
    AppMailer.password_reset_email(email, url).deliver_later
  rescue => e
    Rails.logger.error("[email] Password reset email failed: #{e.message}")
  end

  def self.send_subscription_confirmation(email, plan)
    AppMailer.subscription_confirmation_email(email, plan).deliver_later
  rescue => e
    Rails.logger.error("[email] Subscription confirmation email failed: #{e.message}")
  end
end
