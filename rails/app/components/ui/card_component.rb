# frozen_string_literal: true

# UI::CardComponent
#
# Rounded surface panel with an optional header (icon + title + subtitle).
# Pass a block for the main content.
#
#   <%= render UI::CardComponent.new(title: "Account") do %>
#     <p>Manage your account.</p>
#   <% end %>
module UI
  class CardComponent < ViewComponent::Base
    def initialize(title: nil, subtitle: nil, icon: nil, class: nil)
      @title = title
      @subtitle = subtitle
      @icon = icon
      @extra_classes = binding.local_variable_get(:class)
    end

    def container_classes
      [
        "bg-card text-card-foreground border border-border rounded-xl shadow-sm",
        @extra_classes
      ].compact.join(" ")
    end

    def has_header?
      @title.present? || @subtitle.present? || @icon.present?
    end

    attr_reader :title, :subtitle, :icon
  end
end
