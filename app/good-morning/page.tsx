const fireworks = [
  { className: "firework firework--pink firework--one", label: "good" },
  { className: "firework firework--lime firework--two", label: "morning" },
  { className: "firework firework--pink firework--three", label: "good" },
  { className: "firework firework--lime firework--four", label: "morning" },
  { className: "firework firework--pink firework--five", label: "good morning" }
];

const heartBursts = [
  "firework__heart--top",
  "firework__heart--bottom",
  "firework__heart--left",
  "firework__heart--right",
  "firework__heart--top-left",
  "firework__heart--top-right",
  "firework__heart--bottom-left",
  "firework__heart--bottom-right"
];

export default function GoodMorningPage() {
  return (
    <main className="fireworks-page">
      <section className="fireworks-stage">
        <p className="fireworks-stage__eyebrow">For Fun</p>
        <h1>good morning</h1>
        <p className="fireworks-stage__subcopy">
          Tiny fireworks, black sky, and a little green-and-pink chaos.
        </p>

        <div className="fireworks-sky" aria-hidden="true">
          {fireworks.map((firework) => (
            <div className={firework.className} key={`${firework.className}-${firework.label}`}>
              <span className="firework__burst">
                {heartBursts.map((heartClass) => (
                  <span className={`firework__heart ${heartClass}`} key={heartClass} />
                ))}
              </span>
              <span className="firework__text">{firework.label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
