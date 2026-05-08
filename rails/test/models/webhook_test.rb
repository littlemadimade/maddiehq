require "test_helper"

class WebhookTest < ActiveSupport::TestCase
  test "generates secret on create" do
    webhook = Webhook.create!(
      user_id: "usr-regular-0001",
      url: "https://example.com/hook",
      events: '["*"]'
    )
    assert webhook.secret.present?
    assert_equal 64, webhook.secret.length # hex(32) = 64 chars
  end

  test "subscribes_to? checks event matching" do
    webhook = webhooks(:regular_webhook)
    assert webhook.subscribes_to?("item.created")
    assert webhook.subscribes_to?("item.deleted")
    assert_not webhook.subscribes_to?("item.updated")
  end

  test "subscribes_to? with wildcard" do
    webhook = Webhook.create!(
      user_id: "usr-regular-0001",
      url: "https://example.com/hook",
      events: '["*"]'
    )
    assert webhook.subscribes_to?("anything.here")
  end

  test "subscribes_to? with empty events matches all" do
    webhook = Webhook.create!(
      user_id: "usr-regular-0001",
      url: "https://example.com/hook",
      events: '[]'
    )
    assert webhook.subscribes_to?("anything.here")
  end
end
