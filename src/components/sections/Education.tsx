import { EDUCATION } from "@/content/education";

/**
 * Education: a short list from `content/education.ts`. Same window as every
 * other section; renders nothing when the list is empty.
 */
export default function Education() {
  if (!EDUCATION.length) return null;

  return (
    <section id="education" className="section-frame px-0 py-12 sm:px-5 sm:py-16 lg:px-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          <div className="section-shell-bar">
            <p className="section-eyebrow">04 &mdash; education</p>
          </div>

          <div className="section-shell-body" data-reveal-group>
            <h2 className="section-title">education</h2>

            <ul className="education-list">
              {EDUCATION.map((entry) => (
                <li key={`${entry.program}-${entry.school ?? ""}`} className="card education-item">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="education-program">{entry.program}</h3>
                    {entry.status ? <span className="pill">{entry.status}</span> : null}
                  </div>
                  {entry.school || entry.period ? (
                    <p className="education-meta">{[entry.school, entry.period].filter(Boolean).join(" · ")}</p>
                  ) : null}
                  {entry.note ? <p className="education-note">{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
