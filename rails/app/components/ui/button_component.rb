# frozen_string_literal: true

# UI::ButtonComponent
#
# Reusable button with variants and sizes backed by the semantic token system.
# Renders a `<button>` by default; pass `as: :link` + `href:` to render an `<a>`
# that still looks like a button (useful for links that navigate rather than
# submit a form).
#
#   <%= render UI::ButtonComponent.new(variant: :primary) { "Save" } %>
#   <%= render UI::ButtonComponent.new(variant: :destructive, size: :sm) { "Delete" } %>
#   <%= render UI::ButtonComponent.new(as: :link, href: "/auth?tab=signup") { "Sign up" } %>
module UI
  class ButtonComponent < ViewComponent::Base
    VARIANTS = %i[primary secondary destructive ghost outline].freeze
    SIZES = %i[sm md lg].freeze

    VARIANT_CLASSES = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive",
      ghost: "bg-transparent text-foreground hover:bg-muted focus-visible:ring-ring",
      outline: "bg-transparent border border-border text-foreground hover:bg-muted focus-visible:ring-ring"
    }.freeze

    SIZE_CLASSES = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-6 text-base"
    }.freeze

    BASE_CLASSES = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none".freeze

    def initialize(variant: :primary, size: :md, as: :button, type: "button", href: nil, disabled: false, class: nil, **html_opts)
      raise ArgumentError, "variant must be one of #{VARIANTS.inspect}" unless VARIANTS.include?(variant)
      raise ArgumentError, "size must be one of #{SIZES.inspect}" unless SIZES.include?(size)

      @variant = variant
      @size = size
      @as = as
      @type = type
      @href = href
      @disabled = disabled
      @extra_classes = binding.local_variable_get(:class)
      @html_opts = html_opts
    end

    def classes
      [BASE_CLASSES, VARIANT_CLASSES[@variant], SIZE_CLASSES[@size], @extra_classes].compact.join(" ")
    end

    def call
      if @as == :link
        link_to(@href || "#", class: classes, **@html_opts) { content }
      else
        tag.button(type: @type, disabled: @disabled, class: classes, **@html_opts) { content }
      end
    end
  end
end
