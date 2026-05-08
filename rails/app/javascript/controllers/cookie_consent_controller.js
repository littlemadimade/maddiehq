import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      this.element.classList.remove("hidden")
    }
  }

  acceptAll() {
    localStorage.setItem("cookie-consent", "all")
    this.element.classList.add("hidden")
  }

  acceptEssential() {
    localStorage.setItem("cookie-consent", "essential")
    this.element.classList.add("hidden")
  }
}
