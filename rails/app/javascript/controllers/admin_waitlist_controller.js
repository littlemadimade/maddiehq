import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "list", "searchInput", "statusFilter", "selectAll", "bulkInviteBtn",
    "statTotal", "statWaiting", "statInvited", "statRegistered",
    "count", "prevBtn", "nextBtn"
  ]

  connect() {
    this.page = 1
    this.perPage = 50
    this.selected = new Set()
    this.loadWaitlist()
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  applyFilters() {
    this.page = 1
    this.loadWaitlist()
  }

  prevPage() {
    if (this.page > 1) { this.page--; this.loadWaitlist() }
  }

  nextPage() {
    this.page++
    this.loadWaitlist()
  }

  async loadWaitlist() {
    const params = new URLSearchParams()
    params.set("page", this.page)
    params.set("per_page", this.perPage)

    const status = this.hasStatusFilterTarget ? this.statusFilterTarget.value : ""
    if (status) params.set("status", status)

    try {
      const res = await fetch(`/api/admin/waitlist?${params}`, { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      const entries = json.data || []
      const total = json.total || entries.length

      // Update stats (count all statuses via separate calls if needed, or derive)
      this.updateStats(entries, total)

      if (this.hasCountTarget) {
        this.countTarget.textContent = `Showing ${entries.length} of ${total}`
      }
      if (this.hasPrevBtnTarget) this.prevBtnTarget.classList.toggle("hidden", this.page <= 1)
      if (this.hasNextBtnTarget) this.nextBtnTarget.classList.toggle("hidden", entries.length < this.perPage)

      this.renderList(entries)
      this.updateBulkButton()
    } catch (e) {
      console.error("Failed to load waitlist:", e)
    }
  }

  updateStats(entries, total) {
    // Load stats for all statuses
    this.loadStatCount("", "statTotal")
    this.loadStatCount("waiting", "statWaiting")
    this.loadStatCount("invited", "statInvited")
    this.loadStatCount("registered", "statRegistered")
  }

  async loadStatCount(status, targetName) {
    const target = this[`has${targetName.charAt(0).toUpperCase() + targetName.slice(1)}Target`]
      ? this[`${targetName}Target`] : null
    if (!target) return

    try {
      const params = status ? `?status=${status}&per_page=1` : "?per_page=1"
      const res = await fetch(`/api/admin/waitlist${params}`, { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      target.textContent = json.total || 0
    } catch { /* silent */ }
  }

  renderList(entries) {
    if (!this.hasListTarget) return
    this.listTarget.textContent = ""
    const search = this.hasSearchInputTarget ? this.searchInputTarget.value.trim().toLowerCase() : ""

    const filtered = search
      ? entries.filter(e => e.email.toLowerCase().includes(search))
      : entries

    if (filtered.length === 0) {
      const tr = document.createElement("tr")
      const td = document.createElement("td")
      td.colSpan = 7
      td.className = "px-4 py-8 text-center text-zinc-400 dark:text-zinc-500"
      td.textContent = "No entries found"
      tr.appendChild(td)
      this.listTarget.appendChild(tr)
      return
    }

    filtered.forEach(entry => {
      const tr = document.createElement("tr")
      tr.className = "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"

      // Checkbox
      const checkTd = document.createElement("td")
      checkTd.className = "w-10 px-4 py-3"
      if (entry.status === "waiting") {
        const cb = document.createElement("input")
        cb.type = "checkbox"
        cb.className = "rounded border-zinc-300 dark:border-zinc-600"
        cb.checked = this.selected.has(entry.email)
        cb.addEventListener("change", () => {
          if (cb.checked) this.selected.add(entry.email)
          else this.selected.delete(entry.email)
          this.updateBulkButton()
        })
        checkTd.appendChild(cb)
      }
      tr.appendChild(checkTd)

      // Email
      const emailTd = document.createElement("td")
      emailTd.className = "px-4 py-3 text-zinc-700 dark:text-zinc-300"
      emailTd.textContent = entry.email
      tr.appendChild(emailTd)

      // Status badge
      const statusTd = document.createElement("td")
      statusTd.className = "px-4 py-3"
      const badge = document.createElement("span")
      const colors = {
        waiting: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
        invited: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
        registered: "bg-accent dark:bg-accent text-primary dark:text-primary"
      }
      badge.className = `inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colors[entry.status] || "bg-zinc-100 text-zinc-600"}`
      badge.textContent = entry.status
      statusTd.appendChild(badge)
      tr.appendChild(statusTd)

      // Referral code
      const refTd = document.createElement("td")
      refTd.className = "px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono"
      refTd.textContent = entry.referralCode || "-"
      tr.appendChild(refTd)

      // Referral count
      const refCountTd = document.createElement("td")
      refCountTd.className = "px-4 py-3 text-zinc-700 dark:text-zinc-300"
      refCountTd.textContent = entry.referralCount || 0
      tr.appendChild(refCountTd)

      // Joined date
      const dateTd = document.createElement("td")
      dateTd.className = "px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap"
      dateTd.textContent = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ""
      tr.appendChild(dateTd)

      // Actions
      const actionTd = document.createElement("td")
      actionTd.className = "px-4 py-3"
      if (entry.status === "waiting") {
        const inviteBtn = document.createElement("button")
        inviteBtn.className = "text-xs text-primary dark:text-primary hover:text-primary/90 font-medium"
        inviteBtn.textContent = "Invite"
        inviteBtn.addEventListener("click", () => this.inviteOne(entry.email))
        actionTd.appendChild(inviteBtn)
      }
      tr.appendChild(actionTd)

      this.listTarget.appendChild(tr)
    })
  }

  toggleAll() {
    if (!this.hasSelectAllTarget) return
    const checkAll = this.selectAllTarget.checked
    const checkboxes = this.listTarget.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach(cb => {
      cb.checked = checkAll
      // Simulate change
      const email = cb.closest("tr")?.querySelector("td:nth-child(2)")?.textContent
      if (email) {
        if (checkAll) this.selected.add(email)
        else this.selected.delete(email)
      }
    })
    this.updateBulkButton()
  }

  updateBulkButton() {
    if (this.hasBulkInviteBtnTarget) {
      if (this.selected.size > 0) {
        this.bulkInviteBtnTarget.classList.remove("hidden")
        this.bulkInviteBtnTarget.textContent = `Invite Selected (${this.selected.size})`
      } else {
        this.bulkInviteBtnTarget.classList.add("hidden")
      }
    }
  }

  async inviteOne(email) {
    try {
      const res = await fetch("/api/admin/waitlist/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        if (window.toast) window.toast(`Invited ${email}`, "success")
        this.selected.delete(email)
        this.loadWaitlist()
      } else {
        const data = await res.json()
        if (window.toast) window.toast(data.error || "Invite failed", "error")
      }
    } catch {
      if (window.toast) window.toast("Invite failed", "error")
    }
  }

  async bulkInvite() {
    if (this.selected.size === 0) return
    if (this.hasBulkInviteBtnTarget) {
      this.bulkInviteBtnTarget.disabled = true
      this.bulkInviteBtnTarget.textContent = "Inviting..."
    }

    const emails = [...this.selected]
    let successCount = 0

    for (const email of emails) {
      try {
        const res = await fetch("/api/admin/waitlist/invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.getCsrfToken()
          },
          body: JSON.stringify({ email })
        })
        if (res.ok) successCount++
      } catch { /* continue */ }
    }

    this.selected.clear()
    if (window.toast) window.toast(`Invited ${successCount} of ${emails.length}`, "success")
    this.loadWaitlist()
  }
}
