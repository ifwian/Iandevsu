import { useEffect } from 'react';

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

export default function Contact() {
  // Inject Google Fonts dynamically
  useEffect(() => {
    const linkKode = document.createElement('link');
    linkKode.href = 'https://fonts.googleapis.com/css2?family=Kode+Mono:wght@400..700&display=swap';
    linkKode.rel = 'stylesheet';
    document.head.appendChild(linkKode);

    const linkGeist = document.createElement('link');
    linkGeist.href = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap';
    linkGeist.rel = 'stylesheet';
    document.head.appendChild(linkGeist);
  }, []);

  return (
    <section 
      id="contact" 
      className="relative overflow-hidden px-5 py-16 lg:px-6 lg:pl-56"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="halftone" style={{ opacity: 0.5 }} aria-hidden="true" />

      <div className="relative mx-auto max-w-4xl">
        <p className="section-eyebrow text-xs mb-1">08 &mdash; contact</p>
        
        {/* Section Heading in Kode Mono */}
        <h2 
          className="mb-2 text-2xl font-semibold tracking-tight text-white"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          contact
        </h2>

        {/* Subtitle in Geist Mono */}
        <p className="mb-6 max-w-[46ch] text-sm leading-relaxed" style={{ color: "var(--gray-500)" }}>
          Feel free to reach out &mdash; I&rsquo;d love to connect!
        </p>

        {/* Inline Links using Kode Mono */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {LINKS.map((link: ContactLink) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="link-arrow group transition-colors hover:text-white"
              style={{ 
                fontSize: "13px",
                fontFamily: "'Kode Mono', monospace"
              }}
            >
              {link.label}{" "}
              <span className="arrow-glyph inline-block transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                &#8599;
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}