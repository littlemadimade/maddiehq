export default function GoodMorningPage() {
  return (
    <main className="sunrise-page">
      <section className="sunrise-scene">
        <div className="sunrise-sky" aria-hidden="true">
          <div className="sunrise-sky__sun" />
          <div className="sunrise-sky__cloud sunrise-sky__cloud--left" />
          <div className="sunrise-sky__cloud sunrise-sky__cloud--right" />
          <div className="sunrise-sky__sparkle sunrise-sky__sparkle--one" />
          <div className="sunrise-sky__sparkle sunrise-sky__sparkle--two" />
        </div>

        <div className="sunrise-water" aria-hidden="true">
          <div className="sunrise-water__glow" />
          <div className="sunrise-water__wave sunrise-water__wave--one" />
          <div className="sunrise-water__wave sunrise-water__wave--two" />
          <div className="sunrise-water__wave sunrise-water__wave--three" />
        </div>

        <div className="sunrise-shore" aria-hidden="true" />

        <article className="sunrise-copy">
          <p className="sunrise-copy__eyebrow">Good Morning Tab</p>
          <p className="sunrise-copy__kicker">sunrise check-in</p>
          <h1>good morning daddy</h1>
          <p className="sunrise-copy__script">i&apos;m on my way</p>
          <p className="sunrise-copy__note">
            coffee in hand, pretty thoughts, and a soft pink sky overhead.
          </p>
        </article>
      </section>
    </main>
  );
}
