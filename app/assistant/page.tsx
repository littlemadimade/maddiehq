"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreator } from "@/components/creator-provider";
import {
  buildAssistantOpeningMessages,
  buildAssistantReply,
  type AssistantChatMessage
} from "@/lib/assistant-chat";
import {
  appendAssistantEvent,
  readAssistantEvents,
  type AssistantEvent
} from "@/lib/assistant-events";
import {
  buildAssistantMemoryStorageKey,
  hydrateAssistantMemory,
  type AssistantMemory
} from "@/lib/assistant-memory";
import { buildAssistantTeam } from "@/lib/assistant-team";
import {
  buildConversionSnapshot,
  buildConversionStorageKey,
  defaultConversionInputs,
  type ConversionInputs
} from "@/lib/conversion";

const CHAT_STORAGE_PREFIX = "maddiehq:assistant-chat";

function buildChatStorageKey(creatorId: string) {
  return `${CHAT_STORAGE_PREFIX}:${creatorId}`;
}

export default function AssistantPage() {
  const { activeProfile } = useCreator();
  const [memory, setMemory] = useState<AssistantMemory>(() =>
    hydrateAssistantMemory(activeProfile.name)
  );
  const [events, setEvents] = useState<AssistantEvent[]>([]);
  const [conversionInputs, setConversionInputs] = useState<ConversionInputs | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  const chatStorageKey = useMemo(() => buildChatStorageKey(activeProfile.id), [activeProfile.id]);
  const team = useMemo(() => buildAssistantTeam(memory), [memory]);
  const conversionSnapshot = useMemo(
    () => (conversionInputs ? buildConversionSnapshot(conversionInputs) : null),
    [conversionInputs]
  );

  useEffect(() => {
    setMessages([]);
  }, [chatStorageKey]);

  useEffect(() => {
    const savedMemory = window.localStorage.getItem(buildAssistantMemoryStorageKey(activeProfile.id));

    if (savedMemory) {
      try {
        setMemory(
          hydrateAssistantMemory(
            activeProfile.name,
            JSON.parse(savedMemory) as Partial<AssistantMemory>
          )
        );
      } catch {
        setMemory(hydrateAssistantMemory(activeProfile.name));
      }
    } else {
      setMemory(hydrateAssistantMemory(activeProfile.name));
    }

    setEvents(readAssistantEvents(activeProfile.id));

    const savedConversion = window.localStorage.getItem(buildConversionStorageKey(activeProfile.id));
    if (savedConversion) {
      try {
        setConversionInputs({
          ...defaultConversionInputs,
          ...(JSON.parse(savedConversion) as Partial<ConversionInputs>)
        });
      } catch {
        setConversionInputs(null);
      }
    } else {
      setConversionInputs(null);
    }
  }, [activeProfile.id, activeProfile.name]);

  useEffect(() => {
    const savedChat = window.localStorage.getItem(chatStorageKey);

    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat) as AssistantChatMessage[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          return;
        }
      } catch {
        window.localStorage.removeItem(chatStorageKey);
      }
    }

    setMessages((current) =>
      current.length ? current : buildAssistantOpeningMessages(memory, events, conversionInputs)
    );
  }, [chatStorageKey, conversionInputs, events, memory]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    window.localStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-18)));
  }, [chatStorageKey, messages]);

  function sendMessage() {
    const trimmed = draft.trim();

    if (!trimmed) {
      return;
    }

    const userMessage: AssistantChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
      speaker: activeProfile.name
    };

    const assistantMessage: AssistantChatMessage = {
      id: `${Date.now()}-assistant`,
      role: "assistant",
      text: buildAssistantReply({
        prompt: trimmed,
        memory,
        events,
        conversionInputs
      }),
      speaker: memory.assistantName
    };

    setMessages((current) => [...current, userMessage, assistantMessage].slice(-18));
    setDraft("");
    const newEvent = appendAssistantEvent(activeProfile.id, {
      type: "assistant_chat",
      title: "Assistant conversation happened",
      detail: trimmed
    });
    setEvents((current) => [newEvent, ...current].slice(0, 18));
  }

  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Assistant Room</p>
          <h1>Talk to the manager-style AI that is starting to learn your business.</h1>
          <p className="lede">
            This is the first real conversation room. It uses your saved assistant memory,
            recent app events, and your last conversion snapshot to talk more like an
            actual manager instead of a generic helper.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">{memory.assistantName}</span>
          <p>
            Current mode: {memory.tone} · {memory.focus} focus
          </p>
          {conversionSnapshot ? (
            <p className="hero__save-state">
              Leading with {conversionSnapshot.ofConversionLabel} OF conversion from{" "}
              {conversionSnapshot.pageViewsLabel} OF page views.
            </p>
          ) : null}
          <p className="hero__save-state">{events.length} recent events remembered</p>
        </div>
      </section>

      <section className="brainstorm-grid">
        <article className="panel assistant-room">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Conversation</p>
              <h2>Manager desk</h2>
            </div>
            <span className="suggestions-card__tag">Local memory for now</span>
          </div>

          <div className="chat-thread">
            {messages.map((message) => (
              <article
                className={`chat-message chat-message--${message.role}`}
                key={message.id}
              >
                <p className="chat-message__role">
                  {message.speaker ??
                    (message.role === "assistant" ? memory.assistantName : activeProfile.name)}
                </p>
                <p className="chat-message__text">{message.text}</p>
              </article>
            ))}
          </div>

          <div className="chat-composer">
            <textarea
              className="input-card__field input-card__field--short-textarea"
              placeholder="Ask what to focus on, what looks weak, what room to open next, or how the team should work."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="brainstorm-actions">
              <button className="hero__cta" type="button" onClick={sendMessage}>
                Ask assistant
              </button>
              <p className="brainstorm-actions__hint">
                This is still a rule-based manager layer, but it now has memory and conversation history.
              </p>
            </div>
          </div>
        </article>

        <article className="panel assistant-room">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Team</p>
              <h2>The first agency roles behind the manager.</h2>
            </div>
            <span className="suggestions-card__tag">{team.length} roles</span>
          </div>
          <div className="event-list">
            {team.map((member) => (
              <article className="event-card" key={member.role}>
                <p className="event-card__title">
                  {member.name} · {member.title}
                </p>
                <p className="event-card__detail">{member.specialty}</p>
                <ul className="event-card__list">
                  {member.responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel assistant-room">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Manager Conversion Read</p>
              <h2>What the manager is holding in mind right now.</h2>
            </div>
            <span className="suggestions-card__tag">Business context</span>
          </div>
          {conversionSnapshot ? (
            <div className="metric-grid">
              <article className="metric">
                <p className="metric__label">OF Conversion</p>
                <p className="metric__value">{conversionSnapshot.ofConversionLabel}</p>
              </article>
              <article className="metric">
                <p className="metric__label">Profile To OF</p>
                <p className="metric__value">{conversionSnapshot.profileToOfLabel}</p>
              </article>
              <article className="metric">
                <p className="metric__label">New Subs</p>
                <p className="metric__value">{conversionSnapshot.subsLabel}</p>
              </article>
              <article className="metric">
                <p className="metric__label">Top Spender</p>
                <p className="metric__value">{conversionSnapshot.topSpenderLabel}</p>
              </article>
            </div>
          ) : (
            <div className="brainstorm-empty">
              <p>No conversion snapshot loaded yet.</p>
              <p>Update the Conversion room and the manager will start carrying those numbers here.</p>
            </div>
          )}
        </article>

        <article className="panel assistant-room">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Recent Memory</p>
              <h2>What the assistant is tracking.</h2>
            </div>
            <span className="suggestions-card__tag">Per creator</span>
          </div>
          <div className="event-list">
            {events.length ? (
              events.slice(0, 8).map((event) => (
                <article className="event-card" key={event.id}>
                  <p className="event-card__title">{event.title}</p>
                  <p className="event-card__detail">{event.detail}</p>
                </article>
              ))
            ) : (
              <div className="brainstorm-empty">
                <p>No assistant events saved yet.</p>
                <p>Start logging ideas or updating Conversion and the assistant will begin building a working memory.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
