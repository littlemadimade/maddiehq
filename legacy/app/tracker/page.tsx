"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreator } from "@/components/creator-provider";
import { appendAssistantEvent } from "@/lib/assistant-events";
import {
  buildTrackerStats,
  buildTrackerStorageKey,
  defaultTrackerTasks,
  groupTasksByStatus,
  trackerStatuses,
  type TrackerStatus,
  type TrackerTask
} from "@/lib/tracker";

const dailyChecklist = [
  "Check what is due today before making new content.",
  "Move at least one task from In Progress to Ready.",
  "Review yesterday's posted content for early performance signals.",
  "Write down one content idea before ending the day."
];

const defaultDraft = {
  title: "",
  platform: "Instagram Reel",
  due: "Today",
  note: "",
  status: "Ideas" as TrackerStatus
};

export default function TrackerPage() {
  const { activeProfile } = useCreator();
  const [tasks, setTasks] = useState<TrackerTask[]>(defaultTrackerTasks);
  const [saveState, setSaveState] = useState("Using starter workflow");
  const [draft, setDraft] = useState(defaultDraft);
  const storageKey = useMemo(() => buildTrackerStorageKey(activeProfile.id), [activeProfile.id]);
  const groupedColumns = useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const todayStats = useMemo(() => buildTrackerStats(tasks), [tasks]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (!saved) {
      setTasks(defaultTrackerTasks);
      setSaveState(`Using starter workflow for ${activeProfile.name}`);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as TrackerTask[];
      setTasks(Array.isArray(parsed) && parsed.length ? parsed : defaultTrackerTasks);
      setSaveState(`Loaded tracker board for ${activeProfile.name}`);
    } catch {
      setTasks(defaultTrackerTasks);
      setSaveState(`Could not load saved tracker board for ${activeProfile.name}`);
    }
  }, [activeProfile.name, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(tasks));
    setSaveState(`Saved tracker board for ${activeProfile.name} on this device`);
  }, [activeProfile.name, storageKey, tasks]);

  function addTask() {
    const trimmedTitle = draft.title.trim();
    const trimmedNote = draft.note.trim();

    if (!trimmedTitle) {
      return;
    }

    const nextTask: TrackerTask = {
      id: `${Date.now()}`,
      title: trimmedTitle,
      platform: draft.platform,
      due: draft.due.trim() || "Soon",
      note: trimmedNote || "No note yet.",
      status: draft.status
    };

    setTasks((current) => [nextTask, ...current]);
    setDraft(defaultDraft);
    appendAssistantEvent(activeProfile.id, {
      type: "tracker_updated",
      title: `Added tracker task in ${nextTask.status.toLowerCase()}`,
      detail: nextTask.title
    });
  }

  function moveTask(id: string, direction: -1 | 1) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) {
          return task;
        }

        const currentIndex = trackerStatuses.indexOf(task.status);
        const nextStatus = trackerStatuses[currentIndex + direction];

        if (!nextStatus) {
          return task;
        }

        appendAssistantEvent(activeProfile.id, {
          type: "tracker_updated",
          title: `Moved task to ${nextStatus.toLowerCase()}`,
          detail: task.title
        });

        return { ...task, status: nextStatus };
      })
    );
  }

  function removeTask(id: string) {
    const task = tasks.find((entry) => entry.id === id);
    setTasks((current) => current.filter((entry) => entry.id !== id));

    if (task) {
      appendAssistantEvent(activeProfile.id, {
        type: "tracker_removed",
        title: "Removed tracker task",
        detail: task.title
      });
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">Tracker</h1>
        {saveState ? <p className="page-header__status">{saveState}</p> : null}
      </header>

      <section className="overview-grid">
        {todayStats.map((stat) => (
          <article className="stat-card panel" key={stat.label}>
            <p className="stat-card__label">{stat.label}</p>
            <p className="stat-card__value">{stat.value}</p>
            <p className="stat-card__change">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="tracker-grid">
        <article className="panel tracker-column">
          <div className="suggestions-card__header">
            <div>
              <p className="eyebrow">Add Task</p>
              <h2>Drop in the next thing that needs to happen.</h2>
            </div>
            <span className="suggestions-card__tag">Saved per creator</span>
          </div>

          <div className="creator-form">
            <label className="input-card">
              <span className="input-card__label">Task Name</span>
              <input
                className="input-card__field"
                placeholder="Ex: shoot soft morning Reel"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <div className="input-grid">
              <label className="input-card">
                <span className="input-card__label">Platform</span>
                <input
                  className="input-card__field"
                  value={draft.platform}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, platform: event.target.value }))
                  }
                />
              </label>

              <label className="input-card">
                <span className="input-card__label">Due</span>
                <input
                  className="input-card__field"
                  value={draft.due}
                  onChange={(event) => setDraft((current) => ({ ...current, due: event.target.value }))}
                />
              </label>
            </div>

            <label className="input-card">
              <span className="input-card__label">Starting Stage</span>
              <select
                className="input-card__field"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as TrackerStatus
                  }))
                }
              >
                {trackerStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-card">
              <span className="input-card__label">Note</span>
              <textarea
                className="input-card__field input-card__field--short-textarea"
                placeholder="What does this task need, or what should future-you remember?"
                value={draft.note}
                onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
              />
            </label>

            <div className="brainstorm-actions">
              <button className="hero__cta" type="button" onClick={addTask}>
                Add tracker task
              </button>
              <p className="brainstorm-actions__hint">
                Every move here gives the assistant more real operational context.
              </p>
            </div>
          </div>
        </article>

        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Daily Checklist</p>
            <span className="suggestions-card__tag">Stay consistent</span>
          </div>
          <ul>
            {dailyChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="tracker-grid">
        {groupedColumns.map((column) => (
          <article className="panel tracker-column" key={column.title}>
            <div className="tracker-column__header">
              <div>
                <p className="eyebrow">{column.title}</p>
                <h2>{column.description}</h2>
              </div>
              <span className="suggestions-card__tag">{column.tasks.length} tasks</span>
            </div>

            <div className="tracker-list">
              {column.tasks.length ? (
                column.tasks.map((task) => {
                  const statusIndex = trackerStatuses.indexOf(task.status);

                  return (
                    <div className="task-card" key={task.id}>
                      <div className="task-card__top">
                        <h3>{task.title}</h3>
                        <span className="task-card__platform">{task.platform}</span>
                      </div>
                      <p className="task-card__due">{task.due}</p>
                      <p className="task-card__note">{task.note}</p>
                      <div className="task-card__actions">
                        <button
                          className="task-card__action"
                          type="button"
                          disabled={statusIndex === 0}
                          onClick={() => moveTask(task.id, -1)}
                        >
                          Back
                        </button>
                        <button
                          className="task-card__action"
                          type="button"
                          disabled={statusIndex === trackerStatuses.length - 1}
                          onClick={() => moveTask(task.id, 1)}
                        >
                          Forward
                        </button>
                        <button
                          className="task-card__action task-card__action--danger"
                          type="button"
                          onClick={() => removeTask(task.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="brainstorm-empty">
                  <p>No tasks in this stage yet.</p>
                  <p>Add one above or move work here when it is ready.</p>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="bottom-grid">
        <article className="panel breakdown-card">
          <p className="eyebrow">How To Use It</p>
          <h2>This is now the actual production board, not just a visual example.</h2>
          <p>
            The goal is to make it obvious what needs attention today. If something
            stays stuck in one stage too long, that usually means your workflow is the
            problem, not your motivation.
          </p>
          <p>
            Because the board is now interactive and saved per creator, the assistant
            can start learning from real execution behavior instead of a fake template.
          </p>
        </article>

        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Manager Angle</p>
            <span className="suggestions-card__tag">Operational context</span>
          </div>
          <ul>
            <li>Tasks moving forward tells the assistant what part of the pipeline is healthy.</li>
            <li>Tasks getting stuck helps the assistant spot execution bottlenecks.</li>
            <li>Posted tasks create useful context for later Insights and Conversion review.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
