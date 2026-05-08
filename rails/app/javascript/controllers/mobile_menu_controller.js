import { Controller } from "@hotwired/stimulus"

// Mobile menu controller
//
// ARIA-correct disclosure pattern:
//   - The button that toggles the menu must have data-mobile-menu-target="trigger"
//   - aria-expanded is synced to the open state
//   - aria-controls points to the menu element
//   - Escape closes the menu
export default class extends Controller {
  static targets = ["menu", "openIcon", "closeIcon", "trigger"]
  static classes = ["scrolled"]

  connect() {
    this.isOpen = false
    this.handleScroll = this.onScroll.bind(this)
    this.handleKeydown = this.onKeydown.bind(this)
    window.addEventListener("scroll", this.handleScroll, { passive: true })
    document.addEventListener("keydown", this.handleKeydown)
    this.onScroll()

    // Wire ARIA on initial render
    if (this.hasTriggerTarget && this.hasMenuTarget) {
      const menuId = this.menuTarget.id || "mobile-menu"
      this.menuTarget.id = menuId
      this.triggerTarget.setAttribute("aria-controls", menuId)
      this.triggerTarget.setAttribute("aria-expanded", "false")
      this.triggerTarget.setAttribute("aria-haspopup", "true")
    }
  }

  disconnect() {
    window.removeEventListener("scroll", this.handleScroll)
    document.removeEventListener("keydown", this.handleKeydown)
  }

  onScroll() {
    if (window.scrollY > 20) {
      this.scrolledClasses.forEach(c => this.element.classList.add(c))
    } else {
      this.scrolledClasses.forEach(c => this.element.classList.remove(c))
    }
  }

  onKeydown(event) {
    if (event.key === "Escape" && this.isOpen) {
      event.preventDefault()
      this.close()
      if (this.hasTriggerTarget) this.triggerTarget.focus()
    }
  }

  toggle() {
    this.isOpen = !this.isOpen
    this._applyState()
  }

  close() {
    this.isOpen = false
    this._applyState()
  }

  _applyState() {
    if (this.hasMenuTarget) {
      this.menuTarget.classList.toggle("hidden", !this.isOpen)
    }
    if (this.hasOpenIconTarget) {
      this.openIconTarget.classList.toggle("hidden", this.isOpen)
    }
    if (this.hasCloseIconTarget) {
      this.closeIconTarget.classList.toggle("hidden", !this.isOpen)
    }
    if (this.hasTriggerTarget) {
      this.triggerTarget.setAttribute("aria-expanded", this.isOpen ? "true" : "false")
    }
  }
}
