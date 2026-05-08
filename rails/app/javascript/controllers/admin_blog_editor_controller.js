import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "postList", "editorSection", "listSection", "saveButton",
    "editId", "editTitle", "editSlug", "editStatus", "editTags", "editContent"
  ]

  connect() {
    this.easymde = null
    this.loadPosts()
  }

  disconnect() {
    this.destroyEditor()
  }

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  initEditor() {
    if (this.easymde) return

    const textarea = document.getElementById("blog-editor-content")
    if (!textarea || typeof EasyMDE === "undefined") return

    this.easymde = new EasyMDE({
      element: textarea,
      spellChecker: false,
      autosave: { enabled: false },
      minHeight: "300px",
      toolbar: [
        "bold", "italic", "heading", "|",
        "quote", "unordered-list", "ordered-list", "|",
        "link", "image", "code", "horizontal-rule", "|",
        "preview", "side-by-side", "fullscreen", "|",
        "guide"
      ],
      placeholder: "Write your post in Markdown...",
      status: ["lines", "words"],
    })
  }

  destroyEditor() {
    if (this.easymde) {
      this.easymde.toTextArea()
      this.easymde = null
    }
  }

  getContent() {
    return this.easymde ? this.easymde.value() : this.editContentTarget.value
  }

  setContent(value) {
    if (this.easymde) {
      this.easymde.value(value)
    } else {
      this.editContentTarget.value = value
    }
  }

  async loadPosts() {
    try {
      const res = await fetch("/api/admin/blog", { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      this.renderPosts(json.data || json.posts || [])
    } catch (e) {
      console.error("Failed to load posts:", e)
    }
  }

  renderPosts(posts) {
    if (!this.hasPostListTarget) return
    this.postListTarget.textContent = ""

    if (posts.length === 0) {
      const div = document.createElement("div")
      div.className = "px-4 py-8 text-center text-zinc-400 dark:text-zinc-500 text-sm"
      div.textContent = "No blog posts yet. Click 'New Post' to create one."
      this.postListTarget.appendChild(div)
      return
    }

    posts.forEach(post => {
      const row = document.createElement("div")
      row.className = "flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"

      const info = document.createElement("div")
      info.className = "flex-1 cursor-pointer"
      info.dataset.action = "click->admin-blog-editor#editPost"
      info.dataset.postId = post.id

      const title = document.createElement("div")
      title.className = "font-medium text-zinc-900 dark:text-zinc-100"
      title.textContent = post.title

      const meta = document.createElement("div")
      meta.className = "text-xs text-zinc-500 dark:text-zinc-400"
      const statusLabel = post.status === "published" ? "Published" : post.status === "archived" ? "Archived" : "Draft"
      const dateLabel = post.published_at ? new Date(post.published_at).toLocaleDateString() : "unpublished"
      meta.textContent = `/${post.slug} · ${statusLabel} · ${dateLabel}`

      info.appendChild(title)
      info.appendChild(meta)

      const actions = document.createElement("div")
      actions.className = "flex items-center gap-3"

      const editBtn = document.createElement("button")
      editBtn.className = "text-primary dark:text-primary hover:text-primary/90 text-xs font-medium"
      editBtn.textContent = "Edit"
      editBtn.dataset.action = "click->admin-blog-editor#editPost"
      editBtn.dataset.postId = post.id

      const delBtn = document.createElement("button")
      delBtn.className = "text-red-600 dark:text-red-400 hover:text-red-700 text-xs font-medium"
      delBtn.textContent = "Delete"
      delBtn.dataset.id = post.id
      delBtn.dataset.action = "click->admin-blog-editor#deletePost"

      actions.appendChild(editBtn)
      actions.appendChild(delBtn)

      row.appendChild(info)
      row.appendChild(actions)
      this.postListTarget.appendChild(row)
    })
  }

  newPost() {
    this.destroyEditor()
    this.editIdTarget.value = ""
    this.editTitleTarget.value = ""
    this.editSlugTarget.value = ""
    this.editStatusTarget.value = "draft"
    this.editTagsTarget.value = ""
    this.editContentTarget.value = ""
    this.saveButtonTarget.textContent = "Create Post"
    this.showEditor()
    // Initialize EasyMDE after showing the editor (needs visible element)
    setTimeout(() => this.initEditor(), 50)
  }

  async editPost(event) {
    const id = event.currentTarget.dataset.postId
    if (!id) return

    try {
      const res = await fetch(`/api/admin/blog/${id}`, { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      const post = json.data || json.post || json

      this.destroyEditor()
      this.editIdTarget.value = post.id
      this.editTitleTarget.value = post.title || ""
      this.editSlugTarget.value = post.slug || ""
      this.editStatusTarget.value = post.status || "draft"
      this.editContentTarget.value = post.content || ""

      let tags = post.tags || ""
      try { tags = JSON.parse(tags) } catch {}
      this.editTagsTarget.value = Array.isArray(tags) ? tags.join(", ") : tags

      this.saveButtonTarget.textContent = "Save Changes"
      this.showEditor()
      setTimeout(() => this.initEditor(), 50)
    } catch (e) {
      console.error("Failed to load post:", e)
    }
  }

  async savePost() {
    const id = this.editIdTarget.value
    const title = this.editTitleTarget.value.trim()
    if (!title) return

    const tagsInput = this.editTagsTarget.value
    const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : []

    const body = {
      title,
      slug: this.editSlugTarget.value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      status: this.editStatusTarget.value,
      content: this.getContent(),
      tags: JSON.stringify(tags)
    }

    if (body.status === "published") {
      body.published_at = new Date().toISOString()
    }

    this.saveButtonTarget.disabled = true
    this.saveButtonTarget.textContent = "Saving..."

    try {
      const url = id ? `/api/admin/blog/${id}` : "/api/admin/blog"
      const method = id ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.getCsrfToken() },
        body: JSON.stringify(body),
        credentials: "same-origin"
      })

      if (res.ok) {
        this.hideEditor()
        this.loadPosts()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to save")
      }
    } catch (e) {
      console.error("Save failed:", e)
      alert("Failed to save post")
    } finally {
      this.saveButtonTarget.disabled = false
      this.saveButtonTarget.textContent = id ? "Save Changes" : "Create Post"
    }
  }

  cancelEdit() {
    this.destroyEditor()
    this.hideEditor()
  }

  showEditor() {
    if (this.hasEditorSectionTarget) this.editorSectionTarget.classList.remove("hidden")
    if (this.hasListSectionTarget) this.listSectionTarget.classList.add("hidden")
  }

  hideEditor() {
    if (this.hasEditorSectionTarget) this.editorSectionTarget.classList.add("hidden")
    if (this.hasListSectionTarget) this.listSectionTarget.classList.remove("hidden")
  }

  async deletePost(event) {
    const id = event.currentTarget.dataset.id
    if (!confirm("Delete this post?")) return
    try {
      await fetch(`/api/admin/blog/${id}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.getCsrfToken() },
        credentials: "same-origin"
      })
      this.loadPosts()
    } catch (e) { console.error("Delete failed:", e) }
  }
}
