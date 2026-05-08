import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "preview", "status", "initial"]
  static values = { saveUrl: String }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  trigger() {
    if (this.hasInputTarget) this.inputTarget.click()
  }

  async upload(event) {
    const file = event.target.files[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      if (window.toast) window.toast("File too large (max 10MB)", "error")
      return
    }

    if (this.hasStatusTarget) this.statusTarget.textContent = "Uploading..."

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "X-CSRF-Token": this.getCsrfToken() },
        body: formData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await res.json()
      const imageUrl = data.url

      // If saveUrl is configured, persist the URL to a profile field
      if (this.hasSaveUrlValue && this.saveUrlValue) {
        const saveRes = await fetch(this.saveUrlValue, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.getCsrfToken()
          },
          body: JSON.stringify({ image: imageUrl })
        })
        if (!saveRes.ok) throw new Error("Failed to save avatar")
      }

      // Show the image preview
      if (this.hasPreviewTarget && file.type.startsWith("image/")) {
        this.previewTarget.src = imageUrl
        this.previewTarget.classList.remove("hidden")
      }
      // Hide the initial/placeholder
      if (this.hasInitialTarget) {
        this.initialTarget.classList.add("hidden")
      }

      if (this.hasStatusTarget) this.statusTarget.textContent = "Upload"
      if (window.toast) window.toast("Avatar updated", "success")
    } catch (e) {
      if (this.hasStatusTarget) this.statusTarget.textContent = "Upload"
      if (window.toast) window.toast(e.message, "error")
    }
  }
}
