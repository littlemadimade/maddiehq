import Link from "next/link";

const homeCards = [
  {
    title: "Instagram Insights",
    description:
      "Review your Instagram performance in one place, then spot what content is actually pulling its weight.",
    href: "/insights",
    status: "Live now"
  },
  {
    title: "Post Progress Tracker",
    description:
      "Track what is still an idea, what is being made, and what is ready to post so your Instagram workflow stays organized.",
    href: "/tracker",
    status: "Live now"
  },
  {
    title: "Conversion Room",
    description:
      "See whether your Instagram content is actually translating into profile actions, OF traffic, and paid outcomes.",
    href: "/conversion",
    status: "Live now"
  },
  {
    title: "Creator Setup",
    description:
      "Choose the active creator profile and prepare the Instagram connection foundation for future live insights sync.",
    href: "/creator",
    status: "Foundation"
  }
];

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Maddie HQ</p>
          <h1>An Instagram creator home base for the parts of your workflow you want under control.</h1>
          <p className="lede">
            This site is now organized like a real app. Start from the homepage,
            jump into the Instagram tools you want, and grow it over time instead
            of cramming everything into one screen.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Instagram-first</span>
          <p>
            Right now your Instagram Insights dashboard, Tracker room, and Conversion
            room are ready. More creator tools can plug into this same structure as you decide what you need.
          </p>
          <Link className="hero__cta" href="/insights">
            Open Instagram Insights
          </Link>
        </div>
      </section>

      <section className="home-grid">
        {homeCards.map((card) => (
          <article className="panel home-card" key={card.title}>
            <div className="home-card__header">
              <p className="eyebrow">{card.status}</p>
              <h2>{card.title}</h2>
            </div>
            <p>{card.description}</p>
            <Link className="home-card__link" href={card.href}>
              Open tool
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
