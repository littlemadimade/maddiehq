"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreator } from "@/components/creator-provider";
import {
  buildAssistantMemoryStorageKey,
  hydrateAssistantMemory,
  type AssistantMemory
} from "@/lib/assistant-memory";
import { appendAssistantEvent, readAssistantEvents, type AssistantEvent } from "@/lib/assistant-events";
import { buildAssistantBrief } from "@/lib/assistant";
import {
  brainstormCategories,
  buildBrainstormSuggestions,
  type BrainstormCategory,
  type BrainstormEntry
} from "@/lib/brainstorm";
import {
  buildConversionSnapshot,
  buildConversionStorageKey,
  defaultConversionInputs,
  type ConversionInputs
} from "@/lib/conversion";
import { buildTrackerStats, buildTrackerStorageKey, defaultTrackerTasks, type TrackerTask } from "@/lib/tracker";

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
  const [trackerTasks, setTrackerTasks] = useState<TrackerTask[]>(defaultTrackerTasks);
  const [events, setEvents] = useState<AssistantEvent[]>([]);

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
    const saved = window.localStorage.getItem(buildTrackerStorageKey(activeProfile.id));

    if (!saved) {
      setTrackerTasks(defaultTrackerTasks);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as TrackerTask[];
      setTrackerTasks(Array.isArray(parsed) && parsed.length ? parsed : defaultTrackerTasks);
    } catch {
      setTrackerTasks(defaultTrackerTasks);
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

  useEffect(() => {
    setEvents(readAssistantEvents(activeProfile.id));
  }, [activeProfile.id, entries, trackerTasks, conversionInputs]);

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
  const conversionSnapshot = useMemo(
    () => (conversionInputs ? buildConversionSnapshot(conversionInputs) : null),
    [conversionInputs]
  );
  const trackerStats = useMemo(() => buildTrackerStats(trackerTasks), [trackerTasks]);
  const priorityTasks = useMemo(
    () => trackerTasks.filter((task) => task.status !== "Posted").slice(0, 4),
    [trackerTasks]
  );
  const recentEvents = useMemo(() => events.slice(0, 4), [events]);

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
      <section className="hero panel command-hero">
        <div>
          <p className="eyebrow">Command Room</p>
          <h1>See what matters now, what is moving, and what the manager wants next.</h1>
          <p className="lede">
            Home should feel like the briefing board for the whole app. Start here for the
            manager read, workflow urgency, business pulse, and a quick place to capture ideas.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Manager briefing</span>
          <p>
            Current operator: {assistantMemory.assistantName}
          </p>
          <p className="hero__save-state">{assistantMemory.currentPriority}</p>
        </div>
      </section>

      <section className="panel assistant-card command-brief">
        <div className="assistant-card__copy">
          <p className="eyebrow">{assistantBrief.eyebrow}</p>
          <h2>{assistantBrief.title}</h2>
          <p>{assistantBrief.summary}</p>
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

      <section className="overview-grid command-stats">
        {trackerStats.map((stat) => (
          <article className="stat-card panel" key={stat.label}>
            <p className="stat-card__label">{stat.label}</p>
            <p className="stat-card__value">{stat.value}</p>
            <p className="stat-card__change">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="brainstorm-grid command-grid">
        <article className="panel command-panel">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Business Pulse</p>
              <h2>What the money-side story looks like right now.</h2>
            </div>
            <span className="suggestions-card__tag">Manager read</span>
          </div>

          {conversionSnapshot ? (
            <div className="metric-grid">
              <div className="metric">
                <p className="metric__label">OF Conversion</p>
                <p className="metric__value">{conversionSnapshot.ofConversionLabel}</p>
              </div>
              <div className="metric">
                <p className="metric__label">Profile To OF</p>
                <p className="metric__value">{conversionSnapshot.profileToOfLabel}</p>
              </div>
              <div className="metric">
                <p className="metric__label">New Subs</p>
                <p className="metric__value">{conversionSnapshot.subsLabel}</p>
              </div>
              <div className="metric">
                <p className="metric__label">Top Spender</p>
                <p className="metric__value">{conversionSnapshot.topSpenderLabel}</p>
              </div>
            </div>
          ) : (
            <div className="brainstorm-empty">
              <p>No conversion read yet.</p>
              <p>Update the Conversion room and Home will start briefing you with real business context.</p>
            </div>
          )}
        </article>

        <article className="panel command-panel">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Priority Queue</p>
              <h2>What is active in the workflow right now.</h2>
            </div>
            <span className="suggestions-card__tag">{priorityTasks.length} active</span>
          </div>

          <div className="tracker-list">
            {priorityTasks.length ? (
              priorityTasks.map((task) => (
                <div className="task-card" key={task.id}>
                  <div className="task-card__top">
                    <h3>{task.title}</h3>
                    <span className="task-card__platform">{task.status}</span>
                  </div>
                  <p className="task-card__due">{task.due}</p>
                  <p className="task-card__note">{task.note}</p>
                </div>
              ))
            ) : (
              <div className="brainstorm-empty">
                <p>No active workflow items yet.</p>
                <p>Add a tracker task and Home will surface it here.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="brainstorm-grid">
        <article className="panel brainstorm-panel command-panel">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Quick Capture</p>
              <h2>Catch the next useful idea without leaving the command room.</h2>
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

        <article className="panel brainstorm-panel command-panel">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Next Move</p>
              <h2>What the manager thinks this should become.</h2>
            </div>
            <span className="suggestions-card__tag">Action direction</span>
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
        <article className="panel command-panel">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">System Pulse</p>
              <h2>Latest things the manager is paying attention to.</h2>
            </div>
            <span className="suggestions-card__tag">{recentEvents.length} recent</span>
          </div>

          <div className="event-list">
            {recentEvents.length ? (
              recentEvents.map((event) => (
                <article className="event-card" key={event.id}>
                  <p className="event-card__title">{event.title}</p>
                  <p className="event-card__detail">{event.detail}</p>
                </article>
              ))
            ) : (
              <div className="brainstorm-empty">
                <p>No system events yet.</p>
                <p>Use the app a little more and the manager pulse will fill in here.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel command-panel">
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
