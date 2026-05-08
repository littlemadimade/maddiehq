import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["info", "actions"]

  connect() {
    const path = window.location.pathname
    const match = path.match(/\/admin\/users\/(.+)/)
    if (match) {
      this.userId = match[1]
      this.loadUser()
    }
  }

  async loadUser() {
    try {
      const res = await fetch(`/api/admin/users/${this.userId}`, { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      const user = json.data || json.user || json
      this.renderInfo(user)
      this.renderActions(user)
    } catch (e) {
      console.error("Failed to load user:", e)
    }
  }

  renderInfo(user) {
    if (!this.hasInfoTarget) return
    this.infoTarget.textContent = ""

    const fields = [
      { label: "ID", value: user.id },
      { label: "Email", value: user.email },
      { label: "Name", value: user.name || "—" },
      { label: "Plan", value: user.effective_plan || user.plan || "free" },
      { label: "Subscription", value: user.subscription_status || "inactive" },
      { label: "Email Verified", value: user.email_verified ? "Yes" : "No" },
      { label: "Admin", value: user.is_admin ? "Yes" : "No" },
      { label: "Disabled", value: user.disabled ? "Yes" : "No" },
      { label: "Stripe Customer", value: user.stripe_customer_id || "—" },
      { label: "Joined", value: user.created_at ? new Date(user.created_at).toLocaleDateString() : "" },
      { label: "Items", value: user.items_count ?? "—" },
    ]

    fields.forEach(f => {
      const row = document.createElement("div")
      row.className = "flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
      const label = document.createElement("span")
      label.className = "text-sm text-zinc-500 dark:text-zinc-400"
      label.textContent = f.label
      const value = document.createElement("span")
      value.className = "text-sm font-medium text-zinc-900 dark:text-zinc-100"
      value.textContent = f.value
      row.appendChild(label)
      row.appendChild(value)
      this.infoTarget.appendChild(row)
    })

    if (user.plan_override) {
      const override = document.createElement("div")
      override.className = "mt-4 p-3 bg-accent dark:bg-accent rounded-lg"
      const title = document.createElement("div")
      title.className = "text-xs font-semibold text-primary dark:text-primary mb-1"
      title.textContent = "Plan Override Active"
      const detail = document.createElement("div")
      detail.className = "text-xs text-primary dark:text-primary"
      detail.textContent = `${user.plan_override.plan} — ${user.plan_override.reason || "No reason"}`
      override.appendChild(title)
      override.appendChild(detail)
      this.infoTarget.appendChild(override)
    }
  }

  renderActions(user) {
    if (!this.hasActionsTarget) return
    this.actionsTarget.textContent = ""

    const actions = [
      { label: user.disabled ? "Enable User" : "Disable User", action: "toggleStatus", variant: user.disabled ? "success" : "danger" },
      { label: "Reset Password", action: "resetPassword", variant: "default" },
    ]

    actions.forEach(a => {
      const btn = document.createElement("button")
      btn.className = a.variant === "danger"
        ? "w-full px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        : a.variant === "success"
          ? "w-full px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          : "w-full px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      btn.textContent = a.label
      btn.dataset.action = `click->admin-user-detail#${a.action}`
      btn.dataset.userId = user.id
      btn.dataset.disabled = user.disabled ? "true" : "false"
      this.actionsTarget.appendChild(btn)
    })
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  async toggleStatus(event) {
    const disabled = event.currentTarget.dataset.disabled === "true"
    try {
      await fetch(`/api/admin/users/${this.userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.getCsrfToken() },
        body: JSON.stringify({ disabled: !disabled }),
        credentials: "same-origin"
      })
      this.loadUser()
    } catch (e) { console.error("Toggle status failed:", e) }
  }

  async resetPassword() {
    if (!confirm("Send a password reset to this user?")) return
    try {
      await fetch(`/api/admin/users/${this.userId}/reset-pw`, {
        method: "POST",
        headers: { "X-CSRF-Token": this.getCsrfToken() },
        credentials: "same-origin"
      })
      alert("Password reset initiated")
    } catch (e) { console.error("Reset password failed:", e) }
  }
}
