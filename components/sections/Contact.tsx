interface ContactLink {
  label: string;
  href: string;
  external?: boolean;
}

const LINKS: ContactLink[] = [
  { label: "email", href: "mailto:mariannenapano06@gmail.com" },
  { label: "github", href: "https://github.com/ifwian", external: true },
  { label: "linkedin", href: "https://www.linkedin.com/in/ifwiannn/", external: true },
];

/**
 * Simple inline arrow-link row, matching the reference layout --
 * "email ↗  github ↗  linkedin ↗" -- rather than a bordered card of
 * icon rows.
 */
export default function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden px-5 py-16 lg:px-6 lg:pl-56">
      <div className="halftone" style={{ opacity: 0.5 }} aria-hidden="true" />

      <div className="relative mx-auto max-w-4xl">
        <p className="section-eyebrow">08 &mdash; contact</p>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">contact</h2>
        <p className="mb-6 max-w-[46ch]" style={{ color: "var(--gray-500)" }}>
          Feel free to reach out &mdash; I&rsquo;d love to connect!
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="link-arrow"
              style={{ fontSize: "13px" }}
            >
              {link.label} <span className="arrow-glyph">&#8599;</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}