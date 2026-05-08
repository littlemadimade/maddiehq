import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["logList", "actionFilter", "targetFilter", "dateFrom", "dateTo", "search", "count", "prevBtn", "nextBtn"]

  connect() {
    this.page = 1
    this.perPage = 25
    this.loadLogs()
  }

  applyFilters() {
    this.page = 1
    this.loadLogs()
  }

  prevPage() {
    if (this.page > 1) {
      this.page--
      this.loadLogs()
    }
  }

  nextPage() {
    this.page++
    this.loadLogs()
  }

  async loadLogs() {
    const params = new URLSearchParams()
    params.set("limit", this.perPage)
    params.set("page", this.page)

    if (this.hasActionFilterTarget && this.actionFilterTarget.value) {
      params.set("action", this.actionFilterTarget.value)
    }
    if (this.hasTargetFilterTarget && this.targetFilterTarget.value) {
      params.set("target_type", this.targetFilterTarget.value)
    }
    if (this.hasDateFromTarget && this.dateFromTarget.value) {
      params.set("from", this.dateFromTarget.value)
    }
    if (this.hasDateToTarget && this.dateToTarget.value) {
      params.set("to", this.dateToTarget.value)
    }
    if (this.hasSearchTarget && this.searchTarget.value.trim()) {
      params.set("q", this.searchTarget.value.trim())
    }

    try {
      const res = await fetch(`/api/admin/logs?${params}`, { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      const logs = json.data || json.logs || []
      const total = json.total || logs.length

      if (this.hasCountTarget) {
        this.countTarget.textContent = `Showing ${logs.length} of ${total} logs`
      }

      // Pagination buttons
      if (this.hasPrevBtnTarget) {
        this.prevBtnTarget.classList.toggle("hidden", this.page <= 1)
      }
      if (this.hasNextBtnTarget) {
        this.nextBtnTarget.classList.toggle("hidden", logs.length < this.perPage)
      }

      this.renderLogs(logs)
    } catch (e) {
      console.error("Failed to load logs:", e)
    }
  }

  renderLogs(logs) {
    if (!this.hasLogListTarget) return
    this.logListTarget.textContent = ""

    if (logs.length === 0) {
      const tr = document.createElement("tr")
      const td = document.createElement("td")
      td.colSpan = 5
      td.className = "px-4 py-8 text-center text-zinc-400 dark:text-zinc-500"
      td.textContent = "No logs found"
      tr.appendChild(td)
      this.logListTarget.appendChild(tr)
      return
    }

    logs.forEach(log => {
      const tr = document.createElement("tr")
      tr.className = "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"

      const cells = [
        log.created_at ? new Date(log.created_at).toLocaleString() : "",
        log.admin_email || log.admin_id || "",
        log.action || "",
        log.target_type ? `${log.target_type}:${log.target_id || ""}` : "",
        typeof log.details === "object" ? JSON.stringify(log.details) : (log.details || "")
      ]

      cells.forEach(text => {
        const td = document.createElement("td")
        td.className = "px-4 py-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
        td.textContent = text
        tr.appendChild(td)
      })

      this.logListTarget.appendChild(tr)
    })
  }
}
