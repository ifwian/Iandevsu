interface Post {
  title: string;
  date: string;
  description: string;
}

const POSTS: Post[] = [
  {
    title: "What I Learned Building My Portfolio",
    date: "draft",
    description: "Notes on structuring HTML/CSS from scratch, and the small decisions that add up to a polished layout.",
  },
  {
    title: "Git & GitHub, Explained Simply",
    date: "draft",
    description: "A beginner-friendly walkthrough of the commands I actually use day to day.",
  },
];

export default function Blog() {
  return (
    <section id="blog" className="px-5 py-16 lg:px-6">
      <div className="mx-auto max-w-4xl lg:pl-56">
        <p className="section-eyebrow">06 &mdash; blog</p>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">blog</h2>
        <p className="mb-8 max-w-[46ch]" style={{ color: "var(--gray-500)" }}>
          Short write-ups on what I&rsquo;m learning and building &mdash; first posts coming soon.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {POSTS.map((post) => (
            <div key={post.title} className="card flex flex-col justify-between p-5">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">{post.title}</h3>
                  <span className="pill flex-shrink-0">{post.date}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--gray-500)" }}>
                  {post.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
