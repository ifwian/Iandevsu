interface Post {
  title: string;
  date: string;
  description: string;
}

const POSTS: Post[] = [
  {
    title: "Building My First Java Swing Game: Lessons from 'Snake Chase'",
    date: "draft",
    description: "Breaking down how I handled game loops, custom grid logic, and basic hazard progression in pure Java.",
  },
  {
    title: "C++ Data Structures: Why Writing a Music Playlist Manager Clicked",
    date: "draft",
    description: "Reflections on moving past textbook examples and implementing custom structs and memory management for a real project.",
  },
];

export default function Blog() {
  return (
    <section id="blog" className="px-5 py-16 lg:px-6 lg:pl-56">
      <div className="max-w-4xl">
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