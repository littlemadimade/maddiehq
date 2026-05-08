import { Controller } from "@hotwired/stimulus"

// Modal controller
//
// Handles the a11y concerns Radix Dialog gives you in React:
//   - Focus trap while open (Tab / Shift+Tab cycle within the dialog)
//   - Escape closes
//   - Click on backdrop closes
//   - Body scroll lock while open
//   - Restores focus to the element that opened the dialog on close
//
// Usage from other controllers / inline handlers:
//   this.element.querySelector("#my-modal").dispatchEvent(new CustomEvent("modal:open"))
//   or call `open()` / `close()` directly when the modal element is a target.
//
// The ModalComponent ViewComponent auto-wires this controller with the
// correct targets and actions.
export default class extends Controller {
  static targets = ["backdrop", "panel"]
  static values = { open: { type: Boolean, default: false } }

  connect() {
    // Remember the focused element so we can restore it on close
    this._previousActive = null
    // Listen for external open/close events on the host element
    this.element.addEventListener("modal:open", this._externalOpen = () => this.open())
    this.element.addEventListener("modal:close", this._externalClose = () => this.close())

    if (this.openValue) {
      this._activate()
    }
  }

  disconnect() {
    this.element.removeEventListener("modal:open", this._externalOpen)
    this.element.removeEventListener("modal:close", this._externalClose)
    this._releaseScrollLock()
  }

  open() {
    if (this.openValue) return
    this.openValue = true
    this._activate()
  }

  close() {
    if (!this.openValue) return
    this.openValue = false
    this._deactivate()
  }

  // Backdrop click should close, but clicks inside the panel should not.
  handleBackdropClick(event) {
    if (!this.hasPanelTarget) return
    if (event.target === this.backdropTarget) {
      this.close()
    }
  }

  // Esc closes; Tab / Shift+Tab implements the focus trap.
  handleKeydown(event) {
    if (!this.openValue) return

    if (event.key === "Escape") {
      event.preventDefault()
      this.close()
      return
    }

    if (event.key === "Tab") {
      this._trapFocus(event)
    }
  }

  // ── private ────────────────────────────────────────────────────────────

  _activate() {
    this._previousActive = document.activeElement
    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.remove("hidden")
      this.backdropTarget.setAttribute("aria-hidden", "false")
    }
    this._applyScrollLock()
    // Move focus into the panel
    requestAnimationFrame(() => {
      const focusables = this._getFocusable()
      if (focusables.length > 0) {
        focusables[0].focus()
      } else if (this.hasPanelTarget) {
        this.panelTarget.focus()
      }
    })
  }

  _deactivate() {
    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.add("hidden")
      this.backdropTarget.setAttribute("aria-hidden", "true")
    }
    this._releaseScrollLock()
    // Restore focus to the element that opened the modal
    if (this._previousActive && typeof this._previousActive.focus === "function") {
      this._previousActive.focus()
    }
    this._previousActive = null
  }

  _getFocusable() {
    if (!this.hasPanelTarget) return []
    return Array.from(this.panelTarget.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ))
  }

  _trapFocus(event) {
    const focusables = this._getFocusable()
    if (focusables.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  _applyScrollLock() {
    // Remember the original overflow so we can restore it exactly
    this._savedOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
  }

  _releaseScrollLock() {
    if (this._savedOverflow !== undefined) {
      document.body.style.overflow = this._savedOverflow
      this._savedOverflow = undefined
    }
  }
}
