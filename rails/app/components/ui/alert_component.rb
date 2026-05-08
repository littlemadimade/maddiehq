# frozen_string_literal: true

# UI::AlertComponent
#
# Inline alert banner with variants and an optional dismiss affordance.
# Rendered with `role="alert"` + `aria-live="polite"` for screen-reader
# announcements (use `variant: :error` to get `aria-live="assertive"`).
#
#   <%= render UI::AlertComponent.new(variant: :success) do %>
#     Your changes have been saved.
#   <% end %>
#
#   <%= render UI::AlertComponent.new(variant: :error, title: "Something went wrong") do %>
#     The server returned an error. Please try again.
#   <% end %>
module UI
  class AlertComponent < ViewComponent::Base
    VARIANTS = %i[info success warning error].freeze

    VARIANT_CLASSES = {
      info: "bg-info/10 border-info/30 text-info",
      success: "bg-success/10 border-success/30 text-success",
      warning: "bg-warning/10 border-warning/30 text-warning",
      error: "bg-destructive/10 border-destructive/30 text-destructive"
    }.freeze

    def initialize(variant: :info, title: nil, dismissible: false, class: nil)
      raise ArgumentError, "variant must be one of #{VARIANTS.inspect}" unless VARIANTS.include?(variant)

      @variant = variant
      @title = title
      @dismissible = dismissible
      @extra_classes = binding.local_variable_get(:class)
    end

    def classes
      [
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        VARIANT_CLASSES[@variant],
        @extra_classes
      ].compact.join(" ")
    end

    def aria_live
      @variant == :error ? "assertive" : "polite"
    end

    attr_reader :title, :dismissible
  end
end
