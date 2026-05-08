# frozen_string_literal: true

# UI::ModalComponent
#
# Accessible modal dialog with focus trap, Escape-to-close, body scroll lock,
# and focus restoration on close. Uses `role="dialog"` + `aria-modal="true"` +
# `aria-labelledby` so screen readers announce the title.
#
# The open/close state is driven by a Stimulus controller (`modal_controller.js`)
# that the component auto-wires. Toggle open state from outside by dispatching
# `modal:open` / `modal:close` events to the element, or pass `open: true` to
# render the modal already visible on page load.
#
#   <%= render UI::ModalComponent.new(id: "confirm-delete", title: "Delete item?") do %>
#     <p>This action cannot be undone.</p>
#     <div class="mt-4 flex gap-2 justify-end">
#       <%= render UI::ButtonComponent.new(variant: :secondary, data: { action: "modal#close" }) { "Cancel" } %>
#       <%= render UI::ButtonComponent.new(variant: :destructive) { "Delete" } %>
#     </div>
#   <% end %>
module UI
  class ModalComponent < ViewComponent::Base
    SIZES = %i[sm md lg xl].freeze
    SIZE_CLASSES = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-2xl"
    }.freeze

    def initialize(id:, title:, size: :md, open: false, class: nil)
      raise ArgumentError, "size must be one of #{SIZES.inspect}" unless SIZES.include?(size)

      @id = id
      @title = title
      @size = size
      @open = open
      @extra_classes = binding.local_variable_get(:class)
    end

    def panel_classes
      [
        "relative bg-card text-card-foreground rounded-xl shadow-xl border border-border w-full",
        SIZE_CLASSES[@size],
        @extra_classes
      ].compact.join(" ")
    end

    def backdrop_classes
      classes = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity"
      classes += @open ? "" : " hidden"
      classes
    end

    attr_reader :id, :title, :open
    def title_id
      "#{@id}-title"
    end
  end
end
