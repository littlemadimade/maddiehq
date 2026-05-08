import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["signups", "revenue", "plans", "providers"]

  connect() {
    this.loadGrowth()
    this.loadRevenue()
    this.loadAnalytics()
  }

  async loadGrowth() {
    try {
      const res = await fetch("/api/admin/analytics/growth", { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      const data = json.data || json

      if (this.hasSignupsTarget) {
        this.signupsTarget.textContent = ""
        const container = document.createElement("div")
        container.className = "space-y-2"

        const stats = document.createElement("div")
        stats.className = "grid grid-cols-3 gap-4 mb-4"
        const items = [
          { label: "DAU", value: data.dau ?? 0 },
          { label: "WAU", value: data.wau ?? 0 },
          { label: "MAU", value: data.mau ?? 0 }
        ]
        items.forEach(item => {
          const div = document.createElement("div")
          div.className = "text-center"
          const val = document.createElement("div")
          val.className = "text-xl font-bold text-zinc-900 dark:text-zinc-100"
          val.textContent = item.value
          const lbl = document.createElement("div")
          lbl.className = "text-xs text-zinc-500"
          lbl.textContent = item.label
          div.appendChild(val)
          div.appendChild(lbl)
          stats.appendChild(div)
        })
        container.appendChild(stats)

        const daily = data.signups_by_day || []
        if (daily.length > 0) {
          const max = Math.max(...daily.map(d => d.count), 1)
          daily.slice(-14).forEach(d => {
            const row = document.createElement("div")
            row.className = "flex items-center gap-2 text-xs"
            const dateLabel = document.createElement("span")
            dateLabel.className = "w-16 text-zinc-500 shrink-0"
            dateLabel.textContent = d.date ? d.date.slice(5) : ""
            const barWrap = document.createElement("div")
            barWrap.className = "flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-4 overflow-hidden"
            const bar = document.createElement("div")
            bar.className = "bg-primary h-full rounded-full"
            bar.style.width = `${(d.count / max) * 100}%`
            barWrap.appendChild(bar)
            const countLabel = document.createElement("span")
            countLabel.className = "w-6 text-right text-zinc-500"
            countLabel.textContent = d.count
            row.appendChild(dateLabel)
            row.appendChild(barWrap)
            row.appendChild(countLabel)
            container.appendChild(row)
          })
        }
        this.signupsTarget.appendChild(container)
      }
    } catch (e) { console.error("Growth load failed:", e) }
  }

  async loadRevenue() {
    try {
      const res = await fetch("/api/admin/analytics/revenue", { credentials: "same-origin" })
      if (!res.ok) return
      const json2 = await res.json()
      const data = json2.data || json2

      if (this.hasRevenueTarget) {
        this.revenueTarget.textContent = ""
        const container = document.createElement("div")
        container.className = "space-y-4"

        const mrr = document.createElement("div")
        mrr.className = "text-center"
        const mrrVal = document.createElement("div")
        mrrVal.className = "text-3xl font-bold text-zinc-900 dark:text-zinc-100"
        mrrVal.textContent = `$${(data.mrr ?? 0).toFixed(2)}`
        const mrrLabel = document.createElement("div")
        mrrLabel.className = "text-xs text-zinc-500"
        mrrLabel.textContent = "Monthly Recurring Revenue"
        mrr.appendChild(mrrVal)
        mrr.appendChild(mrrLabel)
        container.appendChild(mrr)

        const breakdown = data.plan_breakdown || {}
        Object.entries(breakdown).forEach(([plan, count]) => {
          const row = document.createElement("div")
          row.className = "flex justify-between text-sm"
          const label = document.createElement("span")
          label.className = "text-zinc-600 dark:text-zinc-400 capitalize"
          label.textContent = plan
          const val = document.createElement("span")
          val.className = "font-medium text-zinc-900 dark:text-zinc-100"
          val.textContent = count
          row.appendChild(label)
          row.appendChild(val)
          container.appendChild(row)
        })

        this.revenueTarget.appendChild(container)
      }
    } catch (e) { console.error("Revenue load failed:", e) }
  }

  async loadAnalytics() {
    try {
      const res = await fetch("/api/admin/analytics", { credentials: "same-origin" })
      if (!res.ok) return
      const json3 = await res.json()
      const data = json3.data || json3

      if (this.hasPlansTarget) {
        this.plansTarget.textContent = ""
        const container = document.createElement("div")
        container.className = "space-y-3"
        const breakdown = data.plan_breakdown || {}
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1
        Object.entries(breakdown).forEach(([plan, count]) => {
          const row = document.createElement("div")
          const label = document.createElement("div")
          label.className = "flex justify-between text-sm mb-1"
          const name = document.createElement("span")
          name.className = "text-zinc-600 dark:text-zinc-400 capitalize"
          name.textContent = plan
          const pct = document.createElement("span")
          pct.className = "text-zinc-500"
          pct.textContent = `${count} (${Math.round(count / total * 100)}%)`
          label.appendChild(name)
          label.appendChild(pct)
          const barWrap = document.createElement("div")
          barWrap.className = "bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden"
          const bar = document.createElement("div")
          bar.className = plan === "pro" ? "bg-primary h-full rounded-full" : "bg-zinc-400 h-full rounded-full"
          bar.style.width = `${(count / total) * 100}%`
          barWrap.appendChild(bar)
          row.appendChild(label)
          row.appendChild(barWrap)
          container.appendChild(row)
        })
        this.plansTarget.appendChild(container)
      }

      if (this.hasProvidersTarget) {
        this.providersTarget.textContent = ""
        const p = document.createElement("p")
        p.className = "text-sm text-zinc-500 text-center py-4"
        p.textContent = `${data.total_users ?? 0} total users, ${data.active_users ?? 0} active`
        this.providersTarget.appendChild(p)
      }
    } catch (e) { console.error("Analytics load failed:", e) }
  }
}
