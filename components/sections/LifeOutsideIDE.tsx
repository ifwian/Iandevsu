import DepthCarousel from "@/components/ui/DepthCarousel";

const INTERESTS = ["Photography", "Reading", "Gaming", "Hiking", "Music", "Nature"];

const GALLERY = [
  { image: "/images/photography.jpg", alt: "Photography" },
  { image: "/images/reading.jpg", alt: "Reading" },
  { image: "/images/gaming.jpg", alt: "Gaming" },
  { image: "/images/hiking.jpg", alt: "Hiking" },
  { image: "/images/music.jpg", alt: "Music" },
  { image: "/images/nature1.jpg", alt: "Nature" },
];

export default function LifeOutsideIDE() {
  return (
    <section id="life" className="px-5 py-16 lg:px-6">
      <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2 md:items-center lg:pl-56">
        <div>
          <p className="section-eyebrow">07 &mdash; life</p>
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">life outside the ide</h2>
          <p className="mb-8 max-w-[46ch]" style={{ color: "var(--gray-500)" }}>
            A few things I enjoy when I&rsquo;m away from the keyboard.
          </p>

          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <span key={interest} className="pill">
                {interest}
              </span>
            ))}
          </div>
        </div>

        <div className="h-105 w-full">
          <DepthCarousel
            items={GALLERY}
            cardWidth={230}
            cardHeight={300}
            depth={160}
            spread={60}
            tilt={18}
            visibleCards={3}
            tint="var(--ink)"
            autoplay
            loop
          />
        </div>
      </div>
    </section>
  );
}
