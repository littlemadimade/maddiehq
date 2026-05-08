import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["list", "form", "formTitle", "editId", "nameInput", "descInput", "perm"]

  connect() { this.loadRoles() }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  showCreateForm() {
    if (this.hasFormTarget) this.formTarget.classList.remove("hidden")
    if (this.hasFormTitleTarget) this.formTitleTarget.textContent = "Create Role"
    if (this.hasEditIdTarget) this.editIdTarget.value = ""
    if (this.hasNameInputTarget) this.nameInputTarget.value = ""
    if (this.hasDescInputTarget) this.descInputTarget.value = ""
    this.permTargets.forEach(cb => cb.checked = false)
  }

  hideForm() {
    if (this.hasFormTarget) this.formTarget.classList.add("hidden")
  }

  editRole(role) {
    if (this.hasFormTarget) this.formTarget.classList.remove("hidden")
    if (this.hasFormTitleTarget) this.formTitleTarget.textContent = "Edit Role"
    if (this.hasEditIdTarget) this.editIdTarget.value = role.id
    if (this.hasNameInputTarget) this.nameInputTarget.value = role.name || ""
    if (this.hasDescInputTarget) this.descInputTarget.value = role.description || ""

    const perms = role.permissions || []
    this.permTargets.forEach(cb => {
      cb.checked = perms.includes(cb.value)
    })
  }

  async saveRole() {
    const name = this.hasNameInputTarget ? this.nameInputTarget.value.trim() : ""
    if (!name) return

    const description = this.hasDescInputTarget ? this.descInputTarget.value.trim() : ""
    const permissions = this.permTargets.filter(cb => cb.checked).map(cb => cb.value)
    const editId = this.hasEditIdTarget ? this.editIdTarget.value : ""

    const method = editId ? "PATCH" : "POST"
    const url = editId ? `/api/admin/roles/${editId}` : "/api/admin/roles"

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ name, description, permissions })
      })
      if (res.ok) {
        this.hideForm()
        this.loadRoles()
        if (window.toast) window.toast(editId ? "Role updated" : "Role created", "success")
      } else {
        const data = await res.json()
        if (window.toast) window.toast(data.error || "Failed to save role", "error")
      }
    } catch {
      if (window.toast) window.toast("Failed to save role", "error")
    }
  }

  async deleteRole(id) {
    if (!confirm("Delete this role?")) return
    try {
      await fetch(`/api/admin/roles/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.getCsrfToken() }
      })
      this.loadRoles()
      if (window.toast) window.toast("Role deleted", "success")
    } catch {
      if (window.toast) window.toast("Failed to delete role", "error")
    }
  }

  async loadRoles() {
    try {
      const res = await fetch("/api/admin/roles", { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      this.renderRoles(json.data || json.roles || [])
    } catch (e) {
      console.error("Failed to load roles:", e)
    }
  }

  renderRoles(roles) {
    if (!this.hasListTarget) return
    this.listTarget.textContent = ""

    if (roles.length === 0) {
      const p = document.createElement("p")
      p.className = "text-sm text-zinc-400 dark:text-zinc-500 text-center py-8"
      p.textContent = "No roles defined yet."
      this.listTarget.appendChild(p)
      return
    }

    roles.forEach(role => {
      const card = document.createElement("div")
      card.className = "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4"

      const header = document.createElement("div")
      header.className = "flex items-center justify-between mb-2"

      const nameEl = document.createElement("h3")
      nameEl.className = "text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      nameEl.textContent = role.name
      header.appendChild(nameEl)

      const actions = document.createElement("div")
      actions.className = "flex gap-2"

      const editBtn = document.createElement("button")
      editBtn.className = "text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
      editBtn.textContent = "Edit"
      editBtn.addEventListener("click", () => this.editRole(role))
      actions.appendChild(editBtn)

      if (!role.system) {
        const delBtn = document.createElement("button")
        delBtn.className = "text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-medium"
        delBtn.textContent = "Delete"
        delBtn.addEventListener("click", () => this.deleteRole(role.id))
        actions.appendChild(delBtn)
      }

      header.appendChild(actions)
      card.appendChild(header)

      if (role.description) {
        const desc = document.createElement("p")
        desc.className = "text-xs text-zinc-500 dark:text-zinc-400 mb-2"
        desc.textContent = role.description
        card.appendChild(desc)
      }

      const perms = role.permissions || []
      if (perms.length > 0) {
        const permDiv = document.createElement("div")
        permDiv.className = "flex flex-wrap gap-1"
        perms.forEach(p => {
          const tag = document.createElement("span")
          tag.className = "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          tag.textContent = p
          permDiv.appendChild(tag)
        })
        card.appendChild(permDiv)
      }

      this.listTarget.appendChild(card)
    })
  }
}
