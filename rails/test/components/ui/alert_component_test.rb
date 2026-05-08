require "test_helper"

class UI::AlertComponentTest < ViewComponent::TestCase
  test "renders with role=alert and polite aria-live by default" do
    render_inline(UI::AlertComponent.new) { "Heads up" }

    assert_selector 'div[role=alert][aria-live=polite]', text: "Heads up"
  end

  test "error variant uses aria-live=assertive for screen readers" do
    render_inline(UI::AlertComponent.new(variant: :error)) { "Something broke" }

    assert_selector 'div[role=alert][aria-live=assertive]'
  end

  test "renders title when provided" do
    render_inline(UI::AlertComponent.new(title: "Oops")) { "details" }

    assert_selector "p", text: "Oops"
    assert_text "details"
  end

  test "dismissible renders a close button with aria-label" do
    render_inline(UI::AlertComponent.new(dismissible: true)) { "x" }

    assert_selector 'button[aria-label="Dismiss"]'
  end

  test "non-dismissible has no close button" do
    render_inline(UI::AlertComponent.new) { "x" }

    assert_no_selector 'button[aria-label="Dismiss"]'
  end

  test "raises on unknown variant" do
    assert_raises(ArgumentError) { UI::AlertComponent.new(variant: :nope) }
  end
end
