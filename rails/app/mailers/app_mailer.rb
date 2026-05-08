class AppMailer < ApplicationMailer
  APP_NAME = ENV.fetch("APP_NAME", "MaddieHQ")
  FROM = "#{APP_NAME} <noreply@#{ENV.fetch('MAIL_DOMAIN', 'YOUR_DOMAIN')}>"
  APP_URL = ENV.fetch("APP_URL", "https://YOUR_DOMAIN")

  default from: FROM

  def welcome_email(email)
    @app_name = APP_NAME
    @app_url = APP_URL
    @cta_url = "#{APP_URL}/app"
    @cta_label = "Get started"
    @heading = "Welcome to #{APP_NAME} \u{1f44b}"
    @body_text = "Thanks for signing up. Your account is ready."

    mail(to: email, subject: "Welcome to #{APP_NAME} \u{1f44b}") do |format|
      format.html { render inline: email_template }
    end
  end

  def verification_email(email, url)
    @app_name = APP_NAME
    @app_url = APP_URL
    @cta_url = url
    @cta_label = "Verify Email"
    @heading = "Verify your email address"
    @body_text = "Click below to verify your email and activate your #{APP_NAME} account."
    @small_text = 'This link expires in <strong>24 hours</strong>. If you didn\'t create an account, ignore this email.'

    mail(to: email, subject: "Verify your email \u2014 #{APP_NAME}") do |format|
      format.html { render inline: email_template }
    end
  end

  def password_reset_email(email, url)
    @app_name = APP_NAME
    @app_url = APP_URL
    @cta_url = url
    @cta_label = "Reset Password"
    @heading = "Reset your password"
    @body_text = "We received a request to reset the password for your #{APP_NAME} account."
    @small_text = 'This link expires in <strong>1 hour</strong>. If you didn\'t request this, ignore this email.'

    mail(to: email, subject: "Reset your password \u2014 #{APP_NAME}") do |format|
      format.html { render inline: email_template }
    end
  end

  def subscription_confirmation_email(email, plan)
    @app_name = APP_NAME
    @app_url = APP_URL
    @cta_url = "#{APP_URL}/app"
    @cta_label = "Go to app"
    @heading = "You're on Pro \u{1f389}"
    @body_text = "Your <strong>#{plan}</strong> subscription is now active. Enjoy full access to all #{APP_NAME} features."

    mail(to: email, subject: "You're on Pro \u{1f389} \u2014 #{APP_NAME}") do |format|
      format.html { render inline: email_template }
    end
  end

  def lifetime_purchase_email(email)
    @app_name = APP_NAME
    @app_url = APP_URL
    @cta_url = "#{APP_URL}/app"
    @cta_label = "Go to app"
    @heading = "You're a lifetime member! \u{1f389}"
    @body_text = "Thank you for purchasing a <strong>Lifetime Deal</strong>. You now have permanent access to all #{APP_NAME} Pro features \u2014 no recurring payments, no expiry."
    @small_text = "This is a one-time purchase. You will not be billed again."

    mail(to: email, subject: "You're a lifetime member! \u{1f389} \u2014 #{APP_NAME}") do |format|
      format.html { render inline: email_template }
    end
  end

  def waitlist_invite_email(email, invite_code)
    signup_url = "#{APP_URL}/auth?tab=signup&invite=#{CGI.escape(invite_code)}"
    @app_name = APP_NAME
    @app_url = APP_URL
    @cta_url = signup_url
    @cta_label = "Accept Invite"
    @heading = "You're invited!"
    @body_text = "Great news \u2014 you've been selected for early access to #{APP_NAME}. Use the link below to create your account."
    @small_text = "Your invite code: <strong>#{invite_code}</strong><br />This invite is single-use. If you didn't sign up for #{APP_NAME}, you can safely ignore this email."

    mail(to: email, subject: "You're invited to #{APP_NAME}!") do |format|
      format.html { render inline: email_template }
    end
  end

  private

  def email_template
    <<~HTML
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title><%= @app_name %></title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:#10b981;padding:28px 40px;text-align:left;">
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;"><%= @app_name %></span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.5px;"><%= @heading %></h1>
                    <p style="margin:0 0 12px;font-size:15px;color:#4b5563;line-height:1.7;"><%= @body_text.html_safe %></p>
                    <% if @cta_url.present? %>
                      <a href="<%= @cta_url %>" style="display:inline-block;margin-top:24px;padding:14px 28px;background:#10b981;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;"><%= @cta_label %></a>
                    <% end %>
                    <% if @small_text.present? %>
                      <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;"><%= @small_text.html_safe %></p>
                    <% end %>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                      You received this email because you have an account with <%= @app_name %>.<br />
                      &copy; <%= Date.today.year %> <%= @app_name %> · <a href="<%= @app_url %>" style="color:#10b981;text-decoration:none;"><%= @app_url %></a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    HTML
  end
end
