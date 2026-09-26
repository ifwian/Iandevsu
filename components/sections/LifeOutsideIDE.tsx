"use client";

import Stack from "@/components/ui/Stack";

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
    <section 
      id="life" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Text & Interests */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Section Eyebrow Header in Geist Mono */}
            <p 
              className="section-eyebrow mb-2 tracking-wider"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              06 &mdash; life
            </p>

            {/* Main Title */}
            <h2 
              className="mb-4 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[var(--ink)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Outside the IDE
            </h2>

            {/* Description -- paragraph prose, so Source Serif 4. The max-w
                keeps the measure readable instead of letting it run the full
                width of the column. */}
            <p
              className="mb-6 max-w-xl text-[15px] leading-[1.75] text-[var(--gray-400)] sm:text-[17px]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              When I step away from the tech world, I recharge through physical activity and creative hobbies, returning to my projects with fresh energy and perspective.
            </p>

            {/* Interest Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {INTERESTS.map((interest) => (
                <span 
                  key={interest} 
                  className="pill text-[11px] sm:text-xs font-medium px-3.5 py-1.5 rounded-full border border-[var(--gray-300)] bg-[var(--gray-100)] text-[var(--ink)] transition-colors hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Square Interactive Image Stack */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <div className="relative aspect-square w-full max-w-[280px]">
              <Stack
                cards={GALLERY.map((g) => (
                  <img 
                    key={g.image} 
                    src={g.image} 
                    alt={g.alt} 
                    className="rounded-2xl shadow-2xl border border-[var(--gray-200)]" 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                ))}
                randomRotation
                sensitivity={180}
                sendToBackOnClick
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
