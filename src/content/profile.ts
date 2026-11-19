/**
 * Copy used by the site chrome: the sidebar wordmark, status and resume link,
 * plus the name the visitor chat displays.
 *
 * The chat API keeps its own profile copy in `api/chat.ts` because Vercel
 * cannot trace imports out of `/api`; keep the shared facts (name, goes by,
 * location) in sync when they change.
 */
export const PROFILE = {
  name: "Marianne Napaño",
  goesBy: "Ian",
  /** Short uppercase line under the name in the sidebar. */
  tagline: "CS STUDENT · WEB DEV",
  /** Sidebar status line. Set to "" to hide it. */
  availability: "open to opportunities",
  location: "Calamba, Philippines",
  links: {
    /** Contact address for the sidebar's mail shortcut (same address the chat API notifies). */
    email: "iandevsu@gmail.com",
    /**
     * Paste the resume/CV URL here and the sidebar's "view resume" pill appears.
     * Left empty rather than pointed at a guessed path: a link that 404s is
     * worse than no link, and an invented URL in a portfolio is a dead end for
     * anyone who tries it. The sidebar renders nothing for this until it is set.
     */
    resume: "",
  },
} as const;
