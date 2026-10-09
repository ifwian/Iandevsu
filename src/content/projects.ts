import type { TechIconName } from "@/components/icons/TechIcon";

export interface Project {
  title: string;
  role: string;
  status?: string;
  /**
   * Visual weight of the status tag, as a closed union rather than something
   * derived from the `status` string.
   *
   * `status` is prose the visitor reads ("coming soon"), and prose drifts --
   * casing changes, a new wording lands, "in progress" arrives. Matching on it
   * from the card would mean an unrecognised string silently falling back to the
   * neutral pill, which is the kind of quiet failure the rest of this project
   * models its types around. Declaring the three tones here makes "a project has
   * no tone" a compile error to notice rather than a visual bug to hunt.
   *
   *   live     -- built, reachable or about to be
   *   active   -- being built right now
   *   template -- a practice exercise, not a real project
   */
  tone?: "live" | "active" | "template";
  description: string;
  /** Key into the outline mark set in `components/icons/TechIcon.tsx`. */
  stack: TechIconName[];
  href?: string; // omit if not live yet
  /**
   * Screenshot for the card's preview area (16:9, WebP, saved in
   * `public/images/projects/`). Omit it and the card shows the "still building"
   * scene instead: the project's own mark, Dos, and a progress bar.
   */
  image?: { src: string; alt: string };
  /**
   * Build progress, 0-100, for the "still building" scene. Omit it and the bar
   * shows an animated "in progress" sweep instead of a percentage.
   */
  progress?: number;
  /** Text in Dos's speech bubble on the "still building" scene. Default: "still building". */
  buildNote?: string;
}

/*
 * TEMPLATE: copy this block into PROJECTS to add a project.
 *
 * {
 *   title: "Project name",
 *   role: "Your role",
 *   status: "coming soon",            // short tag text
 *   tone: "active",                   // "live" | "active" | "template"
 *   description: "One or two sentences.",
 *   stack: ["react", "tailwindcss"],  // keys of TechIcon, first one is the card's big mark
 *   href: "https://...",              // omit until deployed
 *   image: { src: "/images/projects/project-name.webp", alt: "Screenshot of ..." }, // omit while building
 *   progress: 40,                     // optional, 0-100 (only shown without an image)
 * },
 */

export const PROJECTS: Project[] = [
  {
    title: "The Sifted Café",
    role: "Database & Backend developer",
    status: "Deploying soon",
    tone: "live",
    description:
      "A full-stack web app for a local café, built with React, Tailwind CSS, Node.js, Express, PostgreSQL, and Prisma. Features include a menu display, online reservation system, and admin dashboard.",
    stack: [
      "react",
      "tailwindcss",
      "nodejs",
      "express",
      "postgresql",
      "prisma",
    ],
    image: {
      src: "/images/projects/the-sifted-cafe.webp",
      alt: "The Sifted Cafe home page: a blue hero reading Good coffee. Good food. Good people., with View Menu and Reserve a Table buttons.",
    },
  },
  {
    title: "LMS Notifier",
    role: "Backend Developer",
    status: "coming soon",
    tone: "active",
    description: "A small web app that checks a Learning Management System (LMS) for new announcements and sends notifications to users. Built with Python.",
    stack: ["python"],
    image: {
      src: "/images/projects/lms-notifier.webp",
      alt: "e-GURO Companion landing page: Your LMS, without the constant checking, with Connect, Detect and Notify steps.",
    },
  },
  {
    // TODO: confirm title, role, status and stack. Only the description and image
    // come from the screenshot; the rest are placeholders.
    title: "FRAME",
    role: "Frontend Developer",
    status: "coming soon",
    tone: "active",
    description: "A reservation site for a gaming station lounge: check live station availability, see opening hours and pricing, and reserve a slot.",
    stack: ["react", "tailwindcss"],
    image: {
      src: "/images/projects/frame.webp",
      alt: "FRAME home page: Reserve. Play. Repeat., with a Reserve a Station button and live availability of 7 of 12 stations.",
    },
  },
  {
    title: "To-Do List",
    role: "Frontend Developer",
    status: "coming soon",
    tone: "active",
    description: "A to-do list app that lets users add, complete, and delete tasks, built to practice arrays and local storage.",
    stack: ["html5", "javascript"],
  },
  {
    title: "Personal OS",
    role: "Frontend Developer",
    status: "coming soon",
    tone: "active",
    description: "A personal operating system web app that mimics a desktop environment, allowing users to open and manage multiple applications in a single interface. Built with React and Tailwind CSS.",
    stack: ["react", "tailwindcss"],
  },
  {
    title: "Habit Tracker",
    role: "Frontend Developer",
    status: "template",
    tone: "template",
    description: "A daily habit tracker with streaks and simple charts, meant as a practice ground for state management patterns beyond useState.",
    stack: ["react", "tailwindcss"],
  },
  {
    title: "Markdown Notes",
    role: "Full-stack Developer",
    status: "template",
    tone: "template",
    description: "A notes app that saves Markdown files to a database and renders them live, for practicing CRUD with a real backend.",
    stack: ["react", "nodejs", "mongodb"],
  },
  {
    title: "URL Shortener",
    role: "Backend Developer",
    status: "template",
    tone: "template",
    description: "A minimal link-shortening service with click analytics, built to practice API design and database schema basics.",
    stack: ["nodejs", "express", "postgresql"],
  },
  {
    title: "Recipe Finder",
    role: "Frontend Developer",
    status: "template",
    tone: "template",
    description: "A recipe search app pulling from a public food API, for practicing fetch, filtering, and loading/error states.",
    stack: ["javascript", "css3"],
  },
];

