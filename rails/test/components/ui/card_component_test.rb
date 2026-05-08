require "test_helper"

class UI::CardComponentTest < ViewComponent::TestCase
  test "renders body content inside a bordered card surface" do
    render_inline(UI::CardComponent.new) { "Card body" }

    assert_selector "div.bg-card.border.rounded-xl", text: "Card body"
  end

  test "renders header with title and subtitle when provided" do
    render_inline(UI::CardComponent.new(title: "Settings", subtitle: "Manage your account")) { "Body" }

    assert_selector "h3", text: "Settings"
    assert_selector "p", text: "Manage your account"
    assert_text "Body"
  end

  test "renders header only when any header prop is present" do
    render_inline(UI::CardComponent.new) { "Body only" }

    assert_no_selector "h3"
    assert_no_selector ".border-b"
  end
end
