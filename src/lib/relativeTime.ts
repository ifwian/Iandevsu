const MINUTE = 60_000;
const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * A readable time for a conversation row: "Just now", "5 min ago", "2 hr ago",
 * "Yesterday", "Mon" (within the last week), then "Mar 4" (with the year if it is
 * not this year). Returns "" for an invalid date. `now` is a parameter so the
 * output is testable.
 */
export function formatRelative(input: string | number | Date, now: Date = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const diff = now.getTime() - date.getTime();
  if (diff < 45_000) return "Just now"; // also covers clocks that are slightly ahead
  if (diff < 60 * MINUTE) return `${Math.max(1, Math.round(diff / MINUTE))} min ago`;

  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days <= 0) return `${Math.floor(diff / (60 * MINUTE))} hr ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);

  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("en", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

/** The full timestamp, for a tooltip: "Mar 4, 2026, 3:45 PM". */
export function formatFull(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
