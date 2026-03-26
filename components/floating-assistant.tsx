"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCreator } from "@/components/creator-provider";
import { buildAssistantReply } from "@/lib/assistant-chat";
import { appendAssistantEvent, readAssistantEvents, type AssistantEvent } from "@/lib/assistant-events";
import {
  buildAssistantMemoryStorageKey,
  hydrateAssistantMemory,
  type AssistantMemory
} from "@/lib/assistant-memory";
import {
  buildConversionSnapshot,
  buildConversionStorageKey,
  defaultConversionInputs,
  type ConversionInputs
} from "@/lib/conversion";

export function FloatingAssistant() {
  const pathname = usePathname();
  const { activeProfile } = useCreator();
  const [open, setOpen] = useState(false);
  const [memory, setMemory] = useState<AssistantMemory>(() =>
    hydrateAssistantMemory(activeProfile.name)
  );
  const [recentEventTitle, setRecentEventTitle] = useState("");
  const [events, setEvents] = useState<AssistantEvent[]>([]);
  const [conversionInputs, setConversionInputs] = useState<ConversionInputs | null>(null);
  const [quickQuestion, setQuickQuestion] = useState("");
  const [quickAnswer, setQuickAnswer] = useState("");
  const conversionSnapshot = conversionInputs ? buildConversionSnapshot(conversionInputs) : null;

  useEffect(() => {
    const saved = window.localStorage.getItem(buildAssistantMemoryStorageKey(activeProfile.id));

    if (saved) {
      try {
        setMemory(hydrateAssistantMemory(activeProfile.name, JSON.parse(saved) as Partial<AssistantMemory>));
      } catch {
        setMemory(hydrateAssistantMemory(activeProfile.name));
      }
    } else {
      setMemory(hydrateAssistantMemory(activeProfile.name));
    }

    const savedEvents = readAssistantEvents(activeProfile.id);
    const latestEvent = savedEvents[0];
    setEvents(savedEvents);
    setRecentEventTitle(latestEvent?.title ?? "");

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

    setQuickQuestion("");
    setQuickAnswer("");
  }, [activeProfile.id, activeProfile.name, pathname]);

  function askQuickQuestion() {
    const trimmed = quickQuestion.trim();

    if (!trimmed) {
      return;
    }

    const answer = buildAssistantReply({
      prompt: trimmed,
      memory,
      events,
      conversionInputs
    });

    setQuickAnswer(answer);
    const newEvent = appendAssistantEvent(activeProfile.id, {
      type: "assistant_chat",
      title: "Quick manager question",
      detail: trimmed
    });
    setEvents((current) => [newEvent, ...current].slice(0, 18));
    setRecentEventTitle(newEvent.title);
  }

  return (
    <div className="floating-assistant">
      {open ? (
        <div className="floating-assistant__panel">
          <div className="floating-assistant__header">
            <div>
              <p className="eyebrow">Manager Online</p>
              <h2>{memory.assistantName}</h2>
            </div>
            <button
              aria-label="Close manager bot launcher"
              className="floating-assistant__close"
              type="button"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <p className="floating-assistant__summary">{memory.currentPriority}</p>
          <p className="floating-assistant__detail">
            {recentEventTitle
              ? `Latest thing I noticed: ${recentEventTitle.toLowerCase()}.`
              : "I am ready when you want a quick manager read or want to jump into the full assistant room."}
          </p>

          {conversionSnapshot ? (
            <div className="floating-assistant__conversion">
              <p className="floating-assistant__conversion-label">Conversion read</p>
              <div className="floating-assistant__conversion-grid">
                <div>
                  <span>OF conversion</span>
                  <strong>{conversionSnapshot.ofConversionLabel}</strong>
                </div>
                <div>
                  <span>New subs</span>
                  <strong>{conversionSnapshot.subsLabel}</strong>
                </div>
                <div>
                  <span>OF page views</span>
                  <strong>{conversionSnapshot.pageViewsLabel}</strong>
                </div>
                <div>
                  <span>Top spender</span>
                  <strong>{conversionSnapshot.topSpenderLabel}</strong>
                </div>
              </div>
            </div>
          ) : null}

          <div className="floating-assistant__quick">
            <textarea
              className="input-card__field floating-assistant__input"
              placeholder="Ask one quick question, like how conversions look..."
              value={quickQuestion}
              onChange={(event) => setQuickQuestion(event.target.value)}
            />
            <div className="floating-assistant__quick-actions">
              <button className="hero__cta" type="button" onClick={askQuickQuestion}>
                Ask
              </button>
              <span className="floating-assistant__status">
                {memory.tone} · {memory.focus} focus
              </span>
            </div>
          </div>

          {quickAnswer ? (
            <div className="floating-assistant__answer">
              <p className="floating-assistant__answer-label">{memory.assistantName}</p>
              <p className="floating-assistant__answer-text">{quickAnswer}</p>
            </div>
          ) : null}

          <div className="floating-assistant__actions">
            <Link className="hero__cta" href="/assistant" onClick={() => setOpen(false)}>
              Open Assistant Room
            </Link>
          </div>
        </div>
      ) : null}

      <button
        aria-label="Open manager bot assistant"
        className="floating-assistant__bubble"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="floating-assistant__glow" aria-hidden="true" />
        <span className="floating-assistant__name">Manager Bot</span>
        <span className="floating-assistant__hint">Quick Help</span>
      </button>
    </div>
  );
}
