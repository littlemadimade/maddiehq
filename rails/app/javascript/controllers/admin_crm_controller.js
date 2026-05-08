import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["subscriberList"]

  connect() { this.loadSubscribers() }

  async loadSubscribers() {
    try {
      const res = await fetch("/api/admin/subscribers", { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      this.renderSubscribers(json.data || json.subscribers || [])
    } catch (e) {
      console.error("Failed to load subscribers:", e)
    }
  }

  renderSubscribers(subscribers) {
    if (!this.hasSubscriberListTarget) return
    this.subscriberListTarget.textContent = ""

    if (subscribers.length === 0) {
      const tr = document.createElement("tr")
      const td = document.createElement("td")
      td.colSpan = 3
      td.className = "px-4 py-8 text-center text-zinc-400 dark:text-zinc-500"
      td.textContent = "No subscribers yet"
      tr.appendChild(td)
      this.subscriberListTarget.appendChild(tr)
      return
    }

    subscribers.forEach(sub => {
      const tr = document.createElement("tr")
      tr.className = "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"

      const tdEmail = document.createElement("td")
      tdEmail.className = "px-4 py-3 text-zinc-900 dark:text-zinc-100"
      tdEmail.textContent = sub.email

      const tdDate = document.createElement("td")
      tdDate.className = "px-4 py-3 text-zinc-500 dark:text-zinc-400"
      tdDate.textContent = sub.created_at ? new Date(sub.created_at).toLocaleDateString() : ""

      const tdActions = document.createElement("td")
      tdActions.className = "px-4 py-3 text-right"
      const delBtn = document.createElement("button")
      delBtn.className = "text-red-600 dark:text-red-400 hover:text-red-700 text-xs font-medium"
      delBtn.textContent = "Remove"
      delBtn.dataset.id = sub.id
      delBtn.dataset.action = "click->admin-crm#removeSubscriber"
      tdActions.appendChild(delBtn)

      tr.appendChild(tdEmail)
      tr.appendChild(tdDate)
      tr.appendChild(tdActions)
      this.subscriberListTarget.appendChild(tr)
    })
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  async removeSubscriber(event) {
    const id = event.currentTarget.dataset.id
    if (!confirm("Remove this subscriber?")) return
    try {
      await fetch(`/api/admin/subscribers/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.getCsrfToken() },
        credentials: "same-origin"
      })
      this.loadSubscribers()
    } catch (e) { console.error("Remove failed:", e) }
  }
}
