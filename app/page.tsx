import Link from "next/link";

const homeCards = [
  {
    title: "Social Insights",
    description:
      "Compare TikTok and Instagram performance in one place, then spot what content is actually pulling its weight.",
    href: "/insights",
    status: "Live now"
  },
  {
    title: "Content Planner",
    description:
      "Plan future posts, hooks, ideas, and themes so your content strategy does not live in scattered notes.",
    href: "/tracker",
    status: "Live now"
  },
  {
    title: "Suggestions Engine",
    description:
      "Turn insights into recommendations for what to post more of, what to cut, and what to test next.",
    href: "#",
    status: "Coming soon"
  }
];

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Maddie HQ</p>
          <h1>A home base for the parts of your online business you want under control.</h1>
          <p className="lede">
            This site is now organized like a real app. Start from the homepage,
            jump into the tools you want, and grow it over time instead of cramming
            everything into one screen.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Next Up</span>
          <p>
            Right now your Social Insights dashboard and Tracker room are ready.
            More tools can plug into this same structure as you decide what you need.
          </p>
          <Link className="hero__cta" href="/insights">
            Open Social Insights
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
            {card.href === "#" ? (
              <span className="home-card__link home-card__link--muted">Available later</span>
            ) : (
              <Link className="home-card__link" href={card.href}>
                Open tool
              </Link>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
