import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["totalUsers", "proUsers", "newToday", "revenue", "activity"]

  connect() {
    this.loadDashboard()
  }

  async loadDashboard() {
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      const data = json.data || json

      if (this.hasTotalUsersTarget) this.totalUsersTarget.textContent = data.total_users ?? 0
      if (this.hasProUsersTarget) this.proUsersTarget.textContent = data.pro_users ?? 0
      if (this.hasNewTodayTarget) this.newTodayTarget.textContent = data.new_users_today ?? 0
      if (this.hasRevenueTarget) this.revenueTarget.textContent = `$${((data.active_subscriptions ?? 0) * 9.99).toFixed(0)}`

      if (this.hasActivityTarget) {
        const logs = data.recent_admin_logs || []
        const signups = data.recent_signups || []

        this.activityTarget.textContent = ""

        if (logs.length === 0 && signups.length === 0) {
          const p = document.createElement("p")
          p.className = "text-sm text-zinc-400 text-center py-4"
          p.textContent = "No recent activity"
          this.activityTarget.appendChild(p)
          return
        }

        const container = document.createElement("div")
        container.className = "space-y-3"

        signups.forEach(u => {
          const row = document.createElement("div")
          row.className = "flex items-center justify-between text-sm"
          const label = document.createElement("span")
          label.className = "text-zinc-700 dark:text-zinc-300"
          label.textContent = `New user: ${u.email}`
          const time = document.createElement("span")
          time.className = "text-xs text-zinc-400"
          time.textContent = this.timeAgo(u.created_at)
          row.appendChild(label)
          row.appendChild(time)
          container.appendChild(row)
        })

        logs.forEach(l => {
          const row = document.createElement("div")
          row.className = "flex items-center justify-between text-sm"
          const label = document.createElement("span")
          label.className = "text-zinc-700 dark:text-zinc-300"
          label.textContent = l.action
          const time = document.createElement("span")
          time.className = "text-xs text-zinc-400"
          time.textContent = this.timeAgo(l.created_at)
          row.appendChild(label)
          row.appendChild(time)
          container.appendChild(row)
        })

        this.activityTarget.appendChild(container)
      }
    } catch (e) {
      console.error("Dashboard load failed:", e)
    }
  }

  timeAgo(dateStr) {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }
}
