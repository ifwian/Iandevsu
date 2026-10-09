import { useEffect, useState, type MouseEvent } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "theme";

/**
 * How long the theme transition runs for, in ms.
 *
 * Kept in step with `theme-reveal` (0.65s) in theme.css. The window is flagged on
 * `window.__themeTransitioning` for exactly this long so the Dos pet can hold
 * still through the wipe: her sprite is positioned by a `transform` written on
 * every animation frame, so it would otherwise be captured mid-flip by the
 * snapshot and smear when composited back.
 */
const TRANSITION_MS = 650;

declare global {
  interface Window {
    /** True while a theme reveal is playing. Read by the Dos pet. */
    __themeTransitioning?: boolean;
  }
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<unknown> };
};

/**
 * The theme that is on screen right now.
 *
 * The attribute is what decides the rendering, and `index.html`'s bootstrap has
 * already set it before React mounts when the visitor has chosen one. With no
 * choice yet the page follows the OS, so ask the OS: that is what is showing.
 */
function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Tells the rest of the page that a theme transition is in flight.
 *
 * The window flag is what Dos reads to hold her sprite still. The class is the
 * styling half: theme.css switches off its colour crossfade while it is on the
 * root, so the circular reveal is the only thing animating.
 */
function setTransitioning(on: boolean) {
  window.__themeTransitioning = on;
  document.documentElement.classList.toggle("theme-transitioning", on);
}

/**
 * Switches theme with a circular reveal that grows out of the click point.
 *
 * The new theme is revealed through an animated `clip-path` (`theme-reveal` in
 * theme.css) while a snapshot of the old one sits still underneath. The radius
 * is measured to the farthest corner, so the circle reaches the edges exactly
 * as the animation ends instead of finishing early and idling.
 *
 * `startViewTransition` is called ON `document`. It is a method that needs
 * `document` as its receiver: pulling it into a variable and calling that throws
 * "Illegal invocation", which used to abort the click, leave the theme unchanged
 * and leave `theme-transitioning` stuck on. If the transition cannot start for
 * any reason the theme is still applied, and the flag is always cleared.
 *
 * Falls back to a plain swap (the colour crossfade in theme.css still runs) where
 * view transitions are unsupported or the visitor asked for reduced motion.
 */
function transitionTheme(next: Theme, origin: { x: number; y: number }) {
  const root = document.documentElement;
  const doc = document as ViewTransitionDocument;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof doc.startViewTransition !== "function" || reduced) {
    applyTheme(next);
    return;
  }

  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  root.style.setProperty("--theme-toggle-x", `${origin.x}px`);
  root.style.setProperty("--theme-toggle-y", `${origin.y}px`);
  root.style.setProperty("--theme-reveal-radius", `${Math.ceil(radius)}px`);
  setTransitioning(true);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    setTransitioning(false);
    root.style.removeProperty("--theme-toggle-x");
    root.style.removeProperty("--theme-toggle-y");
    root.style.removeProperty("--theme-reveal-radius");
  };
  // Belt and braces, started right away: if `finished` never settles (a tab in
  // the background, say) Dos must not stay frozen for the rest of the session.
  window.setTimeout(cleanup, TRANSITION_MS + 250);

  try {
    const transition = doc.startViewTransition(() => applyTheme(next));
    void transition.finished.then(cleanup, cleanup);
  } catch {
    applyTheme(next);
    cleanup();
  }
}

/** The click point in viewport px; for a keyboard "click" the centre of the button. */
function originFrom(event: MouseEvent<HTMLElement>): { x: number; y: number } {
  if (event.detail === 0) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: event.clientX, y: event.clientY };
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "light", Icon: Sun },
  { value: "dark", label: "dark", Icon: Moon },
];

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

/**
 * Light / dark switch.
 *
 * There is no "system" button. A first-time visitor still gets the OS preference
 * (the page follows it until a choice is made); the first click stores an
 * explicit light or dark and the page keeps it from then on.
 *
 * Every instance on the page (the sidebar and the mobile bar both render one)
 * watches `data-theme`, so they stay in step whichever one was clicked.
 */
export default function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // With no explicit choice the page follows the OS, so follow its changes too.
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", sync);
    // Another tab changing the theme should not leave this one stale.
    window.addEventListener("focus", sync);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const select = (next: Theme, origin: { x: number; y: number }) => {
    if (next === readTheme()) {
      // Already showing it: just record the choice, no animation for nothing.
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return;
    }
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
    transitionTheme(next, origin);
  };

  const isDark = theme === "dark";

  if (compact) {
    const Icon = isDark ? Moon : Sun;
    const label = isDark ? "Switch to light theme" : "Switch to dark theme";

    return (
      <button
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) =>
          select(isDark ? "light" : "dark", originFrom(event))
        }
        aria-label={label}
        title={label}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--gray-200)] text-[var(--gray-500)] transition-colors hover:text-[var(--ink)] ${className}`.trim()}
      >
        <Icon size={15} strokeWidth={1.7} />
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${className}`.trim()}
      style={{ borderColor: "var(--gray-200)", backgroundColor: "var(--gray-50)" }}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={(event: MouseEvent<HTMLButtonElement>) => select(value, originFrom(event))}
          aria-label={`${label} theme`}
          aria-pressed={theme === value}
          title={`${label} theme`}
          className="flex h-6 w-6 items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: theme === value ? "var(--gray-200)" : "transparent",
            color: theme === value ? "var(--ink)" : "var(--gray-400)",
          }}
        >
          <Icon size={12} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}
