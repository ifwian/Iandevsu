import { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";

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

/** Three-button segmented toggle -- pick a theme directly instead of cycling. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    if (stored) setChoice(stored);
  }, []);

  const select = (next: ThemeChoice) => {
    setChoice(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

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