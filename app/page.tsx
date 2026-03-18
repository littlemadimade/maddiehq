"use client";

import { useEffect, useMemo, useState } from "react";
import {
  brainstormCategories,
  buildBrainstormSuggestions,
  type BrainstormCategory,
  type BrainstormEntry
} from "@/lib/brainstorm";

const STORAGE_KEY = "maddiehq:brainstorms";

export default function HomePage() {
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<BrainstormCategory>("Content idea");
  const [entries, setEntries] = useState<BrainstormEntry[]>([]);

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

  const suggestions = useMemo(() => buildBrainstormSuggestions(draft, category), [category, draft]);

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
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
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
