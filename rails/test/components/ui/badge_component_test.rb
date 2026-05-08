require "test_helper"

class UI::BadgeComponentTest < ViewComponent::TestCase
  test "renders a pill with default variant" do
    render_inline(UI::BadgeComponent.new) { "Draft" }

    assert_selector "span.bg-muted.rounded-full", text: "Draft"
  end

  test "applies variant classes" do
    render_inline(UI::BadgeComponent.new(variant: :success)) { "Active" }

    assert_selector "span.bg-success", text: "Active"
  end

  test "raises on unknown variant" do
    assert_raises(ArgumentError) { UI::BadgeComponent.new(variant: :nope) }
  end
end
