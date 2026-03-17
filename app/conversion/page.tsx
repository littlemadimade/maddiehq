import {
  convertingReels,
  explanationPoints,
  funnelStages,
  managerNotes,
  revenueSignals
} from "@/lib/conversion";

export default function ConversionPage() {
  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Conversion Room</p>
          <h1>See whether your Instagram content is actually translating into OnlyFans results.</h1>
          <p className="lede">
            This room is about the funnel from attention to money. It helps you
            see where people are dropping off, where they are converting, and what
            kinds of reels appear to bring in stronger business outcomes.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Business layer</span>
          <p>
            Insights tells you how content performs. Conversion tells you whether
            that attention is actually moving toward OF traffic and paid action.
          </p>
        </div>
      </section>

      <section className="overview-grid">
        {revenueSignals.map((signal) => (
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
            <h2>From Reel attention to paid conversion.</h2>
          </div>
          <span className="suggestions-card__tag">Instagram to OF</span>
        </div>
        <div className="funnel-grid">
          {funnelStages.map((stage, index) => (
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
            <p className="eyebrow">Top Converting Reels</p>
            <span className="suggestions-card__tag">Revenue signals</span>
          </div>
          <div className="reel-list">
            {convertingReels.map((reel) => (
              <article className="reel-card" key={reel.title}>
                <h3>{reel.title}</h3>
                <p className="reel-card__hook">{reel.hook}</p>
                <div className="reel-card__metrics">
                  <span>{reel.reach}</span>
                  <span>{reel.profileActions}</span>
                  <span>{reel.ofSignal}</span>
                </div>
                <p className="reel-card__takeaway">{reel.takeaway}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="suggestions-card__header">
            <p className="eyebrow">What This Means</p>
            <span className="suggestions-card__tag">Explained simply</span>
          </div>
          <div className="explanation-list">
            {explanationPoints.map((point) => (
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
          <h2>Your biggest opportunity is not more reach. It is improving the handoff from Instagram interest into stronger OF intent.</h2>
          <p>
            In this MVP sample, the top of the funnel is healthy enough to work
            with. The more valuable question is what makes someone move from
            &quot;that reel was interesting&quot; to &quot;I want more of this creator right now.&quot;
          </p>
          <p>
            The posts that convert best appear to create clarity fast, feel personal,
            and make the next step feel natural rather than forced. That is the pattern
            to keep pressure-testing.
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
