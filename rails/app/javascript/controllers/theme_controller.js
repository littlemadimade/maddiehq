import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  toggle() {
    const isDark = document.documentElement.classList.contains("dark")
    if (isDark) {
      this.setLight()
    } else {
      this.setDark()
    }
  }

  setLight() {
    document.documentElement.classList.remove("dark")
    this._persist("light")
  }

  setDark() {
    document.documentElement.classList.add("dark")
    this._persist("dark")
  }

  setSystem() {
    this._persist("system")
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  _persist(value) {
    localStorage.setItem("theme", value)
    document.cookie = "maddiehq-theme=" + value + ";path=/;max-age=31536000;SameSite=Lax"
  }
}
