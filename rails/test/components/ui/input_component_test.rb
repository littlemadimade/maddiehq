require "test_helper"

class UI::InputComponentTest < ViewComponent::TestCase
  test "renders label associated with input via for/id" do
    render_inline(UI::InputComponent.new(name: "email", label: "Email", type: "email"))

    assert_selector 'label[for="input-email"]', text: /Email/
    assert_selector 'input#input-email[name=email][type=email]'
  end

  test "required inputs expose aria-required" do
    render_inline(UI::InputComponent.new(name: "password", label: "Password", type: "password", required: true))

    assert_selector 'input[aria-required=true][required]'
  end

  test "error state sets aria-invalid and describes the input" do
    render_inline(UI::InputComponent.new(name: "email", label: "Email", error: "Too short"))

    assert_selector 'input[aria-invalid=true][aria-describedby="input-email-error"]'
    assert_selector 'p#input-email-error', text: "Too short"
  end

  test "helper text uses aria-describedby when no error is present" do
    render_inline(UI::InputComponent.new(name: "email", label: "Email", helper: "We never share this"))

    assert_selector 'input[aria-describedby="input-email-helper"]'
    assert_selector 'p#input-email-helper', text: "We never share this"
  end

  test "autocomplete attribute is passed through" do
    render_inline(UI::InputComponent.new(name: "email", label: "Email", autocomplete: "email"))

    assert_selector 'input[autocomplete=email]'
  end
end
