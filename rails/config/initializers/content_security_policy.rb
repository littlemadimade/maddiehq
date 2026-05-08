# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy.
# See the Securing Rails Applications Guide for more information:
# https://guides.rubyonrails.org/security.html#content-security-policy-header

Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self
    policy.script_src  :self, :unsafe_inline, :unsafe_eval,
                       "https://cdn.tailwindcss.com",
                       "https://cdn.jsdelivr.net"
    policy.style_src   :self, :unsafe_inline,
                       "https://cdn.jsdelivr.net"
    policy.img_src     :self, :data, :blob, :https
    policy.font_src    :self, :data
    policy.connect_src :self,
                       "https://api.stripe.com",
                       "https://*.posthog.com",
                       "https://*.plausible.io"
    policy.frame_src   :self,
                       "https://js.stripe.com",
                       "https://hooks.stripe.com"
    policy.object_src  :none
    policy.base_uri    :self
    policy.form_action :self
  end

  # Report violations without enforcing the policy in development.
  config.content_security_policy_report_only = Rails.env.development?
end
