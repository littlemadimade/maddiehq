# frozen_string_literal: true

# UI::BadgeComponent
#
# Small pill-shaped label used for status, counts, and tags.
#
#   <%= render UI::BadgeComponent.new(variant: :success) { "Active" } %>
#   <%= render UI::BadgeComponent.new(variant: :destructive) { "Failed" } %>
#
# Accepts arbitrary HTML options so callers can attach Stimulus
# `data-` attributes (e.g. `data: { "items-target": "proBadge" }`).
module UI
  class BadgeComponent < ViewComponent::Base
    VARIANTS = %i[default success warning destructive info].freeze

    VARIANT_CLASSES = {
      default: "bg-muted text-muted-foreground",
      success: "bg-success text-success-foreground",
      warning: "bg-warning text-warning-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      info: "bg-info text-info-foreground"
    }.freeze

    def initialize(variant: :default, class: nil, **html_opts)
      raise ArgumentError, "variant must be one of #{VARIANTS.inspect}" unless VARIANTS.include?(variant)

      @variant = variant
      @extra_classes = binding.local_variable_get(:class)
      @html_opts = html_opts
    end

    def classes
      [
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
        VARIANT_CLASSES[@variant],
        @extra_classes
      ].compact.join(" ")
    end

    def call
      tag.span(class: classes, **@html_opts) { content }
    end
  end
end
