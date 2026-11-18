import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useTheme } from "@/lib/theme";

const REVEAL_MS = 500;

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
  /** No outline ring: used in the sidebar footer. */
  bare?: boolean;
}

/**
 * Light / dark switch: Magic UI's animated toggler (circular view-transition
 * reveal from the button), driven by ThemeProvider. Every instance reads the
 * same context, so they cannot drift apart.
 */
export default function ThemeToggle({ className = "", compact = false, bare = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const label = resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <AnimatedThemeToggler
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onThemeChange={setTheme}
      duration={REVEAL_MS}
      aria-label={label}
      title={label}
      className={`flex ${compact ? "h-8 w-8" : "h-9 w-9"} shrink-0 items-center justify-center rounded-full ${bare ? "" : "border border-[var(--border)]"} text-[var(--text-muted)] transition-colors hover:text-[var(--ink)] [&>svg]:h-[15px] [&>svg]:w-[15px] ${className}`.trim()}
    />
  );
}
