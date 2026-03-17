import { platformCards, suggestions } from "@/lib/insights";

const focusMap: Record<string, string[]> = {
  "Hook strategy": [
    "Use payoff-first openings.",
    "Cut setup lines that delay the good part.",
    "Review which first 2 seconds create the best retention."
  ],
  "Content style": [
    "Batch one more casual concept this week.",
    "Keep edits tighter and less over-produced.",
    "Reuse behind-the-scenes angles that already earned shares."
  ],
  Packaging: [
    "Write cover text that promises a clear payoff.",
    "Choose brighter, easier-to-read thumbnails.",
    "Avoid muted covers that hide the idea."
  ],
  "Audience engagement": [
    "Pair posts with a story poll or question.",
    "Use replies to learn what angle to make next.",
    "Treat stories as follow-up, not filler."
  ],
  Timing: [
    "Put strong posts into the evening slot first.",
    "Only test weak daytime windows intentionally.",
    "Track whether weeknights keep beating early posts."
  ]
};

export default function SuggestionsPage() {
  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Suggestions Engine</p>
          <h1>Recommended next moves based on the signals already showing up in your content.</h1>
          <p className="lede">
            This page turns patterns from your insights into action ideas, so you
            do not have to stare at numbers and guess what they mean.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Decision support</span>
          <p>
            These suggestions are generated from the current insights data model.
            As the app gets real data later, the recommendations can get smarter too.
          </p>
        </div>
      </section>

      <section className="overview-grid">
        <article className="stat-card panel">
          <p className="stat-card__label">Suggestion Count</p>
          <p className="stat-card__value">{suggestions.length}</p>
          <p className="stat-card__change">Active recommendation areas</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-card__label">Based On</p>
          <p className="stat-card__value">{platformCards.length} Platforms</p>
          <p className="stat-card__change">TikTok + Instagram signals</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-card__label">Strongest Focus</p>
          <p className="stat-card__value">Hooks</p>
          <p className="stat-card__change">Retention is driving the advice</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-card__label">Format Bias</p>
          <p className="stat-card__value">Short-form</p>
          <p className="stat-card__change">Video-first strategy remains strongest</p>
        </article>
      </section>

      <section className="suggestion-grid">
        {suggestions.map((suggestion) => (
          <article className="panel suggestion-card" key={suggestion.title}>
            <div className="suggestion-card__header">
              <div>
                <p className="eyebrow">{suggestion.focus}</p>
                <h2>{suggestion.title}</h2>
              </div>
              <span className="suggestion-card__confidence">{suggestion.confidence}</span>
            </div>
            <p className="suggestion-card__action">{suggestion.action}</p>
            <p className="suggestion-card__why">{suggestion.why}</p>
            <div className="suggestion-card__footer">
              <p className="suggestion-card__label">Try this next</p>
              <ul>
                {(focusMap[suggestion.focus] ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
