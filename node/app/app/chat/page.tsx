"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Plus, Send, Mic, MicOff, Paperclip, X,
  Play, Pause, Loader2, FileText, ImageIcon,
} from "lucide-react";
import { ChatMessageContent } from "@/components/chat-message";
import { useVoice } from "@/lib/use-voice";
import { stripTags } from "@/lib/chat-tags";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments_meta?: string | null;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface PendingFile {
  name: string;
  type: string;
  size: number;
  data: string; // base64
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 2];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ".pdf,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.docx,.doc,.xlsx,.xls,.pptx,.ppt";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Voice
  const {
    voiceState, currentTranscript, toggleListening, speak,
    isSupported: isVoiceSupported, audioRef, playback,
    togglePlayback, seekTo, setPlaybackRate,
  } = useVoice({
    onTurnEnd: (transcript) => {
      setInput(transcript);
      // Auto-send after voice input
      setTimeout(() => handleSend(transcript), 100);
    },
    onError: (err) => console.error("[Voice]", err),
  });

  // Load conversations
  useEffect(() => {
    fetch("/api/conversations").then(r => r.json()).then(data => {
      setConversations(data.conversations || []);
    }).catch(() => {});
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    fetch(`/api/conversations/${activeConvId}/messages`)
      .then(r => r.json())
      .then(data => { setMessages(data.messages || []); setTimeout(scrollToBottom, 100); })
      .catch(() => {});
  }, [activeConvId, scrollToBottom]);

  // Auto-scroll on new messages
  useEffect(() => { scrollToBottom(); }, [messages, streamingText, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  async function createConversation(): Promise<string> {
    const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    const conv = data.conversation;
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(conv.id);
    return conv.id;
  }

  async function saveMessage(convId: string, role: "user" | "assistant", content: string, attachments_meta?: PendingFile[]) {
    const res = await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, attachments_meta: attachments_meta?.map(f => ({ name: f.name, type: f.type, size: f.size })) }),
    });
    const data = await res.json();
    return data.message;
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText || input).trim();
    if (!text && pendingFiles.length === 0) return;
    if (streaming) return;

    let convId = activeConvId;
    if (!convId) convId = await createConversation();

    // Save user message
    const userMsg = await saveMessage(convId, "user", text, pendingFiles.length > 0 ? pendingFiles : undefined);
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Build message history for LLM
    const history = [...messages, { id: userMsg.id, role: "user" as const, content: text }];
    const llmMessages = history.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.id === userMsg.id && pendingFiles.length > 0 ? {
        attachments: pendingFiles.map(f => ({ name: f.name, type: f.type, size: f.size, data: f.data }))
      } : {}),
    }));

    setPendingFiles([]);
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: llmMessages }),
      });

      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.text) {
              fullText += event.text;
              setStreamingText(stripTags(fullText));
            }
            if (event.done && event.fullText) {
              fullText = event.fullText;
            }
          } catch {}
        }
      }

      // Save assistant message
      const cleanText = stripTags(fullText);
      const assistantMsg = await saveMessage(convId, "assistant", cleanText);
      setMessages(prev => [...prev, assistantMsg]);
      setStreamingText("");

      // Speak response if audio enabled
      if (audioEnabled && cleanText) {
        speak(cleanText).catch(() => {});
      }

      // Refresh conversation list (title may have changed)
      fetch("/api/conversations").then(r => r.json()).then(data => setConversations(data.conversations || [])).catch(() => {});
    } catch (err) {
      console.error("[Chat]", err);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setPendingFiles(prev => [...prev, { name: file.name, type: file.type, size: file.size, data: base64 }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  const isDisabled = streaming || voiceState === "listening" || voiceState === "speaking";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conversations</h2>
            <button onClick={() => { setActiveConvId(null); setMessages([]); }} className="p-1 text-gray-400 hover:text-primary/80 transition-colors" title="New chat">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${activeConvId === conv.id ? "bg-accent text-accent-foreground" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}>
                <MessageSquare className="w-3 h-3 inline mr-2 opacity-50" />
                {conv.title}
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="px-3 py-8 text-xs text-gray-400 dark:text-gray-500 text-center">No conversations yet</p>
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <MessageSquare className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Chat</span>
            {voiceState === "listening" && <span className="text-xs text-red-500 animate-pulse">Listening...</span>}
            {voiceState === "processing" && <span className="text-xs text-yellow-500">Processing...</span>}
            {voiceState === "speaking" && <span className="text-xs text-primary">Speaking...</span>}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={audioEnabled} onChange={e => setAudioEnabled(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
              Audio responses
            </label>
            <a href="/app" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Back to app</a>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-20">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Start a conversation</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Type a message or tap the mic to speak</p>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"}`}>
                  <ChatMessageContent content={msg.content} role={msg.role} />
                  {msg.attachments_meta && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(JSON.parse(msg.attachments_meta) as Array<{name: string; type: string}>).map((att, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400">
                          {att.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {att.name.length > 20 ? att.name.slice(0, 17) + "..." : att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {streaming && streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <ChatMessageContent content={streamingText} role="assistant" />
                  <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />
                </div>
              </div>
            )}

            {streaming && !streamingText && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}

            {/* Live voice transcript */}
            {voiceState === "listening" && currentTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 border-2 border-dashed border-primary text-accent-foreground text-sm">
                  {currentTranscript}
                  <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Audio playback */}
        {playback.sourceUrl && (
          <div className="mx-4 mb-2 max-w-2xl self-center w-full">
            <div className="rounded-xl border border-accent bg-accent p-3">
              <div className="flex items-center gap-3">
                <button onClick={() => void togglePlayback()} className="p-1.5 text-primary hover:text-primary/80">
                  {playback.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex-1">
                  <input type="range" min={0} max={playback.duration || 0} value={playback.currentTime}
                    onChange={e => seekTo(Number(e.target.value))} className="w-full h-1 accent-[hsl(var(--primary))]" />
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    <span>{formatTime(playback.currentTime)}</span>
                    <span>{formatTime(playback.duration)}</span>
                  </div>
                </div>
                <select value={playback.playbackRate} onChange={e => setPlaybackRate(Number(e.target.value))}
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-transparent text-gray-600 dark:text-gray-400">
                  {PLAYBACK_RATES.map(r => <option key={r} value={r}>{r}x</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Hidden audio element for TTS */}
        <audio ref={audioRef} className="hidden" />

        {/* Pending files */}
        {pendingFiles.length > 0 && (
          <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
            <div className="flex flex-wrap gap-1.5">
              {pendingFiles.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400">
                  {f.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  {f.name.length > 20 ? f.name.slice(0, 17) + "..." : f.name}
                  <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="max-w-2xl mx-auto flex items-end gap-2">
            <input type="file" ref={fileInputRef} accept={ACCEPTED_TYPES} multiple onChange={handleFileSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isDisabled}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50">
              <Paperclip className="w-4 h-4" />
            </button>

            {isVoiceSupported && (
              <button type="button" onClick={() => void toggleListening()} disabled={streaming || voiceState === "speaking"}
                className={`p-2 rounded-lg transition-colors ${voiceState === "listening" ? "bg-red-500 text-white animate-pulse" : voiceState === "speaking" ? "bg-primary text-white" : "text-gray-400 hover:text-primary/80 hover:bg-primary/90/20"}`}>
                {voiceState === "listening" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={voiceState === "listening" ? "Listening..." : "Type a message..."}
              disabled={isDisabled} rows={1}
              className="flex-1 resize-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 max-h-[150px]" />

            <button type="submit" disabled={isDisabled || (!input.trim() && pendingFiles.length === 0)}
              className="p-2 text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Skeleton circle width="w-8" height="h-8" /></div>}>
      <ChatPage />
    </Suspense>
  );
}
