import PixelTransition from '@/components/ui/PixelTransition';

const LINKS = [
  { label: "instagram", href: "https://www.instagram.com/ifwiannn/", external: true },
  { label: "github", href: "https://github.com/ifwian", external: true },
  { label: "linkedin", href: "https://www.linkedin.com/in/ifwiannn/", external: true },
];

export default function Hero() {
  return (
    <section id="home" className="px-5 py-16 lg:px-6">
      <div className="mx-auto max-w-4xl lg:pl-56">

        {/* Profile Header (Flex Container) */}
        <div className="flex items-start gap-5 mb-6">
          <PixelTransition
            firstContent={
              <img
                src="/images/anime.jfif"
                alt="Photo of Marianne"
                className="h-full w-full object-cover block"
              />
            }
            secondContent={
              <img
                src="/images/ianface.png"
                alt="Photo of Marianne Hover"
                className="h-full w-full object-cover block"
              />
            }
            gridSize={7}
            pixelColor="#ffffff"
            animationStepDuration={0.3}
            className="mt-6 w-48 h-48 aspect-square rounded-2xl overflow-hidden shrink-0"
          />

          {/* Name, tagline and links remain flex-col */}
          <div className="flex flex-col text-left">
            <p className="section-eyebrow mb-1 text-xs">01 &mdash; home</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Marianne Napa&ntilde;o
            </h1>

            <h2 className="mt-1 text-base font-medium" style={{ color: "var(--gray-500)" }}>
              Computer Science Student &amp; Aspiring Web Developer
            </h2>

            {/* Social Links */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="link-arrow text-xs"
                >
                  {link.label}{" "}
                  <span className="arrow-glyph">{String.fromCharCode(8599)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="w-full text-left">
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--gray-500)", lineHeight: 1.65 }}>
            <p>
              I&rsquo;m a Computer Science student exploring web development
              and software engineering &mdash; I enjoy building simple
              websites, learning new technologies, and I&rsquo;m currently
              getting into backend development.
            </p>
            <p>
              <i>&ldquo;Too curious to stick to one thing.&rdquo;</i> <br /><br />This portfolio
              itself is a work in progress: a reflection of my journey, and a
              space to showcase projects as my skills grow.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}