"use client";


interface Fact {
  label: string;
  value: string;
}

const FACTS: Fact[] = [
  { label: "based in", value: "Calamba, PH" },
  { label: "currently", value: "2nd Year · BS Computer Science" },
  { label: "first line of code", value: "HTML · Age 17" },
  { label: "when not coding", value: "Photography · Badminton · Music" },
];

const GOALS: string[] = [
  "Building more complete web projects from frontend to backend.",
  "Getting more comfortable with databases, APIs, and backend development.",
  "Improving my fundamentals instead of relying on code that I don't fully understand.",
  "Finding an internship where I can learn, contribute, and gain real-world experience.",
];

// Held as a plain string rather than JSX children: the braces would otherwise
// be parsed as an expression. Monochrome by design -- the palette has no
// accent colour, so there is no syntax highlighting.
const PROFILE_SNIPPET = `const marianne = {
  curious: true,
  learning: "always"
};`;

export default function AboutMe() {

  return (
    <section 
      id="about" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <p className="section-eyebrow mb-6 " style={{ fontFamily: "var(--font-mono)" }}>
          02 &mdash; about
        </p>
        
        <h2 
          className="mb-6 text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          about me
        </h2>

        {/* Long-form prose is the one role Source Serif 4 is for. The max-w
            keeps the measure near 65-70 characters at this size; without a
            cap the block stretched to the full max-w-4xl column and broke
            lines at awkward points. */}
        <div
          className="mb-10 max-w-xl space-y-4 text-[15px] leading-[1.75] text-[var(--gray-400)] sm:text-[17px]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          <p>
            I&rsquo;m a second-year Computer Science student based in Calamba, Philippines, currently
            learning how to turn ideas into working web applications. I enjoy building things, figuring out
            why they break, and slowly getting better at the parts I&rsquo;m still learning.
          </p>
          <p>
            Most of what I know comes from school, personal projects, and a lot of trial and error. I&rsquo;m
            still growing as a developer, but I&rsquo;m actively exploring frontend development, backend
            development, databases, and the tools behind modern web applications.
          </p>
        </div>

        {/* Decorative code card. Monochrome -- the palette has no accent
            colour, so this is deliberately unhighlighted rather than
            inventing a syntax theme. */}
        <figure className="card mb-10 max-w-xl overflow-hidden border border-[var(--gray-200)] bg-[var(--gray-50)]">
          <figcaption
            className="flex items-center gap-2 border-b border-[var(--gray-200)] px-4 py-2"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <span className="micro-label">profile.js</span>
          </figcaption>
          <pre
            className="overflow-x-auto px-4 py-4 text-[12px] leading-[1.7] text-[var(--gray-500)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <code>{PROFILE_SNIPPET}</code>
          </pre>
        </figure>

        {/* Quick Facts Grid. `auto-rows-fr` makes every row the same height, so
            the two mobile rows match too -- otherwise the 2x2 layout gave two
            different card heights. `h-full` + `mt-auto` on the value pins each
            value to the bottom, so the baselines line up even when one value
            wraps to two lines. */}
        <div className="mb-10 grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-4">
          {FACTS.map((f: Fact) => (
            <div
              key={f.label}
              className="card flex h-full flex-col border border-[var(--gray-200)] bg-[var(--gray-100)] p-4"
            >
              <p
                className="micro-label text-[11px] uppercase leading-[1.4] tracking-widest text-[var(--gray-500)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {f.label}
              </p>
              <p className="mt-auto pt-2 text-sm font-medium leading-[1.45] text-[var(--ink)]">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Current Goals. The heading stays Kode Mono (a badge/micro-label),
            but the bullets are full sentences, so they take the serif prose
            role and the same max-w-xl measure as the paragraph above --
            otherwise long sentences wrap raggedly in a full-width mono list. */}
        <div>
          <p
            className="micro-label mb-3 text-[11px] uppercase tracking-widest text-[var(--gray-500)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            right now, I&rsquo;m working toward
          </p>
          <ul
            className="max-w-xl space-y-2 text-[15px] leading-[1.7] text-[var(--gray-400)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {GOALS.map((goal: string) => (
              <li key={goal} className="flex gap-2">
                <span aria-hidden="true">&mdash;</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </section>
  );
}
