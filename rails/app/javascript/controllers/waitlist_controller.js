import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form", "emailInput", "submitButton", "successMessage", "errorMessage", "referralSection", "referralLink", "copyButton"]

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  connect() {
    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search)
    this.refCode = params.get("ref")
  }

  async join(event) {
    event.preventDefault()
    const email = this.emailInputTarget.value

    this.submitButtonTarget.disabled = true
    this.submitButtonTarget.textContent = "Joining..."
    if (this.hasErrorMessageTarget) this.errorMessageTarget.classList.add("hidden")

    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ email, referralCode: this.refCode })
      })
      const data = await res.json()

      if (!res.ok) {
        this.showError(data.error || "Something went wrong. Please try again.")
      } else {
        this.formTarget.classList.add("hidden")
        let msg = "You're on the list!"
        if (data.position) msg += ` You're #${data.position} in line.`
        this.successMessageTarget.textContent = msg
        this.successMessageTarget.classList.remove("hidden")

        if (data.referralCode && this.hasReferralSectionTarget) {
          const link = `${window.location.origin}?ref=${data.referralCode}`
          this.referralLinkTarget.value = link
          this.referralSectionTarget.classList.remove("hidden")
        }
      }
    } catch {
      this.showError("Network error. Please try again.")
    } finally {
      this.submitButtonTarget.disabled = false
      this.submitButtonTarget.textContent = "Join Waitlist"
    }
  }

  copyReferral() {
    if (!this.hasReferralLinkTarget) return
    navigator.clipboard.writeText(this.referralLinkTarget.value)
    if (this.hasCopyButtonTarget) {
      this.copyButtonTarget.textContent = "Copied!"
      setTimeout(() => { this.copyButtonTarget.textContent = "Copy" }, 2000)
    }
  }

  showError(message) {
    if (this.hasErrorMessageTarget) {
      this.errorMessageTarget.textContent = message
      this.errorMessageTarget.classList.remove("hidden")
    }
  }
}
