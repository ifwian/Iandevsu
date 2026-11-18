import { useEffect, useState, type MouseEvent } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "theme";


declare global {
  interface Window {
    /** True while a theme reveal is playing. Read by the Dos pet. */
    __themeTransitioning?: boolean;
  }
}

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
 * Switches theme with a short, even crossfade.
 *
 * `theme-fading` on the root enables a colour transition on every element for
 * the duration (see minimal.css), so surfaces, text and borders all ease
 * between palettes together instead of snapping or wiping. The window flag
 * still tells Dos to hold her sprite still while it runs. Reduced-motion
 * visitors get a plain swap.
 */
const FADE_MS = 450;

function transitionTheme(next: Theme, _origin: { x: number; y: number }) {
  const root = document.documentElement;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyTheme(next);
    return;
  }
  window.__themeTransitioning = true;
  root.classList.add("theme-fading");
  applyTheme(next);
  window.setTimeout(() => {
    root.classList.remove("theme-fading");
    window.__themeTransitioning = false;
  }, FADE_MS + 50);
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
