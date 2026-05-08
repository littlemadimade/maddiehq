module ApplicationHelper
  def app_name
    ENV.fetch("APP_NAME", "MaddieHQ")
  end

  def app_url
    ENV.fetch("APP_URL", "http://localhost:3025")
  end

  def current_year
    Date.today.year
  end

  # UI component helpers
  def btn_primary(text = nil, **opts, &block)
    css = "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 #{opts[:class]}"
    if block_given?
      tag.button(class: css, **opts.except(:class), &block)
    else
      tag.button(text, class: css, **opts.except(:class))
    end
  end

  def btn_secondary(text = nil, **opts, &block)
    css = "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors #{opts[:class]}"
    if block_given?
      tag.button(class: css, **opts.except(:class), &block)
    else
      tag.button(text, class: css, **opts.except(:class))
    end
  end

  def btn_danger(text = nil, **opts, &block)
    css = "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors #{opts[:class]}"
    if block_given?
      tag.button(class: css, **opts.except(:class), &block)
    else
      tag.button(text, class: css, **opts.except(:class))
    end
  end

  def badge(text, variant: :default)
    colors = {
      default: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
      success: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
      warning: "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300",
      danger: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300",
      info: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
      pro: "bg-accent dark:bg-accent text-primary dark:text-primary"
    }
    tag.span(text, class: "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full #{colors[variant]}")
  end
end
