import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "error", "loginForm", "signupForm", "loginButton", "signupButton",
    "mfaSection", "mfaInput", "mfaButton",
    "submitButton", "successMessage",
    "verifyPending", "verifySuccess", "verifyError", "verifyErrorMessage",
    "inviteCodeField", "inviteCodeInput"
  ]
  static values = { autoVerify: Boolean, waitlistMode: { type: String, default: "false" } }

  connect() {
    if (this.autoVerifyValue) {
      this.autoVerify()
    }

    // Show invite code field if in waitlist mode
    if (this.waitlistModeValue === "true" && this.hasInviteCodeFieldTarget) {
      this.inviteCodeFieldTarget.classList.remove("hidden")
      if (this.hasInviteCodeInputTarget) {
        this.inviteCodeInputTarget.required = true
      }
    }

    // Pre-fill invite code from URL params
    const params = new URLSearchParams(window.location.search)
    const invite = params.get("invite")
    if (invite && this.hasInviteCodeInputTarget) {
      this.inviteCodeInputTarget.value = invite
      if (this.hasInviteCodeFieldTarget) {
        this.inviteCodeFieldTarget.classList.remove("hidden")
      }
    }
  }

  showError(message) {
    if (this.hasErrorTarget) {
      this.errorTarget.textContent = message
      this.errorTarget.classList.remove("hidden")
    }
  }

  hideError() {
    if (this.hasErrorTarget) {
      this.errorTarget.classList.add("hidden")
    }
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  async handleLogin(event) {
    event.preventDefault()
    this.hideError()

    const form = event.target
    const email = form.querySelector('[name="email"]').value
    const password = form.querySelector('[name="password"]').value

    if (this.hasLoginButtonTarget) {
      this.loginButtonTarget.disabled = true
      this.loginButtonTarget.textContent = "Signing in..."
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      if (!res.ok) {
        this.showError(data.error || "Invalid email or password")
      } else if (data.twoFactorRequired) {
        this.tempToken = data.tempToken
        if (this.hasLoginFormTarget) this.loginFormTarget.classList.add("hidden")
        if (this.hasMfaSectionTarget) this.mfaSectionTarget.classList.remove("hidden")
      } else {
        window.location.href = "/app"
      }
    } catch {
      this.showError("Network error. Please try again.")
    } finally {
      if (this.hasLoginButtonTarget) {
        this.loginButtonTarget.disabled = false
        this.loginButtonTarget.textContent = "Sign In"
      }
    }
  }

  async handleSignup(event) {
    event.preventDefault()
    this.hideError()

    const form = event.target
    const email = form.querySelector('[name="email"]').value
    const password = form.querySelector('[name="password"]').value
    const passwordConfirmation = form.querySelector('[name="password_confirmation"]').value
    const inviteCode = this.hasInviteCodeInputTarget ? this.inviteCodeInputTarget.value.trim() : ""

    if (password !== passwordConfirmation) {
      this.showError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      this.showError("Password must be at least 8 characters")
      return
    }

    // In waitlist mode, validate invite code before signup
    if (this.waitlistModeValue === "true") {
      if (!inviteCode) {
        this.showError("An invite code is required to sign up")
        return
      }

      if (this.hasSignupButtonTarget) {
        this.signupButtonTarget.disabled = true
        this.signupButtonTarget.textContent = "Validating invite..."
      }

      try {
        const valRes = await fetch(`/api/waitlist/validate-invite?code=${encodeURIComponent(inviteCode)}`, {
          headers: { "X-CSRF-Token": this.getCsrfToken() }
        })
        const valData = await valRes.json()
        if (!valData.valid) {
          this.showError(valData.reason || "Invalid invite code")
          if (this.hasSignupButtonTarget) {
            this.signupButtonTarget.disabled = false
            this.signupButtonTarget.textContent = "Create Account"
          }
          return
        }
        if (valData.lockedToEmail && valData.lockedToEmail.toLowerCase() !== email.toLowerCase()) {
          this.showError("This invite code is not valid for your email address")
          if (this.hasSignupButtonTarget) {
            this.signupButtonTarget.disabled = false
            this.signupButtonTarget.textContent = "Create Account"
          }
          return
        }
      } catch {
        this.showError("Could not validate invite code. Please try again.")
        if (this.hasSignupButtonTarget) {
          this.signupButtonTarget.disabled = false
          this.signupButtonTarget.textContent = "Create Account"
        }
        return
      }
    }

    if (this.hasSignupButtonTarget) {
      this.signupButtonTarget.disabled = true
      this.signupButtonTarget.textContent = "Creating account..."
    }

    // Auto-generate name from email prefix (matches Node behavior)
    const name = email.split("@")[0]

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()

      if (!res.ok) {
        this.showError(data.error || "Something went wrong")
      } else {
        // Redeem invite code after successful signup (fire-and-forget)
        if (this.waitlistModeValue === "true" && inviteCode) {
          fetch("/api/waitlist/redeem-invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": this.getCsrfToken()
            },
            body: JSON.stringify({ code: inviteCode })
          }).catch(() => {})
        }
        window.location.href = "/app"
      }
    } catch {
      this.showError("Network error. Please try again.")
    } finally {
      if (this.hasSignupButtonTarget) {
        this.signupButtonTarget.disabled = false
        this.signupButtonTarget.textContent = "Create Account"
      }
    }
  }

  async verifyMfa() {
    if (!this.hasMfaInputTarget) return
    const code = this.mfaInputTarget.value
    if (code.length !== 6) return

    this.hideError()
    if (this.hasMfaButtonTarget) {
      this.mfaButtonTarget.disabled = true
      this.mfaButtonTarget.textContent = "Verifying..."
    }

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ code, tempToken: this.tempToken })
      })
      const data = await res.json()

      if (!res.ok) {
        this.showError(data.error || "Invalid code")
      } else {
        window.location.href = "/app"
      }
    } catch {
      this.showError("Verification failed. Please try again.")
    } finally {
      if (this.hasMfaButtonTarget) {
        this.mfaButtonTarget.disabled = false
        this.mfaButtonTarget.textContent = "Verify"
      }
    }
  }

  cancelMfa() {
    if (this.hasMfaSectionTarget) this.mfaSectionTarget.classList.add("hidden")
    if (this.hasLoginFormTarget) this.loginFormTarget.classList.remove("hidden")
    if (this.hasMfaInputTarget) this.mfaInputTarget.value = ""
    this.hideError()
  }

  async socialSignIn(event) {
    const provider = event.currentTarget.dataset.provider
    window.location.href = `/api/auth/oauth/${provider}`
  }

  async handleForgotPassword(event) {
    event.preventDefault()
    this.hideError()

    const form = event.target
    const email = form.querySelector('[name="email"]').value

    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.textContent = "Sending..."
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ email })
      })

      if (res.ok && this.hasSuccessMessageTarget) {
        this.successMessageTarget.textContent = "If an account exists with that email, we've sent a reset link."
        this.successMessageTarget.classList.remove("hidden")
        form.classList.add("hidden")
      } else {
        const data = await res.json()
        this.showError(data.error || "Something went wrong")
      }
    } catch {
      this.showError("Network error. Please try again.")
    } finally {
      if (this.hasSubmitButtonTarget) {
        this.submitButtonTarget.disabled = false
        this.submitButtonTarget.textContent = "Send Reset Link"
      }
    }
  }

  async handleResetPassword(event) {
    event.preventDefault()
    this.hideError()

    const form = event.target
    const password = form.querySelector('[name="password"]').value
    const passwordConfirmation = form.querySelector('[name="password_confirmation"]').value

    if (password !== passwordConfirmation) {
      this.showError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      this.showError("Password must be at least 8 characters")
      return
    }

    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")

    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.textContent = "Resetting..."
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ token, password })
      })

      if (res.ok) {
        window.location.href = "/auth?tab=login"
      } else {
        const data = await res.json()
        this.showError(data.error || "Failed to reset password")
      }
    } catch {
      this.showError("Network error. Please try again.")
    } finally {
      if (this.hasSubmitButtonTarget) {
        this.submitButtonTarget.disabled = false
        this.submitButtonTarget.textContent = "Reset Password"
      }
    }
  }

  async autoVerify() {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")

    if (!token) {
      this.showVerifyError("No verification token found.")
      return
    }

    try {
      const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      if (res.ok) {
        if (this.hasVerifyPendingTarget) this.verifyPendingTarget.classList.add("hidden")
        if (this.hasVerifySuccessTarget) this.verifySuccessTarget.classList.remove("hidden")
      } else {
        const data = await res.json()
        this.showVerifyError(data.error || "Verification failed")
      }
    } catch {
      this.showVerifyError("Network error during verification.")
    }
  }

  showVerifyError(message) {
    if (this.hasVerifyPendingTarget) this.verifyPendingTarget.classList.add("hidden")
    if (this.hasVerifyErrorTarget) this.verifyErrorTarget.classList.remove("hidden")
    if (this.hasVerifyErrorMessageTarget) this.verifyErrorMessageTarget.textContent = message
  }
}
