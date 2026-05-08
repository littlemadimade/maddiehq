require "test_helper"

class UI::ButtonComponentTest < ViewComponent::TestCase
  test "renders a button with the primary variant by default" do
    render_inline(UI::ButtonComponent.new) { "Save" }

    assert_selector "button[type=button]", text: "Save"
    assert_selector "button.bg-primary"
  end

  test "respects variant and size props" do
    render_inline(UI::ButtonComponent.new(variant: :destructive, size: :lg)) { "Delete" }

    assert_selector "button.bg-destructive.h-11", text: "Delete"
  end

  test "renders as an anchor when as: :link" do
    render_inline(UI::ButtonComponent.new(as: :link, href: "/auth")) { "Sign in" }

    assert_selector "a[href='/auth']", text: "Sign in"
    assert_no_selector "button"
  end

  test "sets disabled attribute and classes" do
    render_inline(UI::ButtonComponent.new(disabled: true)) { "Disabled" }

    assert_selector "button[disabled]"
  end

  test "raises on unknown variant" do
    assert_raises(ArgumentError) do
      UI::ButtonComponent.new(variant: :bogus)
    end
  end

  test "raises on unknown size" do
    assert_raises(ArgumentError) do
      UI::ButtonComponent.new(size: :xxl)
    end
  end

  test "merges extra classes" do
    render_inline(UI::ButtonComponent.new(class: "w-full")) { "Full" }

    assert_selector "button.w-full.bg-primary"
  end
end
