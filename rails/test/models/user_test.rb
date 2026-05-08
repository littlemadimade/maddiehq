require "test_helper"

class UserTest < ActiveSupport::TestCase
  # ── Validations ──

  test "valid user with all required fields" do
    user = User.new(email: "new@example.com", name: "New User")
    assert user.valid?
  end

  test "email is required" do
    user = User.new(name: "No Email")
    assert_not user.valid?
    assert_includes user.errors[:email], "can't be blank"
  end

  test "email must be unique" do
    existing = users(:regular)
    user = User.new(email: existing.email, name: "Duplicate")
    assert_not user.valid?
    assert_includes user.errors[:email], "has already been taken"
  end

  test "email must have valid format" do
    user = User.new(email: "not-an-email", name: "Bad Email")
    assert_not user.valid?
    assert_includes user.errors[:email], "is invalid"
  end

  test "valid email formats are accepted" do
    %w[user@example.com test+tag@domain.co].each do |email|
      user = User.new(email: email, name: "Valid")
      assert user.valid?, "#{email} should be valid"
    end
  end

  test "plan must be in allowed list" do
    user = users(:regular)
    user.plan = "invalid_plan"
    assert_not user.valid?
    assert_includes user.errors[:plan], "is not included in the list"
  end

  test "plan allows free, pro, enterprise" do
    user = users(:regular)
    %w[free pro enterprise].each do |plan|
      user.plan = plan
      assert user.valid?, "#{plan} should be a valid plan"
    end
  end

  test "subscription_status must be in allowed list" do
    user = users(:regular)
    user.subscription_status = "bogus"
    assert_not user.valid?
  end

  # ── Associations ──

  test "has many items" do
    user = users(:regular)
    assert_respond_to user, :items
    assert_kind_of ActiveRecord::Associations::CollectionProxy, user.items
  end

  test "has many sessions" do
    user = users(:regular)
    assert_respond_to user, :sessions
  end

  test "has many accounts" do
    user = users(:regular)
    assert_respond_to user, :accounts
  end

  test "destroying user destroys associated items" do
    user = users(:regular)
    item_count = user.items.count
    assert item_count > 0, "Fixture should have items"

    assert_difference("Item.count", -item_count) do
      user.destroy
    end
  end

  test "destroying user destroys associated sessions" do
    user = users(:regular)
    session_count = user.sessions.count
    assert session_count > 0

    assert_difference("Session.count", -session_count) do
      user.destroy
    end
  end

  # ── Scopes ──

  test "admins scope returns only admin users" do
    admins = User.admins
    assert admins.all?(&:admin?)
    assert_includes admins, users(:admin)
    assert_not_includes admins, users(:regular)
  end

  test "active scope excludes disabled users" do
    active = User.active
    assert_includes active, users(:regular)
    assert_includes active, users(:admin)
    assert_not_includes active, users(:disabled)
  end

  # ── Instance Methods ──

  test "admin? returns true for admin user" do
    assert users(:admin).admin?
  end

  test "admin? returns false for regular user" do
    assert_not users(:regular).admin?
  end

  test "authenticate with correct password returns true" do
    user = users(:regular)
    assert user.authenticate("password123")
  end

  test "authenticate with wrong password returns false" do
    user = users(:regular)
    assert_not user.authenticate("wrongpassword")
  end

  test "authenticate returns false when no credential account" do
    user = User.create!(email: "oauth@example.com", name: "OAuth User")
    assert_not user.authenticate("anything")
  end

  test "credential_account returns the credential provider account" do
    user = users(:regular)
    account = user.credential_account
    assert_not_nil account
    assert_equal "credential", account.provider_id
  end

  test "active_subscription? returns true when subscription is active" do
    user = users(:admin) # has subscription_status: active
    assert user.active_subscription?
  end

  test "active_subscription? returns false when subscription is inactive" do
    user = users(:regular)
    assert_not user.active_subscription?
  end

  # ── UUID Generation ──

  test "generates UUID on create when id is blank" do
    user = User.create!(email: "uuid@example.com", name: "UUID Test")
    assert_not_nil user.id
    assert_match(/\A[0-9a-f-]{36}\z/, user.id)
  end
end
