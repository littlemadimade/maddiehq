import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dropdown", "badge", "list"]

  connect() {
    this._open = false
    this.loadNotifications()
    this._interval = setInterval(() => this.loadNotifications(), 30000)
    this._onClickOutside = (e) => {
      if (this._open && !this.element.contains(e.target)) this.close()
    }
    document.addEventListener("mousedown", this._onClickOutside)
  }

  disconnect() {
    clearInterval(this._interval)
    document.removeEventListener("mousedown", this._onClickOutside)
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  toggle() {
    this._open ? this.close() : this.open()
  }

  open() {
    if (this.hasDropdownTarget) this.dropdownTarget.classList.remove("hidden")
    this._open = true
  }

  close() {
    if (this.hasDropdownTarget) this.dropdownTarget.classList.add("hidden")
    this._open = false
  }

  async loadNotifications() {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return
      const data = await res.json()

      if (this.hasBadgeTarget) {
        const count = data.unreadCount || 0
        this.badgeTarget.textContent = count > 9 ? "9+" : count
        this.badgeTarget.classList.toggle("hidden", count === 0)
      }

      if (this.hasListTarget) {
        this._notifications = data.notifications || []
        this.renderList()
      }
    } catch {
      // silent
    }
  }

  renderList() {
    if (!this.hasListTarget) return
    this.listTarget.textContent = ""

    if (!this._notifications || this._notifications.length === 0) {
      const p = document.createElement("p")
      p.className = "px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
      p.textContent = "No notifications yet"
      this.listTarget.appendChild(p)
      return
    }

    this._notifications.forEach(n => {
      const div = document.createElement("div")
      div.className = "px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors" +
        (!n.read ? " bg-accent dark:bg-accent" : "")

      const title = document.createElement("p")
      title.className = "text-sm font-medium text-gray-900 dark:text-gray-100"
      title.textContent = n.title

      div.appendChild(title)

      if (n.message) {
        const msg = document.createElement("p")
        msg.className = "text-xs text-gray-500 dark:text-gray-400 mt-0.5"
        msg.textContent = n.message
        div.appendChild(msg)
      }

      const time = document.createElement("p")
      time.className = "text-xs text-gray-400 dark:text-gray-500 mt-1"
      time.textContent = this.timeAgo(n.created_at)
      div.appendChild(time)

      if (!n.read) {
        const btn = document.createElement("button")
        btn.className = "text-xs text-primary dark:text-primary hover:underline mt-1"
        btn.textContent = "Mark read"
        btn.addEventListener("click", () => this.markRead(n.id))
        div.appendChild(btn)
      }

      this.listTarget.appendChild(div)
    })
  }

  async markRead(id) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { "X-CSRF-Token": this.getCsrfToken() }
      })
      this.loadNotifications()
    } catch {
      // silent
    }
  }

  async markAllRead() {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "X-CSRF-Token": this.getCsrfToken() }
      })
      this.loadNotifications()
    } catch {
      // silent
    }
  }

  timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }
}
