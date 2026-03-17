const overviewStats = [
  { label: "Combined Reach", value: "248k", change: "+18% this month" },
  { label: "Follower Growth", value: "+3.4k", change: "+9% vs last month" },
  { label: "Best Posting Window", value: "7-9 PM", change: "Weeknights win" },
  { label: "Top Format", value: "Short video", change: "Reels + TikToks" }
];

const platformCards = [
  {
    name: "TikTok",
    handle: "@maddie",
    accent: "platform-card--pink",
    stats: [
      { label: "Views", value: "182k" },
      { label: "Avg Watch Time", value: "11.8s" },
      { label: "Shares", value: "3.2k" },
      { label: "Saves", value: "1.1k" }
    ],
    wins: [
      "Fast hook in the first 2 seconds",
      "Playful captions are outperforming polished ones",
      "Behind-the-scenes clips are driving shares"
    ],
    misses: [
      "Long intros are losing retention",
      "Posting before noon underperforms",
      "Over-edited clips feel weaker"
    ]
  },
  {
    name: "Instagram",
    handle: "@maddie",
    accent: "platform-card--lime",
    stats: [
      { label: "Reach", value: "66k" },
      { label: "Profile Visits", value: "8.7k" },
      { label: "Saves", value: "2.6k" },
      { label: "Story Replies", value: "480" }
    ],
    wins: [
      "Reels with direct text overlays hold attention",
      "Carousel posts create strong saves",
      "Stories with polls increase replies"
    ],
    misses: [
      "Single-image posts are lagging",
      "Muted thumbnails are easy to skip",
      "Weekend mornings are inconsistent"
    ]
  }
];

const suggestions = [
  "Make 3 short videos this week that open with the payoff first, then the setup.",
  "Turn one strong TikTok idea into an Instagram Reel and a carousel recap.",
  "Use brighter cover text so the thumbnail sells the idea before people tap.",
  "Test one story poll after every new post to pull people deeper into the funnel."
];

export default function InsightsPage() {
  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Social Insights</p>
          <h1>One dashboard to track what your content is doing across TikTok and Instagram.</h1>
          <p className="lede">
            This first version compares platform insights, spots what is working,
            and gives you suggestions for what to try next.
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
          <p className="eyebrow">Cross-Platform Read</p>
          <h2>Your strongest content is quick, direct, and feels a little more casual than polished.</h2>
          <p>
            Right now the pattern says your audience responds best when they know
            the payoff early. Short-form video is carrying the most momentum, and
            posts that feel human and immediate are beating content that feels too
            staged.
          </p>
          <p>
            That means your system should focus on repeatable video ideas, stronger
            hooks, and repurposing winners between platforms instead of reinventing
            every post from scratch.
          </p>
        </article>

        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Suggestions</p>
            <span className="suggestions-card__tag">Based on insights</span>
          </div>
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
