"use client";

import { useEffect } from 'react';
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
  // Dynamic Google Font Injection
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
      id="life" 
      className="px-5 py-16 lg:px-6 lg:pl-56"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Text & Interests */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Section Eyebrow Header in Geist Mono */}
            <p 
              className="section-eyebrow text-xs sm:text-sm mb-2 text-[var(--gray-400)] tracking-wider"
              style={{ fontFamily: "'Geist Mono', monospace" }}
            >
              06 &mdash; life
            </p>

            {/* Main Title */}
            <h2 
              className="mb-4 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[var(--ink)] leading-tight"
              style={{ fontFamily: "'Kode Mono', monospace" }}
            >
              Outside the IDE
            </h2>

            {/* Description */}
            <p className="mb-6 text-xs sm:text-sm leading-relaxed text-[var(--gray-400)] max-w-lg">
              When I step away from the tech world, I recharge through physical activity and creative hobbies, returning to my projects with fresh energy and perspective.
            </p>

            {/* Interest Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {INTERESTS.map((interest) => (
                <span 
                  key={interest} 
                  className="pill text-[11px] sm:text-xs font-medium px-3.5 py-1.5 rounded-full border border-[var(--gray-300)] bg-[var(--gray-100)] text-[var(--ink)] transition-colors hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)]"
                  style={{ fontFamily: "'Kode Mono', monospace" }}
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