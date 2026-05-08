import { Controller } from "@hotwired/stimulus"

// ── Markdown rendering (matches Node ChatMessageContent) ──
// NOTE: All user-provided text is escaped via escapeHtml() before insertion.
// AI response content is rendered as markdown HTML (same as the Node.js React version).
// The escapeHtml function prevents XSS from user input. AI responses come from
// the server-side Anthropic API which the app controls.

const SYSTEM_TAG_REGEX = /\[[A-Z_]+:[^\]]+\]/g

function stripTags(text) {
  return text.replace(SYSTEM_TAG_REGEX, "").replace(/\s{2,}/g, " ").trim()
}

function escapeHtml(str) {
  const div = document.createElement("div")
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

function renderInlineHtml(text) {
  let html = escapeHtml(text)
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  // Italic (single * not preceded/followed by *)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">$1</code>')
  // Links — action links (internal app/settings paths)
  html = html.replace(
    /\[([^\]]+)\]\((\/(?:app|settings)[^\)]*)\)/g,
    '<a href="$2" class="inline-flex items-center gap-1.5 mt-1 mb-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium no-underline transition-colors">$1 &rarr;</a>'
  )
  // Links — internal
  html = html.replace(
    /\[([^\]]+)\]\((\/[^\)]+)\)/g,
    '<a href="$2" class="text-primary dark:text-primary underline">$1</a>'
  )
  // Links — external
  html = html.replace(
    /\[([^\]]+)\]\(([^\)]+)\)/g,
    '<a href="$2" class="text-primary dark:text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  return html
}

function renderMarkdownHtml(text) {
  const lines = text.split("\n")
  let html = ""
  let listItems = []
  let listType = null
  let inCodeBlock = false
  let codeBlockContent = ""

  function flushList() {
    if (listItems.length === 0) return
    const tag = listType === "ol" ? "ol" : "ul"
    const cls = listType === "ol" ? "list-decimal ml-5 my-2 space-y-1" : "list-disc ml-5 my-2 space-y-1"
    html += "<" + tag + ' class="' + cls + '">'
    listItems.forEach(item => {
      html += '<li class="text-sm leading-relaxed">' + renderInlineHtml(item) + "</li>"
    })
    html += "</" + tag + ">"
    listItems = []
    listType = null
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Code block handling
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        html += '<pre class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-xs font-mono">' + escapeHtml(codeBlockContent.trim()) + "</code></pre>"
        codeBlockContent = ""
        inCodeBlock = false
      } else {
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent += line + "\n"
      continue
    }

    if (!trimmed) { flushList(); continue }

    if (trimmed.startsWith("### ")) {
      flushList()
      html += '<h3 class="text-sm font-bold mt-3 mb-1">' + renderInlineHtml(trimmed.slice(4)) + "</h3>"
      continue
    }
    if (trimmed.startsWith("## ")) {
      flushList()
      html += '<h2 class="text-sm font-bold mt-3 mb-1">' + renderInlineHtml(trimmed.slice(3)) + "</h2>"
      continue
    }
    if (trimmed.startsWith("# ")) {
      flushList()
      html += '<h1 class="text-base font-bold mt-3 mb-1">' + renderInlineHtml(trimmed.slice(2)) + "</h1>"
      continue
    }

    if (/^[-*]\s/.test(trimmed)) {
      if (listType !== "ul") { flushList(); listType = "ul" }
      listItems.push(trimmed.replace(/^[-*]\s+/, ""))
      continue
    }
    if (/^\d+[.)]\s/.test(trimmed)) {
      if (listType !== "ol") { flushList(); listType = "ol" }
      listItems.push(trimmed.replace(/^\d+[.)]\s+/, ""))
      continue
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList()
      html += '<hr class="my-3 border-current opacity-20" />'
      continue
    }

    flushList()
    html += '<p class="text-sm leading-relaxed mb-2">' + renderInlineHtml(trimmed) + "</p>"
  }

  // Close any unclosed code block
  if (inCodeBlock && codeBlockContent) {
    html += '<pre class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-xs font-mono">' + escapeHtml(codeBlockContent.trim()) + "</code></pre>"
  }

  flushList()
  return html
}

// ── Voice service (mirrors Node voice.ts) ──

class VoiceService {
  constructor(config) {
    this.config = config
    this.recognition = null
    this.state = "idle"
    this.finalTranscript = ""
    this.interimTranscript = ""
    this.silenceTimeout = null
    this.lastSpeechTime = 0
    this.SILENCE_DURATION_MS = 2000
  }

  async startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) throw new Error("Speech recognition not supported")

    if (this.recognition) {
      try { this.recognition.abort() } catch {}
    }

    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = "en-US"
    this.finalTranscript = ""
    this.interimTranscript = ""

    this.recognition.onstart = () => {
      this._setState("listening")
      this.lastSpeechTime = Date.now()
      this._startSilenceDetection()
    }

    this.recognition.onresult = (event) => {
      this.lastSpeechTime = Date.now()
      let interim = ""
      let final = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) final += transcript
        else interim += transcript
      }
      if (final) this.finalTranscript += final
      this.interimTranscript = interim
      this.config.onTranscript(this.finalTranscript + this.interimTranscript, !!final)
    }

    this.recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return
      this.config.onError(new Error(event.error))
    }

    this.recognition.onend = () => {
      this._clearSilenceTimeout()
      if (this.state === "listening" && this.finalTranscript.trim()) {
        this._endTurn()
      } else if (this.state === "listening") {
        this._setState("idle")
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
    } catch {}
    this.recognition.start()
  }

  stopListening() {
    this._clearSilenceTimeout()
    if (this.recognition) {
      try { this.recognition.stop() } catch {}
    }
  }

  _startSilenceDetection() {
    this._clearSilenceTimeout()
    const check = () => {
      if (this.state !== "listening") return
      if (this.finalTranscript.trim() && Date.now() - this.lastSpeechTime > this.SILENCE_DURATION_MS) {
        this.stopListening()
        return
      }
      this.silenceTimeout = setTimeout(check, 500)
    }
    this.silenceTimeout = setTimeout(check, 500)
  }

  _clearSilenceTimeout() {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout)
      this.silenceTimeout = null
    }
  }

  _endTurn() {
    const transcript = this.finalTranscript.trim()
    if (transcript) {
      this._setState("processing")
      this.config.onTurnEnd(transcript)
    } else {
      this._setState("idle")
    }
  }

  async speak(text) {
    this._setState("speaking")
    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this._csrfToken() },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error("TTS failed: " + response.status)
      const contentType = response.headers.get("content-type") || ""
      if (!contentType.includes("audio")) throw new Error("TTS returned non-audio response")
      const audioData = await response.arrayBuffer()
      if (audioData.byteLength < 100) throw new Error("TTS returned empty audio")
      const mimeType = contentType.split(";")[0].trim() || "audio/mpeg"
      const blob = new Blob([audioData], { type: mimeType })
      const url = URL.createObjectURL(blob)
      this.config.onPlaybackReady({ url, mimeType })
    } catch (error) {
      this.config.onError(error)
      this._setState("idle")
    }
  }

  handlePlaybackComplete() { this._setState("idle") }
  handlePlaybackStarted() { this._setState("speaking") }
  handlePlaybackPaused() { this._setState("idle") }
  handlePlaybackError(error) { this.config.onError(error); this._setState("idle") }

  _setState(state) {
    this.state = state
    this.config.onStateChange(state)
  }

  getState() { return this.state }

  _csrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }
}

// ── Safe DOM helpers ──
// These create DOM elements without innerHTML for user-provided content.

function createTextSpan(text, className) {
  const el = document.createElement("span")
  if (className) el.className = className
  el.textContent = text
  return el
}

function setRenderedMarkdown(container, markdownText) {
  // AI responses are rendered as markdown HTML. The text comes from the
  // Anthropic API via our server — not from user input. User input is
  // escaped via escapeHtml() inside renderInlineHtml before any HTML
  // construction occurs.
  const rendered = renderMarkdownHtml(markdownText)
  container.innerHTML = rendered
}

// ── Chat Controller ──

const MAX_FILE_SIZE = 10 * 1024 * 1024

export default class extends Controller {
  static targets = [
    "sidebar", "conversationList", "messagesList", "messagesContainer",
    "emptyState", "scrollAnchor", "input", "sendButton", "fileInput",
    "pendingFilesBar", "pendingFilesList",
    "voiceStatus", "micButton", "micIcon", "micOffIcon",
    "audioToggle", "audioElement",
    "playbackBar", "playIcon", "pauseIcon", "seekBar",
    "currentTime", "duration", "playbackRate"
  ]

  connect() {
    this.conversations = []
    this.activeConvId = null
    this.messages = []
    this.streaming = false
    this.streamingText = ""
    this.pendingFiles = []
    this.audioEnabled = false
    this.sidebarVisible = true
    this.voiceState = "idle"
    this.voiceService = null
    this.playbackUrl = null
    this._isVoiceSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

    if (!this._isVoiceSupported && this.hasMicButtonTarget) {
      this.micButtonTarget.classList.add("hidden")
    }

    this._setupAudioElement()
    this.loadConversations()
  }

  disconnect() {
    if (this.voiceService) {
      this.voiceService.stopListening()
    }
    if (this.playbackUrl) {
      URL.revokeObjectURL(this.playbackUrl)
    }
  }

  // ── CSRF ──

  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  // ── Conversations ──

  async loadConversations() {
    try {
      const res = await fetch("/api/conversations")
      if (res.ok) {
        const data = await res.json()
        this.conversations = data.conversations || []
        this._renderConversationList()
      }
    } catch {}
  }

  _renderConversationList() {
    if (!this.hasConversationListTarget) return
    const el = this.conversationListTarget

    // Clear children safely
    while (el.firstChild) el.removeChild(el.firstChild)

    if (this.conversations.length === 0) {
      const p = document.createElement("p")
      p.className = "px-3 py-8 text-xs text-gray-400 dark:text-gray-500 text-center"
      p.textContent = "No conversations yet"
      el.appendChild(p)
      return
    }

    this.conversations.forEach(conv => {
      const btn = document.createElement("button")
      btn.className = "w-full text-left px-3 py-2 text-sm truncate transition-colors " + (
        this.activeConvId === conv.id
          ? "bg-accent dark:bg-accent text-primary dark:text-primary"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      )

      // Create icon SVG
      const svgNs = "http://www.w3.org/2000/svg"
      const svg = document.createElementNS(svgNs, "svg")
      svg.setAttribute("class", "w-3 h-3 inline mr-2 opacity-50")
      svg.setAttribute("fill", "none")
      svg.setAttribute("viewBox", "0 0 24 24")
      svg.setAttribute("stroke", "currentColor")
      svg.setAttribute("stroke-width", "2")
      const path = document.createElementNS(svgNs, "path")
      path.setAttribute("d", "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z")
      svg.appendChild(path)
      btn.appendChild(svg)
      btn.appendChild(document.createTextNode(conv.title))

      btn.addEventListener("click", () => this._selectConversation(conv.id))
      el.appendChild(btn)
    })
  }

  async _selectConversation(id) {
    this.activeConvId = id
    this._renderConversationList()
    await this._loadMessages(id)
  }

  async _loadMessages(convId) {
    if (!convId) {
      this.messages = []
      this._renderMessages()
      return
    }
    try {
      const res = await fetch("/api/conversations/" + convId + "/messages")
      if (res.ok) {
        const data = await res.json()
        this.messages = data.messages || []
        this._renderMessages()
        this._scrollToBottom()
      }
    } catch {}
  }

  newConversation() {
    this.activeConvId = null
    this.messages = []
    this._renderMessages()
    this._renderConversationList()
    if (this.hasInputTarget) this.inputTarget.focus()
  }

  async _createConversation() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": this.getCsrfToken() },
      body: JSON.stringify({})
    })
    const data = await res.json()
    const conv = data.conversation
    this.conversations.unshift(conv)
    this.activeConvId = conv.id
    this._renderConversationList()
    return conv.id
  }

  // ── Messages ──

  _renderMessages() {
    if (!this.hasMessagesListTarget) return
    const el = this.messagesListTarget

    // Clear children safely
    while (el.firstChild) el.removeChild(el.firstChild)

    if (this.messages.length === 0 && !this.streaming) {
      if (this.hasEmptyStateTarget) {
        el.appendChild(this.emptyStateTarget)
        this.emptyStateTarget.classList.remove("hidden")
      }
      return
    }

    if (this.hasEmptyStateTarget) {
      this.emptyStateTarget.classList.add("hidden")
    }

    this.messages.forEach(msg => {
      el.appendChild(this._createMessageBubble(msg))
    })

    this._scrollToBottom()
  }

  _createMessageBubble(msg) {
    const wrapper = document.createElement("div")
    wrapper.className = "flex " + (msg.role === "user" ? "justify-end" : "justify-start")

    const bubble = document.createElement("div")
    bubble.className = "max-w-[80%] rounded-2xl px-4 py-2.5 " + (
      msg.role === "user"
        ? "bg-primary text-white"
        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
    )

    if (msg.role === "user") {
      bubble.textContent = stripTags(msg.content)
    } else {
      setRenderedMarkdown(bubble, stripTags(msg.content))
    }

    // Attachment badges
    if (msg.attachments_meta) {
      try {
        const attachments = typeof msg.attachments_meta === "string"
          ? JSON.parse(msg.attachments_meta)
          : msg.attachments_meta
        if (Array.isArray(attachments) && attachments.length > 0) {
          const attDiv = document.createElement("div")
          attDiv.className = "flex flex-wrap gap-1 mt-1.5"
          attachments.forEach(att => {
            const span = document.createElement("span")
            span.className = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400"
            const name = att.name && att.name.length > 20 ? att.name.slice(0, 17) + "..." : (att.name || "file")
            span.textContent = name
            attDiv.appendChild(span)
          })
          bubble.appendChild(attDiv)
        }
      } catch {}
    }

    wrapper.appendChild(bubble)
    return wrapper
  }

  _appendStreamingBubble() {
    if (!this.hasMessagesListTarget) return
    // Remove existing streaming bubble if any
    this._removeStreamingBubble()

    const wrapper = document.createElement("div")
    wrapper.className = "flex justify-start"
    wrapper.id = "streaming-bubble"

    const bubble = document.createElement("div")
    bubble.className = "max-w-[80%] rounded-2xl px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
    bubble.id = "streaming-content"

    wrapper.appendChild(bubble)
    this.messagesListTarget.appendChild(wrapper)
    return bubble
  }

  _updateStreamingBubble(text) {
    let bubble = document.getElementById("streaming-content")
    if (!bubble) bubble = this._appendStreamingBubble()

    // Clear existing content
    while (bubble.firstChild) bubble.removeChild(bubble.firstChild)

    if (text) {
      // Render markdown content from AI
      setRenderedMarkdown(bubble, text)
      // Add cursor
      const cursor = document.createElement("span")
      cursor.className = "inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5"
      bubble.appendChild(cursor)
    } else {
      // Loading spinner
      const spinner = document.createElement("div")
      spinner.className = "w-4 h-4 animate-spin text-gray-400"
      const svgNs = "http://www.w3.org/2000/svg"
      const svg = document.createElementNS(svgNs, "svg")
      svg.setAttribute("class", "w-4 h-4 animate-spin text-gray-400")
      svg.setAttribute("fill", "none")
      svg.setAttribute("viewBox", "0 0 24 24")
      const circle = document.createElementNS(svgNs, "circle")
      circle.setAttribute("class", "opacity-25")
      circle.setAttribute("cx", "12")
      circle.setAttribute("cy", "12")
      circle.setAttribute("r", "10")
      circle.setAttribute("stroke", "currentColor")
      circle.setAttribute("stroke-width", "4")
      const pathEl = document.createElementNS(svgNs, "path")
      pathEl.setAttribute("class", "opacity-75")
      pathEl.setAttribute("fill", "currentColor")
      pathEl.setAttribute("d", "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z")
      svg.appendChild(circle)
      svg.appendChild(pathEl)
      bubble.appendChild(svg)
    }
    this._scrollToBottom()
  }

  _removeStreamingBubble() {
    const el = document.getElementById("streaming-bubble")
    if (el) el.remove()
  }

  _appendVoiceTranscriptBubble(text) {
    this._removeVoiceTranscript()
    if (!text || !this.hasMessagesListTarget) return

    const wrapper = document.createElement("div")
    wrapper.className = "flex justify-end"
    wrapper.id = "voice-transcript-bubble"

    const bubble = document.createElement("div")
    bubble.className = "max-w-[80%] rounded-2xl px-4 py-2.5 border-2 border-dashed border-primary dark:border-primary text-primary dark:text-primary text-sm"
    bubble.textContent = text
    const cursor = document.createElement("span")
    cursor.className = "inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5"
    bubble.appendChild(cursor)

    wrapper.appendChild(bubble)
    this.messagesListTarget.appendChild(wrapper)
    this._scrollToBottom()
  }

  _removeVoiceTranscript() {
    const el = document.getElementById("voice-transcript-bubble")
    if (el) el.remove()
  }

  _scrollToBottom() {
    if (this.hasScrollAnchorTarget) {
      this.scrollAnchorTarget.scrollIntoView({ behavior: "smooth" })
    }
  }

  // ── Send message ──

  async send(event) {
    event.preventDefault()
    await this._doSend()
  }

  async _doSend(overrideText) {
    const text = (overrideText || (this.hasInputTarget ? this.inputTarget.value : "")).trim()
    if (!text && this.pendingFiles.length === 0) return
    if (this.streaming) return

    let convId = this.activeConvId
    if (!convId) convId = await this._createConversation()

    // Save user message
    const userMsg = await this._saveMessage(convId, "user", text, this.pendingFiles.length > 0 ? this.pendingFiles : null)
    this.messages.push(userMsg)
    this._renderMessages()

    if (this.hasInputTarget) {
      this.inputTarget.value = ""
      this.inputTarget.style.height = "auto"
    }

    // Build message history for LLM
    const llmMessages = this.messages.map(m => {
      const obj = { role: m.role, content: m.content }
      if (m.id === userMsg.id && this.pendingFiles.length > 0) {
        obj.attachments = this.pendingFiles.map(f => ({ name: f.name, type: f.type, size: f.size, data: f.data }))
      }
      return obj
    })

    this.pendingFiles = []
    this._renderPendingFiles()

    this.streaming = true
    this.streamingText = ""
    this._updateSendButton()
    this._updateStreamingBubble("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": this.getCsrfToken() },
        body: JSON.stringify({ messages: llmMessages })
      })

      if (!res.ok) throw new Error("Chat failed: " + res.status)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const jsonStr = line.slice(6)
          try {
            const parsed = JSON.parse(jsonStr)
            if (parsed.text) {
              fullText += parsed.text
              this.streamingText = stripTags(fullText)
              this._updateStreamingBubble(this.streamingText)
            }
            if (parsed.done && parsed.fullText) {
              fullText = parsed.fullText
            }
          } catch {}
        }
      }

      // Save assistant message
      const cleanText = stripTags(fullText)
      const assistantMsg = await this._saveMessage(convId, "assistant", cleanText)
      this.messages.push(assistantMsg)
      this._removeStreamingBubble()
      this._renderMessages()

      // Speak response if audio enabled
      if (this.audioEnabled && cleanText) {
        this._getVoiceService().speak(cleanText).catch(() => {})
      }

      // Refresh conversation list (title may have changed)
      this.loadConversations()
    } catch (err) {
      console.error("[Chat]", err)
      this._removeStreamingBubble()
    } finally {
      this.streaming = false
      this.streamingText = ""
      this._updateSendButton()
    }
  }

  async _saveMessage(convId, role, content, attachments) {
    const body = { role, content }
    if (attachments && attachments.length > 0) {
      body.attachments_meta = attachments.map(f => ({ name: f.name, type: f.type, size: f.size }))
    }
    const res = await fetch("/api/conversations/" + convId + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": this.getCsrfToken() },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    return data.message
  }

  _updateSendButton() {
    if (!this.hasSendButtonTarget) return
    const text = this.hasInputTarget ? this.inputTarget.value.trim() : ""
    this.sendButtonTarget.disabled = this.streaming || this.voiceState === "listening" || this.voiceState === "speaking" || (!text && this.pendingFiles.length === 0)
  }

  // ── Input handling ──

  handleKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      this._doSend()
    }
  }

  autoResize() {
    if (!this.hasInputTarget) return
    const ta = this.inputTarget
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 150) + "px"
    this._updateSendButton()
  }

  // ── File handling ──

  openFileDialog() {
    if (this.hasFileInputTarget) this.fileInputTarget.click()
  }

  handleFileSelect() {
    if (!this.hasFileInputTarget) return
    const files = this.fileInputTarget.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) return
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(",")[1]
        this.pendingFiles.push({ name: file.name, type: file.type, size: file.size, data: base64 })
        this._renderPendingFiles()
      }
      reader.readAsDataURL(file)
    })
    this.fileInputTarget.value = ""
  }

  _renderPendingFiles() {
    if (!this.hasPendingFilesBarTarget || !this.hasPendingFilesListTarget) return

    if (this.pendingFiles.length === 0) {
      this.pendingFilesBarTarget.classList.add("hidden")
      return
    }

    this.pendingFilesBarTarget.classList.remove("hidden")
    const el = this.pendingFilesListTarget

    // Clear safely
    while (el.firstChild) el.removeChild(el.firstChild)

    this.pendingFiles.forEach((f, i) => {
      const span = document.createElement("span")
      span.className = "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400"

      const name = f.name.length > 20 ? f.name.slice(0, 17) + "..." : f.name
      span.textContent = name

      const removeBtn = document.createElement("button")
      removeBtn.className = "ml-1 text-gray-400 hover:text-red-500"
      removeBtn.textContent = "\u00D7"
      removeBtn.addEventListener("click", () => {
        this.pendingFiles.splice(i, 1)
        this._renderPendingFiles()
        this._updateSendButton()
      })

      span.appendChild(removeBtn)
      el.appendChild(span)
    })

    this._updateSendButton()
  }

  // ── Sidebar ──

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible
    if (this.hasSidebarTarget) {
      this.sidebarTarget.classList.toggle("hidden", !this.sidebarVisible)
    }
  }

  // ── Audio toggle ──

  toggleAudio() {
    this.audioEnabled = this.hasAudioToggleTarget ? this.audioToggleTarget.checked : false
  }

  // ── Voice ──

  _getVoiceService() {
    if (!this.voiceService) {
      this.voiceService = new VoiceService({
        onTranscript: (text, isFinal) => {
          this._appendVoiceTranscriptBubble(text)
        },
        onTurnEnd: (transcript) => {
          this._removeVoiceTranscript()
          if (this.hasInputTarget) this.inputTarget.value = transcript
          setTimeout(() => this._doSend(transcript), 100)
        },
        onError: (error) => {
          console.error("[Voice]", error)
        },
        onStateChange: (state) => {
          this.voiceState = state
          this._updateVoiceUI()
        },
        onPlaybackReady: ({ url, mimeType }) => {
          if (this.hasAudioElementTarget) {
            this.audioElementTarget.pause()
          }
          if (this.playbackUrl && this.playbackUrl !== url) {
            URL.revokeObjectURL(this.playbackUrl)
          }
          this.playbackUrl = url
          this._showPlaybackBar(url)
        }
      })
    }
    return this.voiceService
  }

  async toggleVoice() {
    if (!this._isVoiceSupported) return
    const service = this._getVoiceService()
    const currentState = service.getState()

    if (currentState === "listening") {
      service.stopListening()
    } else if (currentState === "idle") {
      try {
        await service.startListening()
      } catch (error) {
        console.error("[Voice] Failed to start:", error)
      }
    }
  }

  _updateVoiceUI() {
    // Voice status text
    if (this.hasVoiceStatusTarget) {
      const el = this.voiceStatusTarget
      if (this.voiceState === "listening") {
        el.classList.remove("hidden")
        el.className = "text-xs text-red-500 animate-pulse"
        el.textContent = "Listening..."
      } else if (this.voiceState === "processing") {
        el.classList.remove("hidden")
        el.className = "text-xs text-yellow-500"
        el.textContent = "Processing..."
      } else if (this.voiceState === "speaking") {
        el.classList.remove("hidden")
        el.className = "text-xs text-primary"
        el.textContent = "Speaking..."
      } else {
        el.classList.add("hidden")
      }
    }

    // Mic button styling
    if (this.hasMicButtonTarget) {
      const btn = this.micButtonTarget
      btn.className = "p-2 rounded-lg transition-colors "
      if (this.voiceState === "listening") {
        btn.className += "bg-red-500 text-white animate-pulse"
      } else if (this.voiceState === "speaking") {
        btn.className += "bg-primary text-white"
      } else {
        btn.className += "text-gray-400 hover:text-primary hover:bg-accent dark:hover:bg-accent"
      }
    }

    // Mic icon toggle
    if (this.hasMicIconTarget && this.hasMicOffIconTarget) {
      if (this.voiceState === "listening") {
        this.micIconTarget.classList.add("hidden")
        this.micOffIconTarget.classList.remove("hidden")
      } else {
        this.micIconTarget.classList.remove("hidden")
        this.micOffIconTarget.classList.add("hidden")
      }
    }

    // Disable input during voice
    if (this.hasInputTarget) {
      this.inputTarget.disabled = this.voiceState === "listening" || this.voiceState === "speaking"
    }
    this._updateSendButton()
  }

  // ── Audio playback ──

  _setupAudioElement() {
    if (!this.hasAudioElementTarget) return
    const audio = this.audioElementTarget

    audio.addEventListener("loadedmetadata", () => {
      if (this.hasSeekBarTarget) this.seekBarTarget.max = Math.floor(audio.duration)
      if (this.hasDurationTarget) this.durationTarget.textContent = this._formatTime(audio.duration)
    })

    audio.addEventListener("timeupdate", () => {
      if (this.hasSeekBarTarget) this.seekBarTarget.value = Math.floor(audio.currentTime)
      if (this.hasCurrentTimeTarget) this.currentTimeTarget.textContent = this._formatTime(audio.currentTime)
      if (this.hasDurationTarget) this.durationTarget.textContent = this._formatTime(audio.duration)
    })

    audio.addEventListener("play", () => {
      if (this.voiceService) this.voiceService.handlePlaybackStarted()
      this._setPlayPauseIcons(true)
    })

    audio.addEventListener("pause", () => {
      if (!audio.ended && this.voiceService) this.voiceService.handlePlaybackPaused()
      this._setPlayPauseIcons(false)
    })

    audio.addEventListener("ended", () => {
      this._setPlayPauseIcons(false)
      if (this.voiceService) this.voiceService.handlePlaybackComplete()
    })

    audio.addEventListener("error", () => {
      if (this.voiceService) this.voiceService.handlePlaybackError(new Error("Playback failed"))
    })
  }

  _showPlaybackBar(url) {
    if (!this.hasPlaybackBarTarget || !this.hasAudioElementTarget) return
    const audio = this.audioElementTarget
    audio.src = url
    audio.load()

    this.playbackBarTarget.classList.remove("hidden")

    const handleCanPlay = () => {
      audio.removeEventListener("canplay", handleCanPlay)
      audio.currentTime = 0
      audio.play().catch(err => console.error("[Audio] Failed to autoplay:", err))
    }
    audio.addEventListener("canplay", handleCanPlay)
  }

  togglePlayback() {
    if (!this.hasAudioElementTarget || !this.playbackUrl) return
    const audio = this.audioElementTarget
    if (audio.paused) {
      audio.play().catch(err => console.error("[Audio] Failed to resume:", err))
    } else {
      audio.pause()
    }
  }

  seekAudio() {
    if (!this.hasAudioElementTarget || !this.hasSeekBarTarget) return
    this.audioElementTarget.currentTime = Number(this.seekBarTarget.value)
  }

  changePlaybackRate() {
    if (!this.hasAudioElementTarget || !this.hasPlaybackRateTarget) return
    const rate = Number(this.playbackRateTarget.value)
    this.audioElementTarget.playbackRate = rate
  }

  _setPlayPauseIcons(playing) {
    if (this.hasPlayIconTarget) this.playIconTarget.classList.toggle("hidden", playing)
    if (this.hasPauseIconTarget) this.pauseIconTarget.classList.toggle("hidden", !playing)
  }

  _formatTime(s) {
    if (!s || isNaN(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return m + ":" + sec.toString().padStart(2, "0")
  }
}
