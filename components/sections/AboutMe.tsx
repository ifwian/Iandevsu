const FACTS = [
  { label: "based in", value: "Calamba, PH" },
  { label: "currently", value: "BS Computer Science" },
  { label: "first line of code", value: "HTML, age 17" },
  { label: "when not coding", value: "photography or badminton" },
];

const GOALS = [
  "Land my first internship as a web developer.",
  "Ship a full-stack project with a real backend, not just static pages.",
  "Get comfortable enough with SQL and Node.js to stop calling them 'currently learning'.",
];

export default function AboutMe() {
  return (
    <section id="about" className="px-5 py-16 lg:px-6">
      <div className="mx-auto max-w-4xl lg:pl-56">
        <p className="section-eyebrow">02 &mdash; about</p>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">about me</h2>

        <div className="mb-10 max-w-137.5 space-y-4 text-sm leading-relaxed" style={{ color: "var(--gray-500)", lineHeight: 1.75 }}>
          <p>
            My path into tech started with a simple question: <i>"How hard could it really be to
           build this myself?"</i> (Spoiler: very hard, but it turns out I love the headache). That 
           relentless tinkering is the main reason this portfolio exists.
          </p>
        </div>

        {/* Quick Facts Grid */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.label} className="card p-4">
              <p className="micro-label mb-1">{f.label}</p>
              <p className="text-sm font-medium">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Current Goals */}
        <div>
          <p className="micro-label mb-3">right now, I&rsquo;m working toward</p>
          <ul className="space-y-2 text-sm" style={{ color: "var(--gray-500)" }}>
            {GOALS.map((goal) => (
              <li key={goal} className="flex gap-2">
                <span aria-hidden="true">&mdash;</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}