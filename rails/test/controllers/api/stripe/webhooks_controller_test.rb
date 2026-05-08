require "test_helper"
require "ostruct"

class Api::Stripe::WebhooksControllerTest < ActionDispatch::IntegrationTest
  include ActionMailer::TestHelper

  setup do
    @user = users(:regular)
    @user.update!(stripe_customer_id: "cus_test_123")

    # Stub Stripe::Webhook.construct_event so tests don't need a real signed payload.
    # We return a plain Struct whose shape mirrors Stripe::Event for the fields
    # the controller reads. Each test assigns @stubbed_event below.
    @stubbed_event = nil
    original = ::Stripe::Webhook.method(:construct_event)
    @restore_construct_event = -> { ::Stripe::Webhook.define_singleton_method(:construct_event, original) }
    stub = ->(_payload, _sig, _secret) { @stubbed_event or raise "test did not set @stubbed_event" }
    ::Stripe::Webhook.define_singleton_method(:construct_event) { |*args| stub.call(*args) }

    # Supply a non-blank webhook secret so the controller doesn't short-circuit.
    @original_webhook_secret = STRIPE_WEBHOOK_SECRET
    Object.send(:remove_const, :STRIPE_WEBHOOK_SECRET) if defined?(::STRIPE_WEBHOOK_SECRET)
    Object.const_set(:STRIPE_WEBHOOK_SECRET, "whsec_test_secret")
    @original_secret_key = STRIPE_SECRET_KEY
    Object.send(:remove_const, :STRIPE_SECRET_KEY) if defined?(::STRIPE_SECRET_KEY)
    Object.const_set(:STRIPE_SECRET_KEY, "sk_test_fake")
  end

  teardown do
    @restore_construct_event.call
    Object.send(:remove_const, :STRIPE_WEBHOOK_SECRET) if defined?(::STRIPE_WEBHOOK_SECRET)
    Object.const_set(:STRIPE_WEBHOOK_SECRET, @original_webhook_secret)
    Object.send(:remove_const, :STRIPE_SECRET_KEY) if defined?(::STRIPE_SECRET_KEY)
    Object.const_set(:STRIPE_SECRET_KEY, @original_secret_key)
  end

  def make_event(type, object_attrs)
    obj = OpenStruct.new(object_attrs)
    OpenStruct.new(type: type, data: OpenStruct.new(object: obj))
  end

  test "checkout.session.completed (subscription) upgrades user to pro and enqueues confirmation email" do
    @stubbed_event = make_event("checkout.session.completed", {
      customer: "cus_test_123",
      mode: "subscription",
      subscription: "sub_test_456"
    })

    assert_enqueued_emails 1 do
      post "/api/stripe/webhook", headers: { "Stripe-Signature" => "t=1,v1=test" }, params: "{}"
    end

    assert_response :ok
    @user.reload
    assert_equal "pro", @user.plan
    assert_equal "active", @user.subscription_status
    assert_equal "sub_test_456", @user.stripe_subscription_id
  end

  test "checkout.session.completed (payment) marks user as lifetime and sends purchase email" do
    @stubbed_event = make_event("checkout.session.completed", {
      customer: "cus_test_123",
      mode: "payment",
      subscription: nil
    })

    assert_enqueued_emails 1 do
      post "/api/stripe/webhook", headers: { "Stripe-Signature" => "t=1,v1=test" }, params: "{}"
    end

    assert_response :ok
    @user.reload
    assert_equal "lifetime", @user.plan
    assert_equal "active", @user.subscription_status
  end

  test "customer.subscription.updated updates subscription status" do
    @user.update!(plan: "pro", subscription_status: "active")
    @stubbed_event = make_event("customer.subscription.updated", {
      customer: "cus_test_123",
      status: "past_due"
    })

    post "/api/stripe/webhook", headers: { "Stripe-Signature" => "t=1,v1=test" }, params: "{}"
    assert_response :ok

    @user.reload
    assert_equal "past_due", @user.subscription_status
  end

  test "customer.subscription.deleted reverts user to free" do
    @user.update!(plan: "pro", subscription_status: "active", stripe_subscription_id: "sub_old")
    @stubbed_event = make_event("customer.subscription.deleted", { customer: "cus_test_123" })

    post "/api/stripe/webhook", headers: { "Stripe-Signature" => "t=1,v1=test" }, params: "{}"
    assert_response :ok

    @user.reload
    assert_equal "free", @user.plan
    assert_equal "inactive", @user.subscription_status
    assert_nil @user.stripe_subscription_id
  end

  test "customer.subscription.deleted does NOT downgrade lifetime users" do
    @user.update!(plan: "lifetime", subscription_status: "active")
    @stubbed_event = make_event("customer.subscription.deleted", { customer: "cus_test_123" })

    post "/api/stripe/webhook", headers: { "Stripe-Signature" => "t=1,v1=test" }, params: "{}"
    assert_response :ok

    @user.reload
    assert_equal "lifetime", @user.plan
    assert_equal "active", @user.subscription_status
  end

  test "invoice.payment_failed sets status to past_due" do
    @user.update!(plan: "pro", subscription_status: "active")
    @stubbed_event = make_event("invoice.payment_failed", { customer: "cus_test_123" })

    post "/api/stripe/webhook", headers: { "Stripe-Signature" => "t=1,v1=test" }, params: "{}"
    assert_response :ok

    @user.reload
    assert_equal "past_due", @user.subscription_status
  end

  test "unknown customer is ignored silently" do
    @stubbed_event = make_event("customer.subscription.updated", {
      customer: "cus_unknown",
      status: "active"
    })

    post "/api/stripe/webhook", headers: { "Stripe-Signature" => "t=1,v1=test" }, params: "{}"
    assert_response :ok
    # No user update — test passes by not raising
  end
end
