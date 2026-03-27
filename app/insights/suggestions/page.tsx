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
      <header className="page-header">
        <h1 className="page-title">Suggestions</h1>
      </header>

      <section className="overview-grid">
        <article className="stat-card panel">
          <p className="stat-card__label">Suggestion Count</p>
          <p className="stat-card__value">{suggestions.length}</p>
          <p className="stat-card__change">Active recommendation areas</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-card__label">Based On</p>
          <p className="stat-card__value">Instagram</p>
          <p className="stat-card__change">{platformCards.length} insight profile in this MVP</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-card__label">Strongest Focus</p>
          <p className="stat-card__value">Hooks</p>
          <p className="stat-card__change">Retention is driving the advice</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-card__label">Format Bias</p>
          <p className="stat-card__value">Reels-first</p>
          <p className="stat-card__change">Short-form Instagram strategy remains strongest</p>
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
