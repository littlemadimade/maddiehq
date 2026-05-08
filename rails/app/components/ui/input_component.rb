# frozen_string_literal: true

# UI::InputComponent
#
# Form input with label, optional helper text, and error state wired through
# `aria-invalid` + `aria-describedby`. For accessibility, always prefer
# rendering the component with a `label:` rather than a disembodied `<input>`.
#
#   <%= render UI::InputComponent.new(name: "email", label: "Email", type: "email", required: true) %>
#   <%= render UI::InputComponent.new(name: "password", label: "Password", type: "password", error: "Too short") %>
module UI
  class InputComponent < ViewComponent::Base
    def initialize(name:, label: nil, type: "text", value: nil, placeholder: nil,
                   required: false, autocomplete: nil, error: nil, helper: nil,
                   id: nil, class: nil, **html_opts)
      @name = name
      @label = label
      @type = type
      @value = value
      @placeholder = placeholder
      @required = required
      @autocomplete = autocomplete
      @error = error
      @helper = helper
      @id = id || "input-#{name.to_s.gsub(/[^\w]+/, '-')}"
      @extra_classes = binding.local_variable_get(:class)
      @html_opts = html_opts
    end

    def input_classes
      base = "block w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50"
      border = @error.present? ? "border-destructive" : "border-input"
      [base, border, @extra_classes].compact.join(" ")
    end

    def described_by
      ids = []
      ids << "#{@id}-error" if @error.present?
      ids << "#{@id}-helper" if @error.blank? && @helper.present?
      ids.empty? ? nil : ids.join(" ")
    end

    attr_reader :id, :name, :type, :value, :placeholder, :label, :error, :helper, :required, :autocomplete, :html_opts
  end
end
