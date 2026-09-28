"use client";


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
    title: "What They Don't Tell You About Your First Year in Computer Science",
    date: "Sep 2026",
    readTime: "5 min",
    link: "https://medium.com/@iandevsu/what-they-dont-tell-you-about-your-first-year-in-computer-science-865f04806afe",
    status: "LIVE ON MEDIUM",
    isLive: true,
    image: "https://miro.medium.com/v2/resize:fit:640/format:webp/0*EyleYybJabCNiNNe",
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

  return (
    <section 
      id="blog" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          <div className="section-shell-bar">
            <p className="section-eyebrow">08 &mdash; blog</p>
          </div>

          <div className="scanlines" aria-hidden="true" />

          <div className="section-shell-body">
        {/* Section Heading. This one was `text-2xl sm:text-3xl` -- larger than
            every other section on mobile and tablet -- which is the single most
            visible thing that stopped the section headers reading as a set. */}
        <h2 className="section-title">
          blog
        </h2>

        {/* Section description -- prose, so Source Serif 4. */}
        <p
          className="mb-10 max-w-xl text-[15px] leading-[1.7] text-[var(--gray-500)]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Documenting the sophomore grind, surviving data structures, and mastering the art of vibe coding.
        </p>

        {/* Blog Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {POSTS.map((post) => (
            <a 
              key={post.title}
              href={post.link}
              target={post.isLive ? "_blank" : "_self"}
              rel="noopener noreferrer"
              /* `min-w-0` because this is a grid child, and grid items carry the
                 same `min-width: auto` default as flex items -- a long title
                 would refuse to wrap and overflow the column rather than
                 shrinking into it. */
              className="group flex min-w-0 flex-col bg-transparent rounded-2xl overflow-hidden transition-all"
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
                  <span className="text-xs uppercase tracking-widest text-[var(--gray-400)] font-mono" style={{ fontFamily: "var(--font-display)" }}>
                    Coming Soon...
                  </span>
                )}
              </div>

              {/* Metadata (Date & Read Time) */}
              <div className="flex items-center gap-2 text-[11px] text-[var(--gray-400)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
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
        </div>
      </div>
    </section>
  );
}
