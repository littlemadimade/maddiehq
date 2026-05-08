# Seed default admin user on every boot (idempotent).
# Runs after ActiveRecord is initialized so models are available.
Rails.application.config.after_initialize do
  # Only seed default admin in development — never in production.
  next if Rails.env.production?
  next unless ActiveRecord::Base.connection.table_exists?(:users)

  unless User.exists?(email: "admin@example.com")
    user = User.create!(
      id: SecureRandom.uuid,
      email: "admin@example.com",
      email_verified: true,
      name: "Admin",
      is_admin: true,
      plan: "free",
      subscription_status: "inactive"
    )

    Account.create!(
      id: SecureRandom.uuid,
      account_id: user.id,
      provider_id: "credential",
      user_id: user.id,
      password: BCrypt::Password.create("password")
    )

    Rails.logger.info "Seeded admin user: admin@example.com"
  end
rescue => e
  Rails.logger.warn "Could not seed admin user: #{e.message}"
end
