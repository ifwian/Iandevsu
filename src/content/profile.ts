/**
 * One place to edit the facts the "Chat with Ian" persona (and,
 * eventually, anything else that needs them) draws on. Keep this in
 * sync with the actual site content in components/sections/* -- this
 * file doesn't replace those, it's just what gets fed to the AI so
 * it doesn't make things up about you.
 */
export const PROFILE = {
  name: "Marianne Napaño",
  goesBy: "Ian",
  headline: "Computer Science student & aspiring web developer",
  location: "Calamba, Philippines",
  bio: [
    "Computer Science student at City College of Calamba (2025-2029), exploring web development and software engineering.",
    "Currently learning React, Node.js, and SQL, on top of a solid HTML/CSS/JavaScript/Git foundation.",
    "Enjoys building small, practical projects to learn by doing rather than just reading about it.",
    "Interests outside code: photography, reading, gaming, badminton, music.",
  ],
  stack: {
    core: ["HTML", "CSS", "JavaScript"],
    tools: ["Git", "GitHub", "Figma"],
    learning: ["React", "Node.js", "SQL", "Java", "Python"],
    skills: ["C++", "Java", "Python", "React", "HTML", "CSS", "JavaScript", "web development"],
  },
  projects: [
    "Coffee Shop Website -- a responsive landing page practicing HTML/CSS layout (not deployed yet).",
    "Calculator -- a JavaScript DOM manipulation exercise (not deployed yet).",
    "To-Do List -- practicing arrays and local storage (not deployed yet).",
    "Weather App -- fetching and displaying live data from a weather API (not deployed yet).",
  ],
  certifications: ["HackerRank: Python (Basic), Java (Basic), JavaScript (Intermediate), C# (Basic)"],
  links: {
    email: "iandevsu@gmail.com",
    github: "https://github.com/ifwian",
    linkedin: "https://www.linkedin.com/in/ifwiannn/",
  },
} as const;

/** Flattened text block dropped into the chat system prompt. */
export function buildProfileContext(): string {
  return `
Name: ${PROFILE.name} (goes by "${PROFILE.goesBy}")
Headline: ${PROFILE.headline}
Location: ${PROFILE.location}

Bio:
${PROFILE.bio.map((line) => `- ${line}`).join("\n")}

Tech stack:
- Core: ${PROFILE.stack.core.join(", ")}
- Skills: ${PROFILE.stack.skills.join(", ")}
- Tools: ${PROFILE.stack.tools.join(", ")}
- Currently learning: ${PROFILE.stack.learning.join(", ")}

Projects:
${PROFILE.projects.map((p) => `- ${p}`).join("\n")}

Certifications:
${PROFILE.certifications.map((c) => `- ${c}`).join("\n")}

Contact: GitHub ${PROFILE.links.github} · LinkedIn ${PROFILE.links.linkedin}
`.trim();
}
