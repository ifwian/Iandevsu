import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemeChoice = "light" | "dark" | "system";
const STORAGE_KEY = "theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "system", Icon: Monitor },
  { value: "light", label: "light", Icon: Sun },
  { value: "dark", label: "dark", Icon: Moon },
];

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export default function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setChoice(stored);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemDark(mediaQuery.matches);
    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  const select = (next: ThemeChoice) => {
    setChoice(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  const isDark = choice === "dark" || (choice === "system" && systemDark);

  if (compact) {
    const Icon = isDark ? Moon : Sun;

    return (
      <button
        type="button"
        onClick={() => select(isDark ? "light" : "dark")}
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
          onClick={() => select(value)}
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
