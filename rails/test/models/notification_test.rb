require "test_helper"

class NotificationTest < ActiveSupport::TestCase
  test "validates title presence" do
    n = Notification.new(user_id: "usr-regular-0001", notification_type: "info", title: "")
    assert_not n.valid?
  end

  test "validates notification_type inclusion" do
    n = Notification.new(user_id: "usr-regular-0001", notification_type: "invalid", title: "Test")
    assert_not n.valid?
  end

  test "unread scope returns only unread" do
    unread = Notification.unread
    assert unread.all? { |n| !n.read }
  end
end
