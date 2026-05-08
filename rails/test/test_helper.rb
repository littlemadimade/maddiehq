ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  parallelize(workers: :number_of_processors)

  # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
  fixtures :all

  # Sign in a user for controller tests by creating an active session
  # and setting the session token cookie.
  def sign_in(user)
    session = Session.create!(
      user: user,
      expires_at: 7.days.from_now,
      ip_address: "127.0.0.1",
      user_agent: "Minitest"
    )
    if respond_to?(:cookies)
      cookies.signed[:session_token] = session.token
    end
    session
  end

  # Create a user with a credential account (email/password).
  def create_user(attrs = {})
    password = attrs.delete(:password) || "password123"
    email = attrs[:email] || "user_#{SecureRandom.hex(4)}@example.com"

    user = User.create!(
      {
        email: email,
        name: attrs[:name] || "Test User",
        email_verified: false,
        plan: "free",
        subscription_status: "inactive",
        is_admin: false,
        disabled: false
      }.merge(attrs)
    )

    Account.create!(
      user: user,
      provider_id: "credential",
      account_id: email,
      password: BCrypt::Password.create(password)
    )

    user
  end

  # Create an admin user with a credential account.
  def create_admin(attrs = {})
    create_user({ is_admin: true, name: "Admin User" }.merge(attrs))
  end
end
