const protectionCards = [
  {
    title: "Creator data is separated",
    detail:
      "Each creator profile gets its own saved workspace in the browser, so switching creators does not mix one creator's numbers into another creator's inputs."
  },
  {
    title: "Nothing is being sold or shared",
    detail:
      "Right now the app is not wired to any ad network, broker, or external analytics vendor. The current creator setup and conversion inputs live only in this browser."
  },
  {
    title: "No live Instagram token is stored yet",
    detail:
      "The app does not yet connect to Meta, so it is not currently holding live social login credentials or long-lived access tokens."
  }
];

const currentLimits = [
  "This is browser-local storage, not a full secure cloud account system yet.",
  "Anyone using this same browser profile on this device could potentially see the saved creator data.",
  "There is no password login, server database, or encrypted account sync in place yet.",
  "Live Instagram connection should wait until real authentication and server-side storage are in place."
];

const nextLocks = [
  "Add real sign-in so the app can verify who the creator is.",
  "Move sensitive data from browser-only storage into server-side storage with proper access control.",
  "Store Instagram credentials and tokens outside the browser in protected environment-backed infrastructure.",
  "Add account-level permissions so one creator cannot access another creator's data."
];

export default function SecurityPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">Safety and Security</h1>
      </header>

      <section className="overview-grid">
        {protectionCards.map((card) => (
          <article className="panel stat-card" key={card.title}>
            <p className="stat-card__label">{card.title}</p>
            <p className="security-card__detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="bottom-grid">
        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Current Limits</p>
            <span className="suggestions-card__tag">What is not secure enough yet</span>
          </div>
          <ul>
            {currentLimits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Next Security Locks</p>
            <span className="suggestions-card__tag">Before live account sync</span>
          </div>
          <ul>
            {nextLocks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel breakdown-card">
          <p className="eyebrow">What This Means</p>
          <h2>The app is safe enough for local prototyping, but not yet ready for high-trust account data.</h2>
          <p>
            Right now the app behaves more like a personal notebook saved on this one
            browser than a fully protected online account system. That is okay for the
            current foundation stage, but it is exactly why we are pausing to improve
            security before Instagram OAuth.
          </p>
          <p>
            The next time we touch account plumbing, the goal should be a real creator
            sign-in and server-backed storage layer so each creator&apos;s data is protected
            beyond this device.
          </p>
        </article>

        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Where To Manage It</p>
            <span className="suggestions-card__tag">App flow</span>
          </div>
          <ul>
            <li>Use the top-right profile menu for creator setup and safety settings.</li>
            <li>The homepage now points to this room instead of a plain creator link.</li>
            <li>The creator setup page still handles account details and Instagram readiness.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
