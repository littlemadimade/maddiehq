export default function GoodMorningPage() {
  return (
    <main className="morning-page">
      <div className="morning-page__sparkles morning-page__sparkles--left" />
      <div className="morning-page__sparkles morning-page__sparkles--right" />

      <section className="morning-scene">
        <article className="morning-card morning-card--story">
          <p className="morning-card__eyebrow">For Fun</p>
          <h1>good morning</h1>
          <p className="morning-card__subcopy">
            A soft little storybook page with a waving good morning and a favorite stuffed
            donkey tucked in close.
          </p>

          <div className="storybook-girl" aria-hidden="true">
            <div className="storybook-girl__pigtail storybook-girl__pigtail--left" />
            <div className="storybook-girl__pigtail storybook-girl__pigtail--right" />
            <div className="storybook-girl__face">
              <div className="storybook-girl__bangs" />
              <div className="storybook-girl__eye storybook-girl__eye--left">
                <span />
              </div>
              <div className="storybook-girl__eye storybook-girl__eye--right">
                <span />
              </div>
              <div className="storybook-girl__lash storybook-girl__lash--left" />
              <div className="storybook-girl__lash storybook-girl__lash--right" />
              <div className="storybook-girl__nose" />
              <div className="storybook-girl__lips" />
              <div className="storybook-girl__blush storybook-girl__blush--left" />
              <div className="storybook-girl__blush storybook-girl__blush--right" />
            </div>
            <div className="storybook-girl__body">
              <div className="storybook-girl__arm storybook-girl__arm--left" />
              <div className="storybook-girl__arm storybook-girl__arm--right">
                <div className="storybook-girl__wave" />
              </div>
              <div className="storybook-girl__dress" />
              <div className="storybook-girl__plush">
                <div className="storybook-girl__plush-ear storybook-girl__plush-ear--left" />
                <div className="storybook-girl__plush-ear storybook-girl__plush-ear--right" />
                <div className="storybook-girl__plush-face">
                  <span className="storybook-girl__plush-eye" />
                  <span className="storybook-girl__plush-eye" />
                  <span className="storybook-girl__plush-nose" />
                </div>
              </div>
            </div>
          </div>

          <div className="morning-card__badges">
            <span>Brown pigtails</span>
            <span>Big green doll eyes</span>
            <span>Long lashes</span>
            <span>Stuffed donkey</span>
          </div>
        </article>
      </section>
    </main>
  );
}
