import PixelTransition from '@/components/ui/PixelTransition';

const LINKS = [
  { label: "instagram", href: "https://www.instagram.com/ifwiannn/", external: true },
  { label: "github", href: "https://github.com/ifwian", external: true },
  { label: "linkedin", href: "https://www.linkedin.com/in/ifwiannn/", external: true },
];

const STATS = [
  { label: "REPOS", value: "12 Public" },
  { label: "COMMITS", value: "350+" },
  { label: "PROJECTS", value: "5 Done" },
  { label: "STATUS", value: "Ready" },
];

export default function Hero() {
  return (
    <section id="home" className="px-5 pt-12 pb-16 lg:px-6 lg:pl-56">
      <div className="max-w-4xl">

        {/* Eyebrow at the top */}
        <p className="section-eyebrow mb-6 text-xs">01 &mdash; home</p>

        {/* Combined Hero Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr] items-start gap-6">
          
          {/* Profile Picture (Sharp edges) */}
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
            className="w-full aspect-[5/6] overflow-hidden shrink-0" /* REMOVED rounded-2xl */
          />

          {/* Right Column: Clean, readable flow */}
          <div className="flex flex-col text-left space-y-4">
            
            {/* Top section: Name and Subtitle */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Marianne Napa&ntilde;o
              </h1>
              <h2 className="mt-1 text-sm font-medium sm:text-base" style={{ color: "var(--gray-500)" }}>
                Computer Science Student &amp; Aspiring Web Developer
              </h2>
            </div>

            {/* Middle section: Readable quote and notes */}
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--gray-500)", lineHeight: 1.65 }}>
              <p>
                <i>&ldquo;Too curious to stick to one thing.&rdquo;</i>
              </p>
              <p>
                This portfolio is a work in progress: a space to share my journey and showcase projects as my skills grow.
              </p>
            </div>

            {/* Bottom section: Social Links */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
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

        {/* Exact Bryl-style Stat Bar with sharp, squared-off borders */}
        <div className="mt-14 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4">
          {STATS.map((stat, idx) => (
            <div 
              key={stat.label}
              className={`py-5 px-4 flex flex-col justify-center transition-colors hover:bg-white/[0.02] ${
                idx !== 0 ? 'sm:border-l sm:border-white/15' : ''
              } ${
                idx % 2 === 1 ? 'border-l border-white/15 sm:border-l' : ''
              } ${
                idx >= 2 ? 'border-t sm:border-t-0 border-white/15' : ''
              }`}
            >
              <div className="flex items-baseline gap-1.5" style={{ fontFamily: 'var(--font-mono), monospace' }}>
                <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {stat.value}
                </span>
                <span className="text-[10px] font-mono text-white/40">{String.fromCharCode(8599)}</span>
              </div>
              <span className="mt-1.5 text-[10px] tracking-widest uppercase" style={{ color: "var(--gray-500)", fontFamily: 'var(--font-mono), monospace' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}