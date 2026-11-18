import { useEffect, useState } from "react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

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

const REVEAL_MS = 500;

/** Called by the toggler INSIDE its view-transition callback, so it must be synchronous. */
function commitTheme(next: Theme) {
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  // Dos holds still while the circular reveal plays.
  window.__themeTransitioning = true;
  window.setTimeout(() => {
    window.__themeTransitioning = false;
  }, REVEAL_MS + 100);
}

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

/**
 * Light / dark switch: Magic UI's animated toggler (circular view-transition
 * reveal from the button), driven by the `data-theme` attribute that the rest of
 * the site reads. Every instance watches the attribute so they stay in step.
 */
export default function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", sync);
    window.addEventListener("focus", sync);
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <AnimatedThemeToggler
      theme={theme}
      duration={REVEAL_MS}
      onThemeChange={commitTheme}
      aria-label={label}
      title={label}
      className={`flex ${compact ? "h-8 w-8" : "h-9 w-9"} shrink-0 items-center justify-center rounded-full border border-[var(--gray-200)] text-[var(--gray-500)] transition-colors hover:text-[var(--ink)] [&>svg]:h-[15px] [&>svg]:w-[15px] ${className}`.trim()}
    />
  );
}
