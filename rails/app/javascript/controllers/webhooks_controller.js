import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["list", "urlInput", "eventsInput", "deliveriesContainer"]

  connect() {
    this.loadWebhooks()
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  async loadWebhooks() {
    try {
      const res = await fetch("/api/webhooks")
      if (!res.ok) return
      const data = await res.json()
      this._webhooks = data.webhooks || []
      this.renderList()
    } catch {
      // silent
    }
  }

  renderList() {
    if (!this.hasListTarget) return
    this.listTarget.textContent = ""

    if (this._webhooks.length === 0) {
      const p = document.createElement("p")
      p.className = "text-sm text-gray-500 dark:text-gray-400 text-center py-2"
      p.textContent = "No webhooks configured."
      this.listTarget.appendChild(p)
      return
    }

    this._webhooks.forEach(wh => {
      const row = document.createElement("div")
      row.className = "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"

      const info = document.createElement("div")
      info.className = "flex-1 min-w-0"
      const url = document.createElement("p")
      url.className = "text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
      url.textContent = wh.url
      info.appendChild(url)

      let events = "all"
      try { const e = JSON.parse(wh.events); events = e.length === 0 ? "all" : e.join(", ") } catch {}
      const evSpan = document.createElement("p")
      evSpan.className = "text-xs text-gray-500 dark:text-gray-400 mt-0.5"
      evSpan.textContent = `Events: ${events}`
      info.appendChild(evSpan)
      row.appendChild(info)

      const actions = document.createElement("div")
      actions.className = "flex items-center gap-1 ml-2"

      const deliveriesBtn = document.createElement("button")
      deliveriesBtn.className = "p-1.5 text-gray-400 hover:text-blue-500 transition-colors text-xs"
      deliveriesBtn.textContent = "Deliveries"
      deliveriesBtn.addEventListener("click", () => this.toggleDeliveries(wh.id, row))
      actions.appendChild(deliveriesBtn)

      const testBtn = document.createElement("button")
      testBtn.className = "p-1.5 text-gray-400 hover:text-primary transition-colors text-xs"
      testBtn.textContent = "Test"
      testBtn.addEventListener("click", () => this.testWebhook(wh.id))
      actions.appendChild(testBtn)

      const delBtn = document.createElement("button")
      delBtn.className = "p-1.5 text-gray-400 hover:text-red-500 transition-colors text-xs"
      delBtn.textContent = "Delete"
      delBtn.addEventListener("click", () => this.deleteWebhook(wh.id))
      actions.appendChild(delBtn)

      row.appendChild(actions)
      this.listTarget.appendChild(row)
    })
  }

  async addWebhook(event) {
    event.preventDefault()
    const url = this.hasUrlInputTarget ? this.urlInputTarget.value.trim() : ""
    if (!url) return

    const eventsStr = this.hasEventsInputTarget ? this.eventsInputTarget.value.trim() : ""
    const events = eventsStr ? eventsStr.split(",").map(e => e.trim()).filter(Boolean) : []

    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ url, events })
      })

      if (res.ok) {
        if (this.hasUrlInputTarget) this.urlInputTarget.value = ""
        if (this.hasEventsInputTarget) this.eventsInputTarget.value = ""
        this.loadWebhooks()
        if (window.toast) window.toast("Webhook created", "success")
      } else {
        const data = await res.json()
        if (window.toast) window.toast(data.error || "Failed to create webhook", "error")
      }
    } catch {
      if (window.toast) window.toast("Failed to create webhook", "error")
    }
  }

  async testWebhook(id) {
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, {
        method: "POST",
        headers: { "X-CSRF-Token": this.getCsrfToken() }
      })
      const data = await res.json()
      if (data.delivery?.success) {
        if (window.toast) window.toast("Test delivered successfully", "success")
      } else {
        if (window.toast) window.toast(data.error || "Test failed", "error")
      }
    } catch {
      if (window.toast) window.toast("Test failed", "error")
    }
  }

  async toggleDeliveries(id, row) {
    // Check if deliveries panel already exists below this row
    const existing = row.nextElementSibling
    if (existing && existing.dataset.deliveriesFor === String(id)) {
      existing.remove()
      return
    }

    try {
      const res = await fetch(`/api/webhooks/${id}/deliveries`)
      if (!res.ok) return
      const data = await res.json()
      const deliveries = data.deliveries || []

      const panel = document.createElement("div")
      panel.dataset.deliveriesFor = id
      panel.className = "bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 space-y-2"

      if (deliveries.length === 0) {
        const msg = document.createElement("p")
        msg.className = "text-xs text-gray-500 dark:text-gray-400 text-center"
        msg.textContent = "No deliveries yet."
        panel.appendChild(msg)
      } else {
        deliveries.slice(0, 10).forEach(d => {
          const item = document.createElement("div")
          item.className = "flex items-center justify-between text-xs"

          const eventSpan = document.createElement("span")
          eventSpan.className = "font-medium text-gray-700 dark:text-gray-300"
          eventSpan.textContent = d.event
          item.appendChild(eventSpan)

          const rightSpan = document.createElement("span")
          rightSpan.className = "flex items-center gap-1.5"

          const statusSpan = document.createElement("span")
          statusSpan.className = d.success ? "text-primary" : "text-red-500"
          statusSpan.textContent = `${d.success ? "\u2713" : "\u2717"} ${d.responseStatus || "\u2014"}`
          rightSpan.appendChild(statusSpan)

          const dateSpan = document.createElement("span")
          dateSpan.className = "text-gray-400"
          dateSpan.textContent = new Date(d.createdAt || d.created_at).toLocaleString()
          rightSpan.appendChild(dateSpan)

          item.appendChild(rightSpan)
          panel.appendChild(item)
        })
      }

      row.after(panel)
    } catch {
      if (window.toast) window.toast("Failed to load deliveries", "error")
    }
  }

  async deleteWebhook(id) {
    try {
      await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.getCsrfToken() }
      })
      this.loadWebhooks()
      if (window.toast) window.toast("Webhook deleted", "success")
    } catch {
      if (window.toast) window.toast("Failed to delete webhook", "error")
    }
  }
}
