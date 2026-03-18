"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildConversionSummary,
  defaultConversionInputs,
  formatWholeNumber,
  managerNotes,
  type ConversionInputs
} from "@/lib/conversion";

const STORAGE_KEY = "maddiehq:conversion-inputs";

export default function ConversionPage() {
  const [inputs, setInputs] = useState<ConversionInputs>(defaultConversionInputs);
  const [saveState, setSaveState] = useState("Using starter values");
  const summary = useMemo(() => buildConversionSummary(inputs), [inputs]);

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
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
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
      setSaveState("Loaded your saved values");
    } catch {
      setSaveState("Could not read saved values");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    setSaveState("Saved on this device");
  }, [inputs]);

  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Conversion Room</p>
          <h1>See whether your Instagram content is actually translating into OnlyFans results.</h1>
          <p className="lede">
            This room is about the funnel from attention to money. Plug in the OF-side
            numbers you already know, and this page will turn them into a clearer
            picture of how your Instagram traffic is translating into subscribers and spending signals.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Business layer</span>
          <p>
            Insights tells you how content performs. Conversion tells you whether
            that attention is actually moving toward OF traffic and paid action.
          </p>
          <p className="hero__save-state">{saveState}</p>
        </div>
      </section>

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
                window.localStorage.removeItem(STORAGE_KEY);
                setSaveState("Reset to starter values");
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
