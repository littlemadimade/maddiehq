import Link from "next/link";
import { overviewStats, platformCards, suggestions } from "@/lib/insights";

export default function InsightsPage() {
  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Instagram Insights</p>
          <h1>One dashboard to track what your Instagram content is actually doing.</h1>
          <p className="lede">
            This first version focuses on Instagram performance, spots what is
            working, and gives you suggestions for what to try next.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">MVP</span>
          <p>
            Start simple, learn fast, then add account connections, uploads, and
            smarter recommendations later.
          </p>
        </div>
      </section>

      <section className="overview-grid">
        {overviewStats.map((stat) => (
          <article className="stat-card panel" key={stat.label}>
            <p className="stat-card__label">{stat.label}</p>
            <p className="stat-card__value">{stat.value}</p>
            <p className="stat-card__change">{stat.change}</p>
          </article>
        ))}
      </section>

      <section className="platform-grid">
        {platformCards.map((platform) => (
          <article className={`platform-card panel ${platform.accent}`} key={platform.name}>
            <div className="platform-card__header">
              <div>
                <p className="platform-card__eyebrow">{platform.name}</p>
                <h2>{platform.handle}</h2>
              </div>
              <span className="platform-card__pill">Insights</span>
            </div>

            <div className="metric-grid">
              {platform.stats.map((stat) => (
                <div className="metric" key={stat.label}>
                  <p className="metric__label">{stat.label}</p>
                  <p className="metric__value">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="platform-card__analysis">
              <div>
                <h3>What&apos;s Working</h3>
                <ul>
                  {platform.wins.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>What&apos;s Not Working</h3>
                <ul>
                  {platform.misses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="bottom-grid">
        <article className="panel breakdown-card">
          <p className="eyebrow">Instagram Read</p>
          <h2>Your strongest Instagram content is quick, direct, and visually easy to understand.</h2>
          <p>
            Right now the pattern says your audience responds best when the value
            of the content is obvious early. Reels are carrying the most momentum,
            and posts that feel human and immediate are beating content that feels
            too staged or too vague.
          </p>
          <p>
            That means your system should focus on repeatable Instagram video ideas,
            stronger hooks, clearer covers, and simpler follow-through instead of
            reinventing every post from scratch.
          </p>
        </article>

        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Suggestions</p>
            <span className="suggestions-card__tag">Generated from insights</span>
          </div>
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion.title}>{suggestion.title}</li>
            ))}
          </ul>
          <Link className="suggestions-card__link" href="/insights/suggestions">
            Open full suggestions view
          </Link>
        </article>
      </section>
    </main>
  );
}
