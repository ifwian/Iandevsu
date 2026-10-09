import { useEffect, useState, type MouseEvent } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemeChoice = "light" | "dark" | "system";
const STORAGE_KEY = "theme";

/**
 * How long the theme transition runs for, in ms.
 *
 * Kept in step with `theme-reveal` (0.65s) in theme.css, and with the
 * `::view-transition-*` duration. The window is flagged on
 * `window.__themeTransitioning` for exactly this long so the Dos pet can hold
 * still through the wipe: a crossfade re-renders every pixel, and her sprite is
 * positioned by a `transform` written on every animation frame, so it would
 * otherwise be captured mid-flip by the snapshot and smear when composited back.
 *
 * The `finished` promise resolves early if the transition is skipped (reduced
 * motion, or a browser without view transitions), so nothing waits needlessly.
 */
const TRANSITION_MS = 650;

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "system", Icon: Monitor },
  { value: "light", label: "light", Icon: Sun },
  { value: "dark", label: "dark", Icon: Moon },
];

declare global {
  interface Window {
    /** True while a theme crossfade/reveal is playing. Read by the Dos pet. */
    __themeTransitioning?: boolean;
  }
}

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

/**
 * Tells the rest of the page that a theme transition is in flight.
 *
 * The window flag is what the Dos pet reads to hold her sprite still. The class
 * is the styling half: theme.css suppresses its colour crossfade while it is on
 * the root, so the circular clip-path reveal is the only thing animating and the
 * two do not overlap and muddy each other.
 *
 * Cleared on both paths -- the `finished` promise and a timer -- because if the
 * flag were ever left set, Dos would stay frozen for the rest of the session.
 */
function setTransitioning(on: boolean) {
  window.__themeTransitioning = on;
  document.documentElement.classList.toggle("theme-transitioning", on);
}

/**
 * Applies the theme inside a circular view transition anchored on the button.
 *
 * Bryl's recipe: a circular reveal expanding from the click point over ~540ms,
 * with the new theme revealed through an animated `clip-path` while the old one
 * sits still underneath (`mix-blend-mode: normal`, both pseudos `animation: none`
 * apart from the reveal -- that pairing is already in theme.css).
 *
 * Falls back to a plain attribute swap where view transitions are unsupported
 * or the visitor asked for reduced motion; the colour crossfade in theme.css
 * still runs either way.
 */
function transitionTheme(choice: ThemeChoice, origin: { x: number; y: number }) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const startViewTransition = (document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  }).startViewTransition;

  if (!startViewTransition || reduced) {
    applyTheme(choice);
    return;
  }

  root.style.setProperty("--theme-toggle-x", `${origin.x}px`);
  root.style.setProperty("--theme-toggle-y", `${origin.y}px`);
  setTransitioning(true);

  const transition = startViewTransition(() => applyTheme(choice));
  void transition.finished.finally(() => {
    setTransitioning(false);
    root.style.removeProperty("--theme-toggle-x");
    root.style.removeProperty("--theme-toggle-y");
    // Belt and braces: if `finished` never settles (a tab in the background,
    // say), drop the flag on a timer so Dos cannot stay frozen.
    window.setTimeout(() => setTransitioning(false), TRANSITION_MS + 250);
  });
}

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

/**
 * The choice a compact toggle should move to, given what is active now.
 *
 * `system` has to stay reachable or it is lost for good: it is the only value
 * that leaves `data-theme` off the root, and `index.html` only pins an explicit
 * light/dark from storage. A compact button that only ever writes "light" or
 * "dark" therefore lets one click retire the OS preference permanently, and the
 * page stops following the system from then on. So it cycles all three.
 */
function nextCompactChoice(choice: ThemeChoice, isDark: boolean): ThemeChoice {
  if (choice === "system") {
    // Resolve "system" to what is on screen first, so the first click is a
    // visible change rather than a no-op; "system" becomes reachable on the
    // click after that.
    return isDark ? "light" : "dark";
  }
  if (choice === "dark") return "system";
  return "dark";
}

export default function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    /**
     * Reads the truth off the document rather than off localStorage.
     *
     * The attribute is what actually decides the rendering, and `index.html`'s
     * bootstrap has already set it before React mounts. Reading storage instead
     * would let the two disagree -- storage saying "dark" while the root carries
     * no attribute (system, light OS) renders the button pressed for a theme that
     * is not on screen, and the first click then jumps somewhere unexpected.
     */
    const readAppliedTheme = (): ThemeChoice => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "light" || attr === "dark") return attr;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
      return "system";
    };

    setChoice(readAppliedTheme());

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      setSystemDark(mediaQuery.matches);
      // Only follow the OS while "system" is the active choice; otherwise the
      // OS flipping would fight the visitor's explicit pick.
      if (readAppliedTheme() === "system") setChoice("system");
    };
    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);

    // Another tab changing the theme should not leave this one showing a stale
    // pressed state, so re-read when the tab regains focus.
    const onFocus = () => setChoice(readAppliedTheme());
    window.addEventListener("focus", onFocus);

    return () => {
      mediaQuery.removeEventListener("change", updateSystemTheme);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const select = (next: ThemeChoice, origin: { x: number; y: number }) => {
    setChoice(next);
    localStorage.setItem(STORAGE_KEY, next);
    transitionTheme(next, origin);
  };

  /** The click point in viewport px, so the reveal starts under the cursor. */
  const originFrom = (event: React.MouseEvent<HTMLElement>): { x: number; y: number } => ({
    x: event.clientX,
    y: event.clientY,
  });

  const isDark = choice === "dark" || (choice === "system" && systemDark);

  if (compact) {
    const Icon = choice === "system" ? Monitor : isDark ? Moon : Sun;

    return (
      <button
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) =>
          select(nextCompactChoice(choice, isDark), originFrom(event))
        }
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        aria-pressed={isDark}
        title={isDark ? "Switch to light theme" : "Switch to dark theme"}
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
          aria-pressed={choice === value}
          title={`${label} theme`}
          className="flex h-6 w-6 items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: choice === value ? "var(--gray-200)" : "transparent",
            color: choice === value ? "var(--ink)" : "var(--gray-400)",
          }}
        >
          <Icon size={12} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}
