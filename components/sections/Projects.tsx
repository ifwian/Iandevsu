import GithubIcon from "@/components/icons/GithubIcon";

interface Project {
  title: string;
  role: string;
  status?: string;
  description: string;
  stack: string[]; // devicon classes
  href?: string; // omit if not live yet
}

const PROJECTS: Project[] = [
  {
    title: "The Sifted Café",
    role: "Database & Backend developer",
    status: "Deploying soon",
    description:
      "A full-stack web app for a local café, built with React, Tailwind CSS, Node.js, Express, PostgreSQL, and Prisma. Features include a menu display, online reservation system, and admin dashboard.",
    stack: ["devicon-react-original colored", "devicon-tailwindcss-original colored", "devicon-nodejs-plain colored", "devicon-express-original colored", "devicon-postgresql-plain colored", "devicon-prisma-original colored"]
  },
  {
    title: "LMS Notifier",
    role: "Backend Developer",
    status: "coming soon",
    description: "A small web app that checks a Learning Management System (LMS) for new announcements and sends notifications to users. Built with Python.",
    stack: ["devicon-python-plain colored"],
  },
  {
    title: "To-Do List",
    role: "Frontend Developer",
    status: "coming soon",
    description: "A to-do list app that lets users add, complete, and delete tasks, built to practice arrays and local storage.",
    stack: ["devicon-html5-plain colored", "devicon-javascript-plain colored"],
  },
  {
    title: "Personal OS",
    role: "Frontend Developer",
    status: "coming soon",
    description: "A personal operating system web app that mimics a desktop environment, allowing users to open and manage multiple applications in a single interface. Built with React and Tailwind CSS.",
    stack: ["devicon-react-plain colored", "devicon-tailwindcss-plain colored"],
  },
];

/** Placeholder browser-window preview -- monochrome traffic-light
    dots and a monogram, in place of a real screenshot. */
function PreviewFrame({ title }: { title: string }) {
  return (
    <div
      className="relative flex aspect-video items-center justify-center overflow-hidden rounded-t-2xl border-b"
      style={{ backgroundColor: "var(--gray-100)", borderColor: "var(--gray-200)" }}
    >
      <div className="absolute left-3 top-3 flex gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300)" }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300)" }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300)" }} />
      </div>
      <div className="halftone" style={{ opacity: 0.5 }} aria-hidden="true" />
      <span
        className="relative text-4xl"
        style={{ fontFamily: "var(--font-display)", color: "var(--gray-300)" }}
        aria-hidden="true"
      >
        {title.charAt(0)}
      </span>
    </div>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="px-5 py-16 lg:px-6">
      <div className="mx-auto max-w-4xl lg:pl-56">
        <p className="section-eyebrow">05 &mdash; projects</p>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">projects</h2>
        <p className="mb-8 max-w-[46ch]" style={{ color: "var(--gray-500)" }}>
          I&rsquo;m just getting started &mdash; here&rsquo;s what I&rsquo;m planning to build first.
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {PROJECTS.map((project) => (
            <div key={project.title} className="card flex flex-col overflow-hidden p-0">
              <PreviewFrame title={project.title} />

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-base font-semibold">{project.title}</h3>
                    {project.status && <span className="pill shrink-0">{project.status}</span>}
                  </div>
                  <p className="mb-2.5 text-xs" style={{ color: "var(--gray-400)" }}>
                    {project.role}
                  </p>
                  <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--gray-500)" }}>
                    {project.description}
                  </p>
                  <div className="mb-4 flex gap-2">
                    {project.stack.map((icon) => (
                      <i key={icon} className={`${icon} text-base`} aria-hidden="true" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3" style={{ borderTop: "1px solid var(--gray-200)" }}>
                  {project.href ? (
                    <a href={project.href} target="_blank" rel="noopener noreferrer" className="link-arrow" style={{ fontSize: "12px" }}>
                      visit site <span className="arrow-glyph">&#8599;</span>
                    </a>
                  ) : (
                    <span className="micro-label">not live yet</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href="https://github.com/ifwian"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <GithubIcon size={14} strokeWidth={1.8} />
            more on github
          </a>
        </div>
      </div>
    </section>
  );
}
