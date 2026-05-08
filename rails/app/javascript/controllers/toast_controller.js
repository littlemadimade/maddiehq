import { Controller } from "@hotwired/stimulus"

const ICON_PATHS = {
  success: "M5 13l4 4L19 7",
  error: "M6 18L18 6M6 6l12 12",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
}

const ICON_COLORS = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500"
}

const COLORS = {
  success: "bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
  error: "bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  info: "bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  warning: "bg-yellow-50 dark:bg-yellow-900/50 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
}

function createIcon(type) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", `w-5 h-5 ${ICON_COLORS[type] || ICON_COLORS.info}`)
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("viewBox", "0 0 24 24")
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute("stroke-linecap", "round")
  path.setAttribute("stroke-linejoin", "round")
  path.setAttribute("stroke-width", "2")
  path.setAttribute("d", ICON_PATHS[type] || ICON_PATHS.info)
  svg.appendChild(path)
  return svg
}

function getContainer() {
  let container = document.getElementById("toast-container")
  if (!container) {
    container = document.createElement("div")
    container.id = "toast-container"
    container.className = "fixed top-4 right-4 z-50 flex flex-col gap-2"
    // aria-live region so screen readers announce new toasts politely by
    // default; individual error toasts below override this to assertive.
    container.setAttribute("role", "region")
    container.setAttribute("aria-label", "Notifications")
    container.setAttribute("aria-live", "polite")
    document.body.appendChild(container)
  }
  return container
}

function showToast(message, type = "info", timeout = 5000) {
  const container = getContainer()
  const el = document.createElement("div")
  el.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ${COLORS[type] || COLORS.info}`
  el.style.opacity = "0"
  el.style.transform = "translateX(20px)"
  // Errors need immediate announcement; other toasts stay polite.
  el.setAttribute("role", type === "error" ? "alert" : "status")
  el.setAttribute("aria-live", type === "error" ? "assertive" : "polite")

  el.appendChild(createIcon(type))
  const span = document.createElement("span")
  span.className = "text-sm font-medium"
  span.textContent = message
  el.appendChild(span)

  container.appendChild(el)

  requestAnimationFrame(() => {
    el.style.opacity = "1"
    el.style.transform = "translateX(0)"
  })

  const dismiss = () => {
    el.style.opacity = "0"
    el.style.transform = "translateX(20px)"
    setTimeout(() => el.remove(), 300)
  }

  el.addEventListener("click", dismiss)
  if (timeout > 0) setTimeout(dismiss, timeout)
}

window.toast = {
  success: (msg, timeout) => showToast(msg, "success", timeout),
  error: (msg, timeout) => showToast(msg, "error", timeout),
  info: (msg, timeout) => showToast(msg, "info", timeout),
  warning: (msg, timeout) => showToast(msg, "warning", timeout)
}

export default class extends Controller {
  static values = {
    timeout: { type: Number, default: 5000 },
    type: { type: String, default: "info" }
  }

  connect() {
    showToast(this.element.textContent.trim(), this.typeValue, this.timeoutValue)
    this.element.remove()
  }
}
