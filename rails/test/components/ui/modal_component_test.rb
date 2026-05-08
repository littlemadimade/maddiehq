require "test_helper"

class UI::ModalComponentTest < ViewComponent::TestCase
  test "renders dialog role with aria-modal and aria-labelledby" do
    render_inline(UI::ModalComponent.new(id: "my-modal", title: "Delete item?")) { "body" }

    assert_selector 'div[role=dialog][aria-modal=true][aria-labelledby="my-modal-title"]'
    assert_selector 'h2#my-modal-title', text: "Delete item?"
    assert_text "body"
  end

  test "hidden by default (backdrop has hidden class)" do
    render_inline(UI::ModalComponent.new(id: "m", title: "T")) { "x" }

    assert_selector '[data-modal-target=backdrop].hidden'
    assert_selector '[aria-hidden=true]'
  end

  test "can render in the open state via open: true" do
    render_inline(UI::ModalComponent.new(id: "m", title: "T", open: true)) { "x" }

    assert_selector '[data-modal-target=backdrop]:not(.hidden)'
    assert_selector '[aria-hidden=false]'
  end

  test "wires up the modal Stimulus controller with keyboard + click actions" do
    render_inline(UI::ModalComponent.new(id: "m", title: "T")) { "x" }

    assert_selector '[data-controller=modal][data-action*="keydown->modal#handleKeydown"]'
    assert_selector '[data-action*="click->modal#handleBackdropClick"]'
  end

  test "close button has an accessible label" do
    render_inline(UI::ModalComponent.new(id: "m", title: "T")) { "x" }

    assert_selector 'button[aria-label="Close dialog"][data-action="click->modal#close"]'
  end

  test "raises on unknown size" do
    assert_raises(ArgumentError) { UI::ModalComponent.new(id: "m", title: "T", size: :huge) }
  end
end
