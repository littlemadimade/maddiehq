import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form", "emailInput", "submitButton", "successMessage", "errorMessage"]

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  async subscribe(event) {
    event.preventDefault()

    const email = this.hasEmailInputTarget ? this.emailInputTarget.value : ""
    if (!email) return

    if (this.hasErrorMessageTarget) this.errorMessageTarget.classList.add("hidden")

    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.textContent = "Subscribing..."
    }

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ email })
      })
      const data = await res.json()

      if (!res.ok) {
        if (this.hasErrorMessageTarget) {
          this.errorMessageTarget.textContent = data.error || "Something went wrong. Please try again."
          this.errorMessageTarget.classList.remove("hidden")
        }
      } else {
        if (this.hasFormTarget) this.formTarget.classList.add("hidden")
        if (this.hasSuccessMessageTarget) {
          this.successMessageTarget.textContent = "You're subscribed! We'll keep you posted."
          this.successMessageTarget.classList.remove("hidden")
        }
      }
    } catch {
      if (this.hasErrorMessageTarget) {
        this.errorMessageTarget.textContent = "Network error. Please try again."
        this.errorMessageTarget.classList.remove("hidden")
      }
    } finally {
      if (this.hasSubmitButtonTarget) {
        this.submitButtonTarget.disabled = false
        this.submitButtonTarget.textContent = "Subscribe"
      }
    }
  }
}
