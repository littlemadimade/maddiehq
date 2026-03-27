"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCreator } from "@/components/creator-provider";
import { appendAssistantEvent } from "@/lib/assistant-events";
import {
  buildConversionSummary,
  buildConversionStorageKey,
  defaultConversionInputs,
  formatWholeNumber,
  managerNotes,
  type ConversionInputs
} from "@/lib/conversion";

export default function ConversionPage() {
  const { activeProfile } = useCreator();
  const [inputs, setInputs] = useState<ConversionInputs>(defaultConversionInputs);
  const [saveState, setSaveState] = useState("Using starter values");
  const hasHydratedInputs = useRef(false);
  const summary = useMemo(() => buildConversionSummary(inputs), [inputs]);
  const storageKey = useMemo(() => buildConversionStorageKey(activeProfile.id), [activeProfile.id]);

  const inputFields: Array<{
    key: keyof ConversionInputs;
    label: string;
    help: string;
  }> = [
    { key: "reelViews", label: "Reel Views", help: "A good reel traffic marker for you right now." },
    { key: "profileVisits", label: "Profile Visits", help: "People who checked your Instagram profile." },
    { key: "ofPageViews", label: "OF Page Views", help: "People who reached your OF page." },
    { key: "newSubscribers", label: "New Subscribers", help: "How many new subs came in." },
    { key: "totalSubscribers", label: "Current Subscribers", help: "Your current subscriber count." },
    { key: "wallLikes", label: "Wall Likes", help: "A basic engagement/quality signal." },
    { key: "tipsCount", label: "Tips Count", help: "How often people tipped during the period." },
    { key: "topSpenderAmount", label: "Top Spender Amount", help: "Highest spender amount for the period." }
  ];

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (!saved) {
      setInputs(defaultConversionInputs);
      setSaveState(`Using starter values for ${activeProfile.name}`);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<ConversionInputs>;
      setInputs((current) => ({
        ...current,
        ...Object.fromEntries(
          Object.entries(parsed).filter((entry): entry is [keyof ConversionInputs, number] =>
            typeof entry[1] === "number"
          )
        )
      }));
      setSaveState(`Loaded saved values for ${activeProfile.name}`);
    } catch {
      setSaveState("Could not read saved values");
    }
  }, [activeProfile.name, storageKey]);

  useEffect(() => {
    if (!hasHydratedInputs.current) {
      hasHydratedInputs.current = true;
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(inputs));
    setSaveState(`Saved for ${activeProfile.name} on this device`);

    appendAssistantEvent(activeProfile.id, {
      type: "conversion_updated",
      title: "Updated conversion snapshot",
      detail: `${inputs.newSubscribers} new subs from ${inputs.ofPageViews} OF page views`
    });
  }, [activeProfile.id, activeProfile.name, inputs, storageKey]);

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">Conversion</h1>
        {saveState ? <p className="page-header__status">{saveState}</p> : null}
      </header>

      <section className="overview-grid">
        {summary.stats.map((signal) => (
          <article className="stat-card panel" key={signal.label}>
            <p className="stat-card__label">{signal.label}</p>
            <p className="stat-card__value">{signal.value}</p>
            <p className="stat-card__change">{signal.note}</p>
          </article>
        ))}
      </section>

      <section className="panel funnel-card">
        <div className="funnel-card__header">
          <div>
            <p className="eyebrow">Funnel Snapshot</p>
            <h2>From reel attention to subscriber conversion.</h2>
          </div>
          <span className="suggestions-card__tag">Instagram to OF</span>
        </div>
        <div className="funnel-grid">
          {summary.funnel.map((stage, index) => (
            <article className="funnel-stage" key={stage.label}>
              <p className="funnel-stage__step">Step {index + 1}</p>
              <p className="funnel-stage__label">{stage.label}</p>
              <p className="funnel-stage__value">{stage.value}</p>
              <p className="funnel-stage__detail">{stage.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="conversion-grid">
        <article className="panel">
          <div className="suggestions-card__header">
            <p className="eyebrow">Manual Input</p>
            <span className="suggestions-card__tag">Use your real numbers</span>
          </div>
          <div className="input-toolbar">
            <p className="input-toolbar__text">
              These values now save in this browser, so you can refresh without losing them.
            </p>
            <button
              className="input-toolbar__button"
              type="button"
              onClick={() => {
                setInputs(defaultConversionInputs);
                window.localStorage.removeItem(storageKey);
                setSaveState(`Reset ${activeProfile.name} to starter values`);
                appendAssistantEvent(activeProfile.id, {
                  type: "conversion_reset",
                  title: "Reset conversion values",
                  detail: "Cleared the current OF conversion snapshot back to starter values."
                });
              }}
            >
              Reset values
            </button>
          </div>
          <div className="input-grid">
            {inputFields.map((field) => (
              <label className="input-card" key={field.key}>
                <span className="input-card__label">{field.label}</span>
                <input
                  className="input-card__field"
                  type="number"
                  min="0"
                  value={inputs[field.key]}
                  onChange={(event) =>
                    setInputs((current) => ({
                      ...current,
                      [field.key]: Number(event.target.value)
                    }))
                  }
                />
                <span className="input-card__help">{field.help}</span>
              </label>
            ))}
          </div>
          <article className="reel-card">
            <h3>Why this matters</h3>
            <p className="reel-card__hook">
              You told me you can reliably access these numbers even if the deeper message-result data is still fuzzy.
            </p>
            <div className="reel-card__metrics">
              <span>{formatWholeNumber(inputs.ofPageViews)} OF page views</span>
              <span>{formatWholeNumber(inputs.newSubscribers)} new subs</span>
              <span>{formatWholeNumber(inputs.tipsCount)} tips</span>
            </div>
            <p className="reel-card__takeaway">
              That is enough for the app to start telling you whether traffic is becoming subscribers, and whether those subscribers show signs of value.
            </p>
          </article>
        </article>

        <article className="panel">
          <div className="suggestions-card__header">
            <p className="eyebrow">What This Means</p>
            <span className="suggestions-card__tag">Explained simply</span>
          </div>
          <div className="explanation-list">
            {summary.explanation.map((point) => (
              <article className="explanation-card" key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel breakdown-card">
          <p className="eyebrow">Current Read</p>
          <h2>Your biggest job now is figuring out whether traffic is becoming subscribers at the rate you want.</h2>
          <p>
            You said your managers talk about wanting the page-view-to-subscriber
            ratio closer to 3-4%. This room gives you a place to plug in the pieces
            you already have and let the app do the rough conversion math for you.
          </p>
          <p>
            It is not the final version yet, but it is now a practical first step
            toward answering the question that matters: is your traffic actually turning
            into subscriber growth and better business outcomes?
          </p>
        </article>

        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Manager Notes</p>
            <span className="suggestions-card__tag">Useful to track</span>
          </div>
          <ul>
            {managerNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
