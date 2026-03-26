"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreator } from "@/components/creator-provider";
import {
  buildAssistantMemoryStorageKey,
  hydrateAssistantMemory,
  type AssistantMemory
} from "@/lib/assistant-memory";
import { appendAssistantEvent } from "@/lib/assistant-events";
import { buildAssistantBrief } from "@/lib/assistant";
import {
  brainstormCategories,
  buildBrainstormSuggestions,
  type BrainstormCategory,
  type BrainstormEntry
} from "@/lib/brainstorm";
import {
  buildConversionStorageKey,
  defaultConversionInputs,
  type ConversionInputs
} from "@/lib/conversion";

const STORAGE_KEY = "maddiehq:brainstorms";

export default function HomePage() {
  const { activeProfile } = useCreator();
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<BrainstormCategory>("Content idea");
  const [entries, setEntries] = useState<BrainstormEntry[]>([]);
  const [conversionInputs, setConversionInputs] = useState<ConversionInputs | null>(null);
  const [assistantMemory, setAssistantMemory] = useState<AssistantMemory>(() =>
    hydrateAssistantMemory(activeProfile.name)
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as BrainstormEntry[];
      if (Array.isArray(parsed)) {
        setEntries(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    const saved = window.localStorage.getItem(buildConversionStorageKey(activeProfile.id));

    if (!saved) {
      setConversionInputs(null);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<ConversionInputs>;
      setConversionInputs({ ...defaultConversionInputs, ...parsed });
    } catch {
      setConversionInputs(null);
    }
  }, [activeProfile.id]);

  useEffect(() => {
    const saved = window.localStorage.getItem(buildAssistantMemoryStorageKey(activeProfile.id));

    if (!saved) {
      setAssistantMemory(hydrateAssistantMemory(activeProfile.name));
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<AssistantMemory>;
      setAssistantMemory(hydrateAssistantMemory(activeProfile.name, parsed));
    } catch {
      setAssistantMemory(hydrateAssistantMemory(activeProfile.name));
    }
  }, [activeProfile.id, activeProfile.name]);

  const suggestions = useMemo(() => buildBrainstormSuggestions(draft, category), [category, draft]);
  const assistantBrief = useMemo(
    () =>
      buildAssistantBrief({
        profileName: activeProfile.name,
        draft,
        category,
        entries,
        conversionInputs,
        memory: assistantMemory
      }),
    [activeProfile.name, assistantMemory, category, conversionInputs, draft, entries]
  );

  function saveEntry() {
    const trimmed = draft.trim();

    if (!trimmed) {
      return;
    }

    const nextEntry: BrainstormEntry = {
      id: `${Date.now()}`,
      text: trimmed,
      category,
      createdAt: new Date().toISOString()
    };

    setEntries((current) => [nextEntry, ...current].slice(0, 8));
    setDraft("");
    appendAssistantEvent(activeProfile.id, {
      type: "brainstorm_saved",
      title: `Saved ${category.toLowerCase()}`,
      detail: trimmed
    });
  }

  function removeEntry(id: string) {
    const removed = entries.find((entry) => entry.id === id);
    setEntries((current) => current.filter((entry) => entry.id !== id));

    if (removed) {
      appendAssistantEvent(activeProfile.id, {
        type: "brainstorm_removed",
        title: `Removed ${removed.category.toLowerCase()}`,
        detail: removed.text
      });
    }
  }

  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Maddie HQ</p>
          <h1>Use the homepage like a brainstorm desk, not just a hallway.</h1>
          <p className="lede">
            Drop rough ideas here while they are still fresh, let the app suggest what
            kind of move it could become, then jump into the room that helps you act on it.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Brainstorm mode</span>
          <p>
            This homepage now acts like a quick capture notebook with lightweight guidance.
          </p>
        </div>
      </section>

      <section className="panel assistant-card">
        <div className="assistant-card__copy">
          <p className="eyebrow">{assistantBrief.eyebrow}</p>
          <h2>{assistantBrief.title}</h2>
          <p>
            {assistantBrief.summary}
          </p>
          <p className="assistant-card__memory-note">
            Saved mode: {assistantMemory.tone} · {assistantMemory.focus} focus
          </p>
        </div>
        <div className="assistant-card__note">
          <span className="suggestions-card__tag">{assistantBrief.focusLabel}</span>
          <div className="assistant-card__focus">
            <p className="assistant-card__focus-value">{assistantBrief.focusValue}</p>
            <p className="assistant-card__focus-detail">{assistantBrief.focusDetail}</p>
          </div>
          <ul>
            {assistantBrief.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="brainstorm-grid">
        <article className="panel brainstorm-panel">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Brain Dump</p>
              <h2>Log the idea before it disappears.</h2>
            </div>
            <span className="suggestions-card__tag">Saved in this browser</span>
          </div>

          <div className="brainstorm-form">
            <label className="input-card">
              <span className="input-card__label">Idea Type</span>
              <select
                className="input-card__field"
                value={category}
                onChange={(event) => setCategory(event.target.value as BrainstormCategory)}
              >
                {brainstormCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-card">
              <span className="input-card__label">Messy First Draft</span>
              <textarea
                className="input-card__field input-card__field--textarea"
                placeholder="Dump the raw thought here. It does not need to be polished."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <span className="input-card__help">
                This is for half-formed thoughts, content hooks, promo angles, or “what if”
                ideas you want to revisit later.
              </span>
            </label>

            <div className="brainstorm-actions">
              <button className="hero__cta" type="button" onClick={saveEntry}>
                Save brainstorm
              </button>
              <p className="brainstorm-actions__hint">
                The latest 8 brainstorms stay saved on this device.
              </p>
            </div>
          </div>
        </article>

        <article className="panel brainstorm-panel">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Smart Nudge</p>
              <h2>What this idea might turn into next.</h2>
            </div>
            <span className="suggestions-card__tag">Suggestion preview</span>
          </div>

          <div className="suggestion-grid">
            {suggestions.map((suggestion) => (
              <article className="suggestion-card" key={suggestion.title}>
                <div className="suggestion-card__header">
                  <div>
                    <p className="eyebrow">{suggestion.label}</p>
                    <h2>{suggestion.title}</h2>
                  </div>
                  <span className="suggestion-card__confidence">{suggestion.confidence}</span>
                </div>
                <p className="suggestion-card__action">{suggestion.action}</p>
                <div className="suggestion-card__footer">
                  <p className="suggestion-card__label">Why this helps</p>
                  <p className="suggestion-card__why">{suggestion.reason}</p>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Saved Brainstorms</p>
              <h2>Your recent raw ideas.</h2>
            </div>
            <span className="suggestions-card__tag">{entries.length} saved</span>
          </div>

          <div className="brainstorm-list">
            {entries.length ? (
              entries.map((entry) => (
                <article className="brainstorm-entry" key={entry.id}>
                  <div className="brainstorm-entry__top">
                    <span className="brainstorm-entry__tag">{entry.category}</span>
                    <button
                      className="brainstorm-entry__remove"
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                    >
                      Remove
                    </button>
                  </div>
                  <p>{entry.text}</p>
                </article>
              ))
            ) : (
              <div className="brainstorm-empty">
                <p>No brainstorms saved yet.</p>
                <p>Start with a messy idea above and the homepage will keep it here.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
