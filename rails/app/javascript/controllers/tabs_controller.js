import { Controller } from "@hotwired/stimulus"

// Tabs controller — ARIA tablist pattern
//
// Wires the WAI-ARIA tabs pattern on top of Stimulus targets:
//   - role=tablist / role=tab / role=tabpanel
//   - aria-selected, aria-controls, tabindex roving
//   - Arrow-left/right switches tabs, Home/End jumps to first/last
//
// Tab buttons must have `data-tabs-target="tab"` and `data-tab="<name>"`.
// Panels must have `data-tabs-target="panel"` and `data-panel="<name>"`.
export default class extends Controller {
  static targets = ["tab", "panel"]
  static values = { default: String }

  connect() {
    // Ensure ARIA roles and relationships are set up on first render
    this.element.setAttribute("role", "tablist")
    this.tabTargets.forEach((tab, i) => {
      const name = tab.dataset.tab
      const panel = this.panelTargets.find(p => p.dataset.panel === name)
      const tabId = tab.id || `tab-${name}-${i}`
      const panelId = panel?.id || `panel-${name}-${i}`
      tab.id = tabId
      tab.setAttribute("role", "tab")
      tab.setAttribute("aria-controls", panelId)
      if (panel) {
        panel.id = panelId
        panel.setAttribute("role", "tabpanel")
        panel.setAttribute("aria-labelledby", tabId)
        panel.setAttribute("tabindex", "0")
      }
    })

    const params = new URLSearchParams(window.location.search)
    const tabFromUrl = params.get("tab")
    const activeTab = tabFromUrl || this.defaultValue || this.tabTargets[0]?.dataset.tab

    if (activeTab) {
      this.activate(activeTab)
    }
  }

  switch(event) {
    const tab = event.currentTarget.dataset.tab
    this.activate(tab, { focus: false })
  }

  // Arrow-left/right, Home, End keyboard navigation
  handleKeydown(event) {
    if (!this.tabTargets.includes(event.currentTarget)) return

    const current = this.tabTargets.indexOf(event.currentTarget)
    let next = null

    if (event.key === "ArrowRight") next = (current + 1) % this.tabTargets.length
    else if (event.key === "ArrowLeft") next = (current - 1 + this.tabTargets.length) % this.tabTargets.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = this.tabTargets.length - 1

    if (next !== null) {
      event.preventDefault()
      const nextTab = this.tabTargets[next]
      this.activate(nextTab.dataset.tab, { focus: true })
    }
  }

  activate(tabName, { focus = false } = {}) {
    this.tabTargets.forEach(tab => {
      const activeClass = tab.dataset.activeClass || "bg-background text-foreground shadow-sm"
      const inactiveClass = "text-muted-foreground"
      const isActive = tab.dataset.tab === tabName

      if (isActive) {
        activeClass.split(" ").forEach(c => tab.classList.add(c))
        inactiveClass.split(" ").forEach(c => tab.classList.remove(c))
        tab.setAttribute("aria-selected", "true")
        tab.setAttribute("tabindex", "0")
        if (focus) tab.focus()
      } else {
        activeClass.split(" ").forEach(c => tab.classList.remove(c))
        inactiveClass.split(" ").forEach(c => tab.classList.add(c))
        tab.setAttribute("aria-selected", "false")
        tab.setAttribute("tabindex", "-1")
      }
    })

    this.panelTargets.forEach(panel => {
      if (panel.dataset.panel === tabName) {
        panel.classList.remove("hidden")
        panel.removeAttribute("hidden")
      } else {
        panel.classList.add("hidden")
        panel.setAttribute("hidden", "")
      }
    })
  }
}
