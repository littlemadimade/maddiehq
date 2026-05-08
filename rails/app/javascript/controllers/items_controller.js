import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "list", "newItemInput", "userEmail", "welcomeName",
    "upgradeBanner", "proBadge", "proMessage", "upgradeLink",
    "proOnlyBadge", "proContent", "freeContent"
  ]

  connect() {
    this.loadUser()
    this.loadItems()
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  async loadUser() {
    try {
      const res = await fetch("/api/settings/account")
      if (res.ok) {
        const data = await res.json()
        if (this.hasUserEmailTarget) this.userEmailTarget.textContent = data.email
        if (this.hasWelcomeNameTarget) this.welcomeNameTarget.textContent = `, ${data.email}`
      }

      const planRes = await fetch("/api/stripe/status")
      if (planRes.ok) {
        const planData = await planRes.json()
        const isPro = planData.plan === "pro"

        if (isPro) {
          if (this.hasProBadgeTarget) this.proBadgeTarget.classList.remove("hidden")
          if (this.hasProMessageTarget) this.proMessageTarget.classList.remove("hidden")
          if (this.hasProContentTarget) this.proContentTarget.classList.remove("hidden")
          if (this.hasFreeContentTarget) this.freeContentTarget.classList.add("hidden")
          if (this.hasProOnlyBadgeTarget) this.proOnlyBadgeTarget.classList.add("hidden")
        } else {
          if (this.hasUpgradeBannerTarget) this.upgradeBannerTarget.classList.remove("hidden")
          if (this.hasUpgradeLinkTarget) this.upgradeLinkTarget.classList.remove("hidden")
        }
      }
    } catch {
      // silent
    }
  }

  async loadItems() {
    try {
      const res = await fetch("/api/items")
      if (res.ok) {
        const data = await res.json()
        this.renderItems(data.items || data.data || [])
      }
    } catch {
      if (this.hasListTarget) {
        this.listTarget.textContent = ""
        const p = document.createElement("p")
        p.className = "text-sm text-red-500 text-center py-4"
        p.textContent = "Failed to load items."
        this.listTarget.appendChild(p)
      }
    }
  }

  renderItems(items) {
    if (!this.hasListTarget) return
    this.listTarget.textContent = ""

    if (items.length === 0) {
      const p = document.createElement("p")
      p.className = "text-sm text-gray-400 dark:text-gray-500 text-center py-4"
      p.textContent = "No items yet. Add one above!"
      this.listTarget.appendChild(p)
      return
    }

    items.forEach(item => {
      const row = document.createElement("div")
      row.className = "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"

      const label = document.createElement("span")
      label.className = "text-sm text-gray-900 dark:text-gray-100"
      label.textContent = item.name || item.title

      const btn = document.createElement("button")
      btn.className = "text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
      btn.dataset.action = "click->items#deleteItem"
      btn.dataset.itemId = item.id

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      svg.setAttribute("class", "w-4 h-4")
      svg.setAttribute("fill", "none")
      svg.setAttribute("viewBox", "0 0 24 24")
      svg.setAttribute("stroke", "currentColor")
      svg.setAttribute("stroke-width", "2")

      const path1 = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
      path1.setAttribute("points", "3 6 5 6 21 6")
      const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path")
      path2.setAttribute("d", "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2")

      svg.appendChild(path1)
      svg.appendChild(path2)
      btn.appendChild(svg)

      row.appendChild(label)
      row.appendChild(btn)
      this.listTarget.appendChild(row)
    })
  }

  async addItem(event) {
    event.preventDefault()
    if (!this.hasNewItemInputTarget) return

    const name = this.newItemInputTarget.value.trim()
    if (!name) return

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ name })
      })

      if (res.ok) {
        this.newItemInputTarget.value = ""
        this.loadItems()
      }
    } catch {
      // silent
    }
  }

  async deleteItem(event) {
    const id = event.currentTarget.dataset.itemId
    if (!id) return

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.getCsrfToken() }
      })
      if (res.ok) this.loadItems()
    } catch {
      // silent
    }
  }

  async logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.getCsrfToken() }
      })
    } catch {
      // silent
    }
    window.location.href = "/auth"
  }

  async upgrade() {
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST", headers: { "X-CSRF-Token": this.getCsrfToken() } })
      if (res.ok) {
        const data = await res.json()
        if (data.url) window.location.href = data.url
      }
    } catch {
      // silent
    }
  }

  dismissBanner() {
    if (this.hasUpgradeBannerTarget) this.upgradeBannerTarget.classList.add("hidden")
  }
}
