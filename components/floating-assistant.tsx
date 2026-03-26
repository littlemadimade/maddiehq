"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCreator } from "@/components/creator-provider";
import {
  buildAssistantMemoryStorageKey,
  hydrateAssistantMemory,
  type AssistantMemory
} from "@/lib/assistant-memory";
import { readAssistantEvents } from "@/lib/assistant-events";

export function FloatingAssistant() {
  const pathname = usePathname();
  const { activeProfile } = useCreator();
  const [open, setOpen] = useState(false);
  const [memory, setMemory] = useState<AssistantMemory>(() =>
    hydrateAssistantMemory(activeProfile.name)
  );
  const [recentEventTitle, setRecentEventTitle] = useState("");

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

    const latestEvent = readAssistantEvents(activeProfile.id)[0];
    setRecentEventTitle(latestEvent?.title ?? "");
  }, [activeProfile.id, activeProfile.name, pathname]);

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
              aria-label="Close Kian launcher"
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

          <div className="floating-assistant__actions">
            <Link className="hero__cta" href="/assistant" onClick={() => setOpen(false)}>
              Open Kian
            </Link>
            <span className="floating-assistant__status">
              {memory.tone} · {memory.focus} focus
            </span>
          </div>
        </div>
      ) : null}

      <button
        aria-label="Open Kian assistant"
        className="floating-assistant__bubble"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="floating-assistant__glow" aria-hidden="true" />
        <span className="floating-assistant__name">Kian</span>
        <span className="floating-assistant__hint">Manager</span>
      </button>
    </div>
  );
}
