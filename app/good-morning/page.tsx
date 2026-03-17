export default function GoodMorningPage() {
  return (
    <main className="morning-page">
      <div className="morning-page__sparkles morning-page__sparkles--left" />
      <div className="morning-page__sparkles morning-page__sparkles--right" />

      <section className="morning-card">
        <p className="morning-card__eyebrow">Care Bear Morning Drop</p>
        <h1>good morning daddy</h1>
        <p className="morning-card__subcopy">
          sending soft pink sparkles, sleepy sweetness, and one very cute wink to start the day
        </p>

        <div className="morning-card__faces">
          <div className="bear-face">
            <span className="bear-face__ear bear-face__ear--left" />
            <span className="bear-face__ear bear-face__ear--right" />
            <span className="bear-face__eye bear-face__eye--left" />
            <span className="bear-face__eye bear-face__eye--right" />
            <span className="bear-face__nose" />
            <span className="bear-face__blush bear-face__blush--left" />
            <span className="bear-face__blush bear-face__blush--right" />
          </div>
        </div>

        <div className="morning-card__badges">
          <span>sparkly</span>
          <span>sleepy wink</span>
          <span>cloud-soft</span>
        </div>
      </section>
    </main>
  );
}
