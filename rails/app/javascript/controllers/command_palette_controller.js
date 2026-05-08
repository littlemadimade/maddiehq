import { Controller } from "@hotwired/stimulus"

// Static SVG icon markup (matching lucide icons in the Node app).
// These are hardcoded constants — never user input. We parse them once via
// DOMParser into detached <svg> nodes and `.cloneNode(true)` them on every
// render, which avoids using innerHTML entirely.
const ICON_MARKUP = {
  sprout: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 2C12 2 8 6 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 6 12 2 12 2Z"/><path d="M12 14V22"/><path d="M8 18H16"/></svg>',
  settings: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  logout: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  sun: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  moon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
  monitor: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  search: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  fileText: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  enter: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 01-4 4H4"/></svg>',
}

// Parse each icon template once at module load into a detached <svg> node
// we can clone on every render. No innerHTML anywhere at runtime.
const ICON_TEMPLATES = Object.fromEntries(
  Object.entries(ICON_MARKUP).map(([name, markup]) => {
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml")
    return [name, doc.documentElement]
  })
)

function cloneIcon(name) {
  const tpl = ICON_TEMPLATES[name]
  return tpl ? tpl.cloneNode(true) : null
}

const COMMANDS = [
  { id: "nav-dashboard", label: "Dashboard", category: "Navigation", icon: "sprout", keywords: ["home", "app", "main"], url: "/app" },
  { id: "nav-settings", label: "Settings", category: "Navigation", icon: "settings", keywords: ["preferences", "account", "profile"], url: "/settings" },
  { id: "action-signout", label: "Sign Out", category: "Actions", icon: "logout", keywords: ["logout", "log out", "exit"], action: "signOut" },
  { id: "action-theme-light", label: "Switch to Light Mode", category: "Actions", icon: "sun", keywords: ["theme", "appearance"], action: "setLight" },
  { id: "action-theme-dark", label: "Switch to Dark Mode", category: "Actions", icon: "moon", keywords: ["theme", "appearance"], action: "setDark" },
  { id: "action-theme-system", label: "Use System Theme", category: "Actions", icon: "monitor", keywords: ["theme", "appearance", "auto"], action: "setSystem" },
  { id: "search-items", label: "Search Items", category: "Search", icon: "search", keywords: ["find", "query", "fts", "full-text"], action: "searchMode" },
]

// Accessible Command Palette (⌘K / Ctrl+K)
//
// Implements the WAI-ARIA 1.2 combobox + listbox pattern:
//   - The dialog has role="dialog", aria-modal, and an aria-label
//   - The search input has role="combobox", aria-controls -> listbox,
//     aria-expanded, and aria-activedescendant pointing at the focused option
//   - The results have role="listbox", with role="option" + aria-selected
//     on each item so screen readers announce the active result as the user
//     arrows through
//   - Tab / Shift+Tab are trapped inside the dialog
//   - Esc closes and restores focus to the element that opened the palette
export default class extends Controller {
  static targets = ["modal", "input", "list"]

  connect() {
    this._onKeydown = this._handleKeydown.bind(this)
    document.addEventListener("keydown", this._onKeydown)
    this._filtered = COMMANDS
    this._selectedIndex = 0
    this._searchMode = false
    this._searchTimer = null
    this._searchResults = []
    this._previousActive = null

    // Wire ARIA roles on the static markup (idempotent).
    if (this.hasModalTarget) {
      this.modalTarget.setAttribute("role", "dialog")
      this.modalTarget.setAttribute("aria-modal", "true")
      this.modalTarget.setAttribute("aria-label", "Command palette")
    }
    if (this.hasInputTarget) {
      this.inputTarget.setAttribute("role", "combobox")
      this.inputTarget.setAttribute("aria-autocomplete", "list")
      this.inputTarget.setAttribute("aria-expanded", "false")
      if (this.hasListTarget) {
        const listId = this.listTarget.id || "command-palette-list"
        this.listTarget.id = listId
        this.listTarget.setAttribute("role", "listbox")
        this.listTarget.setAttribute("aria-label", "Results")
        this.inputTarget.setAttribute("aria-controls", listId)
      }
    }
  }

  disconnect() {
    document.removeEventListener("keydown", this._onKeydown)
  }

  _handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      this._toggle()
      return
    }
    if (!this._isOpen()) return

    const totalResults = this._searchMode ? this._searchResults.length : this._filtered.length

    if (e.key === "Escape") {
      e.preventDefault()
      this._close()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      this._selectedIndex = Math.min(this._selectedIndex + 1, Math.max(totalResults - 1, 0))
      this._renderList()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0)
      this._renderList()
    } else if (e.key === "Home") {
      e.preventDefault()
      this._selectedIndex = 0
      this._renderList()
    } else if (e.key === "End") {
      e.preventDefault()
      this._selectedIndex = Math.max(totalResults - 1, 0)
      this._renderList()
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (!this._searchMode && this._filtered[this._selectedIndex]) {
        this._execute(this._filtered[this._selectedIndex])
      }
    } else if (e.key === "Tab") {
      this._trapFocus(e)
    }
  }

  _trapFocus(event) {
    if (!this.hasModalTarget) return
    const focusables = Array.from(this.modalTarget.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input:not([disabled]):not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null)
    if (focusables.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  _toggle() {
    this._isOpen() ? this._close() : this._open()
  }

  _isOpen() {
    return !this.modalTarget.classList.contains("hidden")
  }

  _open() {
    this._previousActive = document.activeElement
    this.modalTarget.classList.remove("hidden")
    this.inputTarget.value = ""
    this._searchMode = false
    this._searchResults = []
    this._filtered = COMMANDS
    this._selectedIndex = 0
    this.inputTarget.setAttribute("aria-expanded", "true")
    this._renderList()
    requestAnimationFrame(() => this.inputTarget.focus())
  }

  _close() {
    this.modalTarget.classList.add("hidden")
    this.inputTarget.setAttribute("aria-expanded", "false")
    this.inputTarget.removeAttribute("aria-activedescendant")
    if (this._previousActive && typeof this._previousActive.focus === "function") {
      this._previousActive.focus()
    }
    this._previousActive = null
  }

  filter() {
    const q = this.inputTarget.value

    if (q.startsWith(">")) {
      this._searchMode = true
      const searchTerm = q.slice(1).trim()
      if (this._searchTimer) clearTimeout(this._searchTimer)
      if (searchTerm.length >= 2) {
        this._searchTimer = setTimeout(async () => {
          try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
            if (res.ok) {
              const data = await res.json()
              this._searchResults = data.results || []
              this._selectedIndex = 0
              this._renderList()
            }
          } catch {
            this._searchResults = []
            this._renderList()
          }
        }, 200)
      } else {
        this._searchResults = []
        this._renderList()
      }
      return
    }

    this._searchMode = false
    this._searchResults = []
    const lower = q.toLowerCase().trim()
    if (!lower) {
      this._filtered = COMMANDS
    } else {
      this._filtered = COMMANDS.filter(cmd => {
        const haystack = [cmd.label, cmd.category, ...cmd.keywords].join(" ").toLowerCase()
        return haystack.includes(lower)
      })
    }
    this._selectedIndex = 0
    this._renderList()
  }

  _renderList() {
    const list = this.listTarget
    list.textContent = ""

    if (this._searchMode) {
      if (this._searchResults.length === 0) {
        const empty = document.createElement("div")
        empty.className = "px-4 py-8 text-center text-sm text-muted-foreground"
        empty.textContent = this.inputTarget.value.slice(1).trim().length < 2
          ? "Type at least 2 characters to search..."
          : "No items found"
        list.appendChild(empty)
        this.inputTarget.removeAttribute("aria-activedescendant")
        return
      }

      const header = document.createElement("div")
      header.className = "px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider"
      header.textContent = "Search Results"
      list.appendChild(header)

      this._searchResults.forEach((item, i) => {
        const btn = this._createResultButton(i, `cp-result-${i}`, () => {})

        const icon = document.createElement("span")
        icon.className = "flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground"
        icon.setAttribute("aria-hidden", "true")
        const svg = cloneIcon("fileText")
        if (svg) icon.appendChild(svg)
        btn.appendChild(icon)

        const content = document.createElement("div")
        content.className = "flex-1 min-w-0"
        const name = document.createElement("p")
        name.className = "font-medium truncate"
        name.textContent = item.name
        content.appendChild(name)
        if (item.description) {
          const desc = document.createElement("p")
          desc.className = "text-xs text-muted-foreground truncate"
          desc.textContent = item.description
          content.appendChild(desc)
        }
        btn.appendChild(content)
        list.appendChild(btn)
      })
      this._syncActiveDescendant()
      return
    }

    if (this._filtered.length === 0) {
      const empty = document.createElement("div")
      empty.className = "px-4 py-8 text-center text-sm text-muted-foreground"
      empty.textContent = "No commands found"
      list.appendChild(empty)
      this.inputTarget.removeAttribute("aria-activedescendant")
      return
    }

    const grouped = new Map()
    this._filtered.forEach(cmd => {
      if (!grouped.has(cmd.category)) grouped.set(cmd.category, [])
      grouped.get(cmd.category).push(cmd)
    })

    let flatIndex = 0
    grouped.forEach((items, category) => {
      const header = document.createElement("div")
      header.className = "px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider"
      header.textContent = category
      list.appendChild(header)

      items.forEach(cmd => {
        const idx = flatIndex++
        const optionId = `cp-cmd-${cmd.id}`
        const btn = this._createResultButton(idx, optionId, () => this._execute(cmd))

        const iconWrap = document.createElement("span")
        iconWrap.className = "flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground"
        iconWrap.setAttribute("aria-hidden", "true")
        const svg = cloneIcon(cmd.icon)
        if (svg) iconWrap.appendChild(svg)
        btn.appendChild(iconWrap)

        const label = document.createElement("span")
        label.className = "flex-1"
        label.textContent = cmd.label
        btn.appendChild(label)

        if (idx === this._selectedIndex) {
          const enterIcon = document.createElement("span")
          enterIcon.className = "flex-shrink-0 text-muted-foreground"
          enterIcon.setAttribute("aria-hidden", "true")
          const enterSvg = cloneIcon("enter")
          if (enterSvg) enterIcon.appendChild(enterSvg)
          btn.appendChild(enterIcon)
        }

        list.appendChild(btn)
      })
    })
    this._syncActiveDescendant()
  }

  _createResultButton(idx, optionId, onClick) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.id = optionId
    btn.setAttribute("role", "option")
    const isActive = idx === this._selectedIndex
    btn.setAttribute("aria-selected", isActive ? "true" : "false")
    const activeClasses = "bg-accent text-accent-foreground"
    const inactiveClasses = "text-foreground"
    btn.className = "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors " +
      (isActive ? activeClasses : inactiveClasses)
    btn.addEventListener("click", onClick)
    btn.addEventListener("mouseenter", () => {
      this._selectedIndex = idx
      this._renderList()
    })
    return btn
  }

  _syncActiveDescendant() {
    if (!this.hasListTarget || !this.hasInputTarget) return
    const active = this.listTarget.querySelector('[role="option"][aria-selected="true"]')
    if (active && active.id) {
      this.inputTarget.setAttribute("aria-activedescendant", active.id)
    } else {
      this.inputTarget.removeAttribute("aria-activedescendant")
    }
  }

  _execute(cmd) {
    if (!cmd) return

    if (cmd.action === "searchMode") {
      this.inputTarget.value = ">"
      this.filter()
      return
    }

    this._close()

    if (cmd.url) {
      window.location.href = cmd.url
    } else if (cmd.action === "signOut") {
      fetch("/api/auth/logout", {
        method: "DELETE",
        headers: { "X-CSRF-Token": document.querySelector("meta[name='csrf-token']")?.content }
      }).then(() => { window.location.href = "/auth" })
    } else if (cmd.action === "setLight") {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
      document.cookie = "maddiehq-theme=light;path=/;max-age=31536000;SameSite=Lax"
    } else if (cmd.action === "setDark") {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
      document.cookie = "maddiehq-theme=dark;path=/;max-age=31536000;SameSite=Lax"
    } else if (cmd.action === "setSystem") {
      localStorage.setItem("theme", "system")
      document.cookie = "maddiehq-theme=system;path=/;max-age=31536000;SameSite=Lax"
      window.location.reload()
    }
  }

  closeOnBackdrop(e) {
    if (e.target === this.modalTarget) this._close()
  }
}
