import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Theme system (no external theme library).
 *
 * `useTheme()` mirrors the `next-themes` surface -- `theme`, `resolvedTheme`,
 * `setTheme` -- so Magic UI's documented usage drops in unchanged:
 *
 *   const { resolvedTheme, setTheme } = useTheme();
 *   <AnimatedThemeToggler
 *     theme={resolvedTheme === "dark" ? "dark" : "light"}
 *     onThemeChange={setTheme}
 *   />
 *
 * The project is a Vite SPA, so the pieces next-themes would give us are
 * implemented here in ~100 lines instead of adding a dependency:
 *   - persistence     localStorage["theme"]  ("dark" | "light" | "system")
 *   - no flash        the inline script in index.html applies the same
 *                     resolution before first paint (keep the two in step)
 *   - cross-tab sync  the `storage` event
 *   - colours         tokens.css, selected by <html data-theme>
 */

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const THEME_STORAGE_KEY = "theme";
/** Dark is the default. A visitor who has never chosen gets dark. */
const DEFAULT_THEME: Theme = "dark";

/** Mirrors --bg in tokens.css; used for <meta name="theme-color"> fallback. */
const FALLBACK_BG: Record<ResolvedTheme, string> = { dark: "#09090a", light: "#ffffff" };

declare global {
  interface Window {
    /** True while a theme change is animating. Read by the Dos pet. */
    __themeTransitioning?: boolean;
  }
}

interface ThemeContextValue {
  /** What the visitor chose (may be "system"). */
  theme: Theme;
  /** What is actually on screen. Always "dark" or "light". */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME; // storage blocked (private mode, etc.)
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let fadeTimer: number | undefined;

/** Writes the theme to the DOM. Safe to call from inside a view transition. */
function applyToDom(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === resolved) return;

  // Which smoothing applies depends on who is driving the change:
  //  - the Magic UI toggler already marks <html data-magicui-theme-vt> and
  //    animates a reveal, so add nothing (a fade on top would fight it);
  //  - otherwise fade, unless the visitor asked for reduced motion.
  const revealing = root.dataset.magicuiThemeVt === "active";
  if (!revealing) {
    window.clearTimeout(fadeTimer);
    if (prefersReducedMotion()) {
      root.classList.add("theme-freeze");
      fadeTimer = window.setTimeout(() => root.classList.remove("theme-freeze"), 60);
    } else {
      root.classList.add("theme-fading");
      fadeTimer = window.setTimeout(() => root.classList.remove("theme-fading"), 400);
    }
  }

  root.setAttribute("data-theme", resolved);
  // `dark` class + inline colour-scheme keep Tailwind `dark:` utilities and
  // native widgets (scrollbars, form controls) in step with the attribute.
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;

  window.__themeTransitioning = true;
  window.setTimeout(() => {
    window.__themeTransitioning = false;
  }, 700);
}

/** Keeps the mobile browser chrome the same colour as the page. */
function syncThemeColor(resolved: ResolvedTheme) {
  const bg =
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() ||
    FALLBACK_BG[resolved];
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m, i) => {
    if (i > 0) m.remove();
  });
  const meta = metas[0] ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
  meta.removeAttribute("media");
  meta.setAttribute("content", bg);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolved] = useState<ResolvedTheme>(() => resolve(readStoredTheme()));

  // Apply whenever the resolved theme changes.
  useEffect(() => {
    applyToDom(resolvedTheme);
    syncThemeColor(resolvedTheme);
  }, [resolvedTheme]);

  // Follow the OS only while the visitor has chosen "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setResolved(systemTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next = isTheme(e.newValue) ? e.newValue : DEFAULT_THEME;
      setThemeState(next);
      setResolved(resolve(next));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice still applies for this visit */
    }
    const resolved = resolve(next);
    setThemeState(next);
    setResolved(resolved);
    // Apply synchronously too. The Magic UI toggler calls this from inside
    // document.startViewTransition(), whose callback must change the DOM
    // before it returns for the new-theme snapshot to be correct.
    applyToDom(resolved);
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
