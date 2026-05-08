require "test_helper"

class SessionTest < ActiveSupport::TestCase
  test "generates token on create" do
    session = Session.create!(
      user: users(:regular),
      expires_at: 7.days.from_now
    )
    assert_not_nil session.token
    assert session.token.length > 0
  end

  test "does not overwrite explicitly set token" do
    session = Session.create!(
      user: users(:regular),
      token: "my-custom-token",
      expires_at: 7.days.from_now
    )
    assert_equal "my-custom-token", session.token
  end

  test "token must be unique" do
    existing = sessions(:regular_session)
    session = Session.new(
      user: users(:admin),
      token: existing.token,
      expires_at: 7.days.from_now
    )
    assert_not session.valid?
    assert_includes session.errors[:token], "has already been taken"
  end

  test "expires_at is required" do
    session = Session.new(user: users(:regular), token: "some-token")
    assert_not session.valid?
    assert_includes session.errors[:expires_at], "can't be blank"
  end

  test "expired? returns true for past expiry" do
    session = sessions(:regular_session)
    session.expires_at = 1.hour.ago
    assert session.expired?
  end

  test "expired? returns false for future expiry" do
    session = sessions(:regular_session)
    assert_not session.expired?
  end

  test "active scope returns only non-expired sessions" do
    # Create an expired session
    expired = Session.create!(
      user: users(:regular),
      expires_at: 1.hour.ago
    )

    active_sessions = Session.active
    assert_not_includes active_sessions, expired
    assert_includes active_sessions, sessions(:regular_session)
  end

  test "belongs to user" do
    session = sessions(:regular_session)
    assert_equal users(:regular), session.user
  end
end
