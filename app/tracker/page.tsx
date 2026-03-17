const todayStats = [
  { label: "Tasks Due Today", value: "7", detail: "2 high priority" },
  { label: "Posts In Progress", value: "12", detail: "Across both platforms" },
  { label: "Ready To Post", value: "3", detail: "1 TikTok, 2 Instagram" },
  { label: "Blocked Items", value: "2", detail: "Need assets or edits" }
];

const trackerColumns = [
  {
    title: "Ideas",
    description: "Fresh concepts worth developing.",
    tasks: [
      {
        title: "Morning routine hook test",
        platform: "TikTok",
        due: "Today",
        note: "Try a faster first line and tighter caption."
      },
      {
        title: "Soft-launch carousel concept",
        platform: "Instagram",
        due: "Tomorrow",
        note: "Turn one Reel topic into swipeable slides."
      }
    ]
  },
  {
    title: "In Progress",
    description: "Content actively being made.",
    tasks: [
      {
        title: "Behind-the-scenes clip batch",
        platform: "TikTok",
        due: "Today",
        note: "Need final trims and cover text."
      },
      {
        title: "Story poll follow-up set",
        platform: "Instagram",
        due: "Today",
        note: "Draft replies and CTA for traffic push."
      }
    ]
  },
  {
    title: "Ready",
    description: "Polished and ready to schedule or post.",
    tasks: [
      {
        title: "Reel with direct text overlay",
        platform: "Instagram",
        due: "Tonight",
        note: "Caption approved. Needs final posting window."
      },
      {
        title: "Quick payoff-first clip",
        platform: "TikTok",
        due: "Tomorrow",
        note: "Strong watch-time candidate based on recent winners."
      }
    ]
  },
  {
    title: "Posted",
    description: "Recently published content to review later.",
    tasks: [
      {
        title: "Casual talking-head Reel",
        platform: "Instagram",
        due: "Posted",
        note: "Check saves and profile visits tomorrow."
      },
      {
        title: "Playful caption trend post",
        platform: "TikTok",
        due: "Posted",
        note: "Watch share rate during the first 24 hours."
      }
    ]
  }
];

const dailyChecklist = [
  "Check what is due today before making new content.",
  "Move at least one task from In Progress to Ready.",
  "Review yesterday's posted content for early performance signals.",
  "Write down one content idea before ending the day."
];

export default function TrackerPage() {
  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Post Progress Tracker</p>
          <h1>A day-to-day operations room for planning, making, and posting content.</h1>
          <p className="lede">
            Use this space to track where each piece of content stands so you can
            see what is just an idea, what is being made, and what is ready to post.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Workflow</span>
          <p>
            This room helps you manage the work itself, while Insights helps you
            understand what happened after a post goes live.
          </p>
        </div>
      </section>

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
        {trackerColumns.map((column) => (
          <article className="panel tracker-column" key={column.title}>
            <div className="tracker-column__header">
              <div>
                <p className="eyebrow">{column.title}</p>
                <h2>{column.description}</h2>
              </div>
            </div>

            <div className="tracker-list">
              {column.tasks.map((task) => (
                <div className="task-card" key={task.title}>
                  <div className="task-card__top">
                    <h3>{task.title}</h3>
                    <span className="task-card__platform">{task.platform}</span>
                  </div>
                  <p className="task-card__due">{task.due}</p>
                  <p className="task-card__note">{task.note}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="bottom-grid">
        <article className="panel breakdown-card">
          <p className="eyebrow">How To Use It</p>
          <h2>Think of this like your content production board, not your analytics report.</h2>
          <p>
            The goal is to make it obvious what needs attention today. If something
            stays stuck in one column too long, that usually means your workflow is
            the problem, not your motivation.
          </p>
          <p>
            Over time we can make this interactive so you can add tasks, move them
            between stages, and connect them to actual performance results.
          </p>
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
    </main>
  );
}
