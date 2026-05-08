# Resend email service configuration
RESEND_API_KEY = ENV["RESEND_API_KEY"]

if RESEND_API_KEY.present?
  Resend.api_key = RESEND_API_KEY
end
