import { useEffect } from 'react';
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
    stack: [
      "devicon-react-original colored", 
      "devicon-tailwindcss-original colored", 
      "devicon-nodejs-plain colored", 
      "devicon-express-original colored", 
      "devicon-postgresql-plain colored", 
      "devicon-prisma-original colored"
    ]
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
      style={{ backgroundColor: "var(--gray-100, rgba(255, 255, 255, 0.05))", borderColor: "var(--gray-200, rgba(255, 255, 255, 0.1))" }}
    >
      <div className="absolute left-3 top-3 flex gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300, rgba(255, 255, 255, 0.3))" }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300, rgba(255, 255, 255, 0.3))" }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300, rgba(255, 255, 255, 0.3))" }} />
      </div>
      <div className="halftone" style={{ opacity: 0.5 }} aria-hidden="true" />
      <span
        className="relative text-4xl"
        style={{ fontFamily: "'Kode Mono', monospace", color: "var(--gray-300, rgba(255, 255, 255, 0.3))" }}
        aria-hidden="true"
      >
        {title.charAt(0)}
      </span>
    </div>
  );
}

export default function Projects() {
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
      id="projects" 
      className="px-5 py-16 lg:px-6 lg:pl-56"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="max-w-4xl">
        <p className="section-eyebrow text-xs mb-1">0 &mdash; projects</p>
        
        {/* Title in Kode Mono */}
        <h2 
          className="mb-2 text-2xl font-semibold tracking-tight text-white"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          projects
        </h2>

        {/* Subtitle in Geist Mono */}
        <p className="mb-8 max-w-[46ch] text-sm leading-relaxed" style={{ color: "var(--gray-500)" }}>
          I&rsquo;m just getting started &mdash; here&rsquo;s what I&rsquo;m planning to build first.
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {PROJECTS.map((project: Project) => (
            <div 
              key={project.title} 
              className="card flex flex-col overflow-hidden p-0 rounded-xl bg-white/[0.03] border border-white/10"
            >
              <PreviewFrame title={project.title} />

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    {/* Project Title in Kode Mono */}
                    <h3 
                      className="text-base font-semibold text-white tracking-tight"
                      style={{ fontFamily: "'Kode Mono', monospace" }}
                    >
                      {project.title}
                    </h3>

                    {/* Status Badge in Kode Mono */}
                    {project.status && (
                      <span 
                        className="pill shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/15 bg-white/5 text-white/50"
                        style={{ fontFamily: "'Kode Mono', monospace" }}
                      >
                        {project.status}
                      </span>
                    )}
                  </div>

                  {/* Role in Geist Mono */}
                  <p className="mb-2.5 text-xs" style={{ color: "var(--gray-400)" }}>
                    {project.role}
                  </p>

                  {/* Description in Geist Mono */}
                  <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--gray-500)", lineHeight: 1.65 }}>
                    {project.description}
                  </p>

                  {/* Tech Stack Icons */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {project.stack.map((icon) => (
                      <i key={icon} className={`${icon} text-base`} aria-hidden="true" />
                    ))}
                  </div>
                </div>

                {/* Footer Link / Label */}
                <div 
                  className="flex items-center justify-end pt-3" 
                  style={{ borderTop: "1px solid var(--gray-200, rgba(255, 255, 255, 0.1))" }}
                >
                  {project.href ? (
                    <a 
                      href={project.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="link-arrow group text-xs transition-colors hover:text-white"
                      style={{ fontFamily: "'Kode Mono', monospace" }}
                    >
                      visit site{" "}
                      <span className="arrow-glyph inline-block transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                        &#8599;
                      </span>
                    </a>
                  ) : (
                    <span 
                      className="micro-label text-[10px] uppercase tracking-widest text-white/40"
                      style={{ fontFamily: "'Kode Mono', monospace" }}
                    >
                      not live yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* GitHub CTA Button in Kode Mono */}
        <div className="mt-8 flex justify-center">
          <a
            href="https://github.com/ifwian"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-xs text-white transition-colors"
            style={{ fontFamily: "'Kode Mono', monospace" }}
          >
            <GithubIcon size={14} strokeWidth={1.8} />
            more on github
          </a>
        </div>
      </div>
    </section>
  );
}