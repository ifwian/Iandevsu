"use client";

import { useEffect } from "react";

interface BlogPost {
  title: string;
  date: string;
  readTime: string;
  link: string;
  status: string;
  isLive: boolean;
  image?: string;
}

const POSTS: BlogPost[] = [
  {
    title: "Why Every CS Student Needs a Portfolio (Even If You Feel Like You Have Nothing to Show)",
    date: "Aug 2026",
    readTime: "3 min",
    link: "https://medium.com/@iandevsu/why-every-cs-student-needs-a-portfolio-even-if-you-feel-like-you-have-nothing-to-show-f731367ca2c0?sharedUserId=iandevsu",
    status: "LIVE ON MEDIUM",
    isLive: true,
    image: "https://miro.medium.com/v2/resize:fit:640/format:webp/0*Wuo4CcK9AmfUH86Y",
  },
  {
    title: "Designing My Personal Portfolio: From Vibe Coding to Production",
    date: "Coming Soon",
    readTime: "Draft",
    link: "#",
    status: "DRAFT",
    isLive: false,
  },
];

export default function BlogSection() {
  // Dynamic Google Font Injection for Kode Mono & Geist Mono
  useEffect(() => {
    const linkKode = document.createElement("link");
    linkKode.href = "https://fonts.googleapis.com/css2?family=Kode+Mono:wght@400..700&display=swap";
    linkKode.rel = "stylesheet";
    document.head.appendChild(linkKode);

    const linkGeist = document.createElement("link");
    linkGeist.href = "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap";
    linkGeist.rel = "stylesheet";
    document.head.appendChild(linkGeist);
  }, []);

  return (
    <section 
      id="blog" 
      className="px-5 py-16 lg:px-6 lg:pl-56 flex justify-center"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        {/* Section Eyebrow in Geist Mono */}
        <p 
          className="section-eyebrow text-xs sm:text-sm mb-1.5 text-[var(--gray-400)] tracking-wider"
          style={{ fontFamily: "'Geist Mono', monospace" }}
        >
          08 &mdash; blog
        </p>

        {/* Section Heading in Kode Mono */}
        <h2 
          className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)] leading-tight"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          blog
        </h2>

        {/* Personality-driven Subtitle */}
        <p className="mb-10 text-xs sm:text-sm text-[var(--gray-500)]">
          Documenting the sophomore grind, surviving data structures, and mastering the art of vibe coding.
        </p>

        {/* Blog Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {POSTS.map((post) => (
            <a 
              key={post.title}
              href={post.link}
              target={post.isLive ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className={`group flex flex-col bg-transparent rounded-2xl overflow-hidden transition-all`}
            >
              {/* Thumbnail Preview Box */}
              <div className="w-full h-48 sm:h-52 rounded-2xl overflow-hidden border border-[var(--gray-200)] bg-[var(--gray-50)] mb-4 relative flex items-center justify-center">
                {post.isLive && post.image ? (
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <span className="text-xs uppercase tracking-widest text-[var(--gray-400)] font-mono" style={{ fontFamily: "'Kode Mono', monospace" }}>
                    Coming Soon...
                  </span>
                )}
              </div>

              {/* Metadata (Date & Read Time) */}
              <div className="flex items-center gap-2 text-[11px] text-[var(--gray-400)] mb-2" style={{ fontFamily: "'Kode Mono', monospace" }}>
                <span>{post.date}</span>
                <span>&bull;</span>
                <span>{post.readTime}</span>
              </div>

              {/* Title */}
              <h3 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-snug tracking-tight">
                {post.title}
              </h3>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}