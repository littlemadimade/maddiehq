import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "email", "provider", "memberSince", "verifiedIcon", "verificationStatus",
    "planBadge", "billingButton",
    "mfaBadge", "mfaDescription", "mfaEnableForm", "mfaDisableForm",
    "mfaPassword", "mfaEnableButton", "mfaDisablePassword", "mfaDisableButton",
    "mfaQrSection", "mfaQrImage", "mfaSecret", "mfaVerifySection", "mfaVerifyCode", "mfaVerifyButton",
    "exportButton",
    "deleteModal", "deleteConfirmInput", "deleteButton",
    "avatarInitial"
  ]

  connect() {
    this.loadAccount()
    this.loadPlan()
    this.loadMfa()
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  async loadAccount() {
    try {
      const res = await fetch("/api/settings/account")
      if (!res.ok) return
      const data = await res.json()

      if (this.hasEmailTarget) this.emailTarget.textContent = data.email || "-"
      // Show avatar if the user has one
      if (data.image && this.hasAvatarInitialTarget) {
        const container = this.avatarInitialTarget.parentElement
        const preview = container?.querySelector("[data-file-upload-target='preview']")
        if (preview) {
          preview.src = data.image
          preview.classList.remove("hidden")
          this.avatarInitialTarget.classList.add("hidden")
        }
      }
      if (data.email && this.hasAvatarInitialTarget) {
        this.avatarInitialTarget.textContent = data.email[0].toUpperCase()
      }
      if (this.hasProviderTarget) {
        const labels = { google: "Google", github: "GitHub", credential: "Email" }
        this.providerTarget.textContent = labels[data.provider] || "Email"
      }
      if (this.hasMemberSinceTarget) {
        this.memberSinceTarget.textContent = data.created_at
          ? new Date(data.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : "-"
      }
      if (this.hasVerificationStatusTarget) {
        this.verificationStatusTarget.textContent = data.email_verified ? "Verified" : "Not verified"
      }
      if (this.hasVerifiedIconTarget && data.email_verified) {
        // Replace with check icon by creating new SVG element
        const newIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        newIcon.setAttribute("class", "w-4 h-4 text-primary dark:text-primary mt-0.5")
        newIcon.setAttribute("fill", "none")
        newIcon.setAttribute("viewBox", "0 0 24 24")
        newIcon.setAttribute("stroke", "currentColor")
        newIcon.setAttribute("stroke-width", "2")
        const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path")
        path1.setAttribute("d", "M22 11.08V12a10 10 0 11-5.93-9.14")
        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
        path2.setAttribute("points", "22 4 12 14.01 9 11.01")
        newIcon.appendChild(path1)
        newIcon.appendChild(path2)
        this.verifiedIconTarget.replaceWith(newIcon)
      }
    } catch {
      // silent
    }
  }

  async loadPlan() {
    try {
      const res = await fetch("/api/stripe/status")
      if (!res.ok) return
      const data = await res.json()
      const isPro = data.plan === "pro"

      if (this.hasPlanBadgeTarget) {
        if (isPro) {
          this.planBadgeTarget.textContent = "Pro"
          this.planBadgeTarget.className = "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-accent dark:bg-accent text-primary dark:text-primary"
        } else {
          this.planBadgeTarget.textContent = "Free"
        }
      }
      if (this.hasBillingButtonTarget) {
        if (isPro) {
          this.billingButtonTarget.textContent = "Manage Subscription"
          this.billingButtonTarget.dataset.action = "click->settings#manageSubscription"
        }
      }
    } catch {
      // silent
    }
  }

  async loadMfa() {
    try {
      const res = await fetch("/api/settings/account")
      if (!res.ok) return
      const data = await res.json()
      const enabled = !!data.twoFactorEnabled

      if (this.hasMfaBadgeTarget) {
        if (enabled) {
          this.mfaBadgeTarget.textContent = "Enabled"
          this.mfaBadgeTarget.className = "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
        }
      }
      if (this.hasMfaDescriptionTarget) {
        this.mfaDescriptionTarget.textContent = enabled
          ? "Your account is protected with authenticator app codes."
          : "Add an extra layer of security with TOTP codes."
      }
      if (enabled) {
        if (this.hasMfaEnableFormTarget) this.mfaEnableFormTarget.classList.add("hidden")
        if (this.hasMfaDisableFormTarget) this.mfaDisableFormTarget.classList.remove("hidden")
      }
    } catch {
      // silent
    }
  }

  async enableMfa() {
    const password = this.hasMfaPasswordTarget ? this.mfaPasswordTarget.value : ""
    if (!password) return

    if (this.hasMfaEnableButtonTarget) {
      this.mfaEnableButtonTarget.disabled = true
      this.mfaEnableButtonTarget.textContent = "Setting up..."
    }

    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ password })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to enable MFA")

      if (data.qrCode && this.hasMfaQrImageTarget) {
        // qrCode is raw SVG markup — render it inline
        this.mfaQrImageTarget.outerHTML = data.qrCode
      }
      if (data.secret && this.hasMfaSecretTarget) {
        this.mfaSecretTarget.textContent = ""
        const text = document.createTextNode("Or enter manually: ")
        const code = document.createElement("code")
        code.className = "bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs"
        code.textContent = data.secret
        this.mfaSecretTarget.appendChild(text)
        this.mfaSecretTarget.appendChild(code)
        this.mfaSecretTarget.classList.remove("hidden")
      }

      if (this.hasMfaEnableFormTarget) this.mfaEnableFormTarget.classList.add("hidden")
      if (this.hasMfaQrSectionTarget) this.mfaQrSectionTarget.classList.remove("hidden")
    } catch (e) {
      alert(e.message)
    } finally {
      if (this.hasMfaEnableButtonTarget) {
        this.mfaEnableButtonTarget.disabled = false
        this.mfaEnableButtonTarget.textContent = "Enable MFA"
      }
    }
  }

  showVerifyStep() {
    if (this.hasMfaQrSectionTarget) this.mfaQrSectionTarget.classList.add("hidden")
    if (this.hasMfaVerifySectionTarget) this.mfaVerifySectionTarget.classList.remove("hidden")
  }

  showQrStep() {
    if (this.hasMfaVerifySectionTarget) this.mfaVerifySectionTarget.classList.add("hidden")
    if (this.hasMfaQrSectionTarget) this.mfaQrSectionTarget.classList.remove("hidden")
  }

  async verifyMfa() {
    const code = this.hasMfaVerifyCodeTarget ? this.mfaVerifyCodeTarget.value : ""
    if (code.length !== 6) return

    if (this.hasMfaVerifyButtonTarget) {
      this.mfaVerifyButtonTarget.disabled = true
      this.mfaVerifyButtonTarget.textContent = "Verifying..."
    }

    try {
      const res = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ code })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Verification failed")

      window.location.reload()
    } catch (e) {
      alert(e.message)
    } finally {
      if (this.hasMfaVerifyButtonTarget) {
        this.mfaVerifyButtonTarget.disabled = false
        this.mfaVerifyButtonTarget.textContent = "Verify & Enable"
      }
    }
  }

  async disableMfa() {
    const password = this.hasMfaDisablePasswordTarget ? this.mfaDisablePasswordTarget.value : ""
    if (!password) return

    if (this.hasMfaDisableButtonTarget) {
      this.mfaDisableButtonTarget.disabled = true
      this.mfaDisableButtonTarget.textContent = "Disabling..."
    }

    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ password })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to disable MFA")

      window.location.reload()
    } catch (e) {
      alert(e.message)
    } finally {
      if (this.hasMfaDisableButtonTarget) {
        this.mfaDisableButtonTarget.disabled = false
        this.mfaDisableButtonTarget.textContent = "Disable MFA"
      }
    }
  }

  async manageBilling() {
    if (this.hasBillingButtonTarget) {
      this.billingButtonTarget.disabled = true
      this.billingButtonTarget.textContent = "Loading..."
    }

    try {
      const res = await fetch("/api/stripe/portal")
      if (res.ok) {
        const data = await res.json()
        if (data.url) window.location.href = data.url
      }
    } catch {
      alert("Could not open subscription portal")
    } finally {
      if (this.hasBillingButtonTarget) {
        this.billingButtonTarget.disabled = false
      }
    }
  }

  async manageSubscription() {
    this.manageBilling()
  }

  async exportData() {
    if (this.hasExportButtonTarget) {
      this.exportButtonTarget.disabled = true
      this.exportButtonTarget.textContent = "Exporting..."
    }

    try {
      const res = await fetch("/api/settings/export")
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `maddiehq-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Failed to export data")
    } finally {
      if (this.hasExportButtonTarget) {
        this.exportButtonTarget.disabled = false
        this.exportButtonTarget.textContent = "Export"
      }
    }
  }

  showDeleteModal() {
    if (this.hasDeleteModalTarget) this.deleteModalTarget.classList.remove("hidden")
  }

  hideDeleteModal() {
    if (this.hasDeleteModalTarget) this.deleteModalTarget.classList.add("hidden")
    if (this.hasDeleteConfirmInputTarget) this.deleteConfirmInputTarget.value = ""
  }

  async deleteAccount() {
    const confirmation = this.hasDeleteConfirmInputTarget ? this.deleteConfirmInputTarget.value : ""
    if (confirmation !== "DELETE") return

    if (this.hasDeleteButtonTarget) {
      this.deleteButtonTarget.disabled = true
      this.deleteButtonTarget.textContent = "Deleting..."
    }

    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ confirmation })
      })

      if (res.ok) {
        window.location.href = "/auth"
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete account")
      }
    } catch {
      alert("Failed to delete account")
    } finally {
      if (this.hasDeleteButtonTarget) {
        this.deleteButtonTarget.disabled = false
        this.deleteButtonTarget.textContent = "Delete Account"
      }
    }
  }
}
