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

export default function AboutMe() {

  return (
    <section 
      id="about" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          {/* The eyebrow moved into the title bar, where it is the section's
              label on a shared control. It is still the same `.section-eyebrow`
              every other section uses -- the bar only zeroes its bottom margin
              and adds ellipsis, so the typography is untouched. */}
          <div className="section-shell-bar">
            <p className="section-eyebrow">02 &mdash; about</p>
          </div>

          <div className="scanlines" aria-hidden="true" />

          <div className="section-shell-body">
        <h2 className="section-title">
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

        {/* Quick Facts Grid. `auto-rows-fr` makes every row the same height, so
            the two mobile rows match too -- otherwise the 2x2 layout gave two
            different card heights. `h-full` + `mt-auto` on the value pins each
            value to the bottom, so the baselines line up even when one value
            wraps to two lines. */}
        <div className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-4">
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

          </div>
        </div>
      </div>
    </section>
  );
}
