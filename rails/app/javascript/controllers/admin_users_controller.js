import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["search", "userList"]

  connect() {
    this.page = 0
    this.limit = 20
    this.loadUsers()
  }

  search() {
    clearTimeout(this._debounce)
    this._debounce = setTimeout(() => {
      this.page = 0
      this.loadUsers()
    }, 300)
  }

  async loadUsers() {
    const query = this.hasSearchTarget ? this.searchTarget.value : ""
    const params = new URLSearchParams({ page: this.page, limit: this.limit })
    if (query) params.set("search", query)

    try {
      const res = await fetch(`/api/admin/users?${params}`, { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      this.renderUsers(json.data || json.users || [])
    } catch (e) {
      console.error("Failed to load users:", e)
    }
  }

  renderUsers(users) {
    if (!this.hasUserListTarget) return
    this.userListTarget.textContent = ""

    if (users.length === 0) {
      const tr = document.createElement("tr")
      const td = document.createElement("td")
      td.colSpan = 5
      td.className = "px-4 py-8 text-center text-zinc-400 dark:text-zinc-500"
      td.textContent = "No users found"
      tr.appendChild(td)
      this.userListTarget.appendChild(tr)
      return
    }

    users.forEach(user => {
      const tr = document.createElement("tr")
      tr.className = "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"

      // User cell
      const tdUser = document.createElement("td")
      tdUser.className = "px-4 py-3"
      const nameDiv = document.createElement("div")
      nameDiv.className = "font-medium text-zinc-900 dark:text-zinc-100"
      nameDiv.textContent = user.name || user.email
      const emailDiv = document.createElement("div")
      emailDiv.className = "text-xs text-zinc-500 dark:text-zinc-400"
      emailDiv.textContent = user.email
      tdUser.appendChild(nameDiv)
      tdUser.appendChild(emailDiv)

      // Plan cell
      const tdPlan = document.createElement("td")
      tdPlan.className = "px-4 py-3"
      const planBadge = document.createElement("span")
      const plan = user.effective_plan || user.plan || "free"
      planBadge.className = plan === "pro"
        ? "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-accent dark:bg-accent text-primary dark:text-primary"
        : "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
      planBadge.textContent = plan
      tdPlan.appendChild(planBadge)

      // Status cell
      const tdStatus = document.createElement("td")
      tdStatus.className = "px-4 py-3"
      const statusBadge = document.createElement("span")
      const active = !user.disabled
      statusBadge.className = active
        ? "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
        : "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
      statusBadge.textContent = active ? "Active" : "Disabled"
      tdStatus.appendChild(statusBadge)

      // Joined cell
      const tdJoined = document.createElement("td")
      tdJoined.className = "px-4 py-3 text-zinc-500 dark:text-zinc-400"
      tdJoined.textContent = user.created_at ? new Date(user.created_at).toLocaleDateString() : ""

      // Actions cell
      const tdActions = document.createElement("td")
      tdActions.className = "px-4 py-3 text-right"
      const viewLink = document.createElement("a")
      viewLink.href = `/admin/users/${user.id}`
      viewLink.className = "text-primary dark:text-primary hover:text-primary/90 dark:hover:text-primary text-xs font-medium"
      viewLink.textContent = "View"
      tdActions.appendChild(viewLink)

      tr.appendChild(tdUser)
      tr.appendChild(tdPlan)
      tr.appendChild(tdStatus)
      tr.appendChild(tdJoined)
      tr.appendChild(tdActions)
      this.userListTarget.appendChild(tr)
    })
  }
}
