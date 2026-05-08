# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Seed default admin user (admin@example.com / password)
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

  puts "✓ Seeded admin user: admin@example.com"
end
