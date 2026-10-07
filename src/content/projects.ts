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
  stack: string[]; // devicon classes
  href?: string; // omit if not live yet
}

export const PROJECTS: Project[] = [
  {
    title: "The Sifted Café",
    role: "Database & Backend developer",
    status: "Deploying soon",
    tone: "live",
    description:
      "A full-stack web app for a local café, built with React, Tailwind CSS, Node.js, Express, PostgreSQL, and Prisma. Features include a menu display, online reservation system, and admin dashboard.",
    stack: [
      "devicon-react-original colored",
      "devicon-tailwindcss-original colored",
      "devicon-nodejs-plain colored",
      "devicon-express-original colored",
      "devicon-postgresql-plain colored",
      "devicon-prisma-original colored",
    ],
  },
  {
    title: "LMS Notifier",
    role: "Backend Developer",
    status: "coming soon",
    tone: "active",
    description: "A small web app that checks a Learning Management System (LMS) for new announcements and sends notifications to users. Built with Python.",
    stack: ["devicon-python-plain colored"],
  },
  {
    title: "To-Do List",
    role: "Frontend Developer",
    status: "coming soon",
    tone: "active",
    description: "A to-do list app that lets users add, complete, and delete tasks, built to practice arrays and local storage.",
    stack: ["devicon-html5-plain colored", "devicon-javascript-plain colored"],
  },
  {
    title: "Personal OS",
    role: "Frontend Developer",
    status: "coming soon",
    tone: "active",
    description: "A personal operating system web app that mimics a desktop environment, allowing users to open and manage multiple applications in a single interface. Built with React and Tailwind CSS.",
    stack: ["devicon-react-plain colored", "devicon-tailwindcss-plain colored"],
  },
  {
    title: "Habit Tracker",
    role: "Frontend Developer",
    status: "template",
    tone: "template",
    description: "A daily habit tracker with streaks and simple charts, meant as a practice ground for state management patterns beyond useState.",
    stack: ["devicon-react-original colored", "devicon-tailwindcss-original colored"],
  },
  {
    title: "Markdown Notes",
    role: "Full-stack Developer",
    status: "template",
    tone: "template",
    description: "A notes app that saves Markdown files to a database and renders them live, for practicing CRUD with a real backend.",
    stack: ["devicon-react-original colored", "devicon-nodejs-plain colored", "devicon-mongodb-plain colored"],
  },
  {
    title: "URL Shortener",
    role: "Backend Developer",
    status: "template",
    tone: "template",
    description: "A minimal link-shortening service with click analytics, built to practice API design and database schema basics.",
    stack: ["devicon-nodejs-plain colored", "devicon-express-original colored", "devicon-postgresql-plain colored"],
  },
  {
    title: "Recipe Finder",
    role: "Frontend Developer",
    status: "template",
    tone: "template",
    description: "A recipe search app pulling from a public food API, for practicing fetch, filtering, and loading/error states.",
    stack: ["devicon-javascript-plain colored", "devicon-css3-plain colored"],
  },
];

