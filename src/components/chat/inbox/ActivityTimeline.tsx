import { MessageCircle, MousePointerClick } from "lucide-react";
import { formatClock, formatDayMonth, pageLabel, type VisitorActivity } from "@/lib/chatFormat";

interface ActivityTimelineProps {
  activity: VisitorActivity[];
  currentPage: string | null;
  /**
   * False when a parent already owns the scroll region and the section label.
   *
   * Mounted in the inbox's context panel, which now scrolls once for both of its
   * tabs and labels them on a tab strip above. This component's own
   * `overflow-y-auto` and its own "visitor activity" heading were then a second
   * scrollbar and a second label for the same content -- nested scroll regions
   * fight over the wheel, and two headings for one panel is one too many.
   */
  contained?: boolean;
}

function isToday(value: string, now: number): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date(now);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Page-by-page history for the selected visitor, newest first.
 *
 * Reads as a rail rather than a table because the useful signal is the
 * *sequence* -- Home, then Projects, then Contact, then the chat -- and a table
 * of timestamps flattens that into rows. The rail keeps the order visible and
 * still leaves the exact time in a `title` for when it matters.
 *
 * The row is a link only for same-origin paths, and the full activity list is
 * already limited server-side, so this cannot be used to probe the site.
 */
export default function ActivityTimeline({ activity, currentPage, contained = true }: ActivityTimelineProps) {
  // One timestamp for the whole render, so two rows rendered in the same frame
  // cannot disagree about what "today" is.
  const now = Date.now();

  return (
    <div className={contained ? "flex min-h-0 flex-col" : undefined}>
      {contained && (
        <div className="shrink-0 border-b border-[var(--gray-200)] pb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <MousePointerClick size={14} strokeWidth={1.8} aria-hidden="true" />
            visitor activity
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--gray-400)]">
            Newest first
            {currentPage ? ` · on ${pageLabel(currentPage)} now` : ""}
          </p>
        </div>
      )}

      <div
        className={contained ? "min-h-0 flex-1 overflow-y-auto py-2" : "py-1"}
        style={contained ? { borderTop: "1px solid var(--gray-200)" } : undefined}
      >
        {activity.length === 0 ? (
          <p className="py-3 text-[11px] italic leading-relaxed text-[var(--gray-400)]">
            Nothing recorded yet. Pages are logged while the chat is open.
          </p>
        ) : (
          <ol className="space-y-3">
            {activity.map((entry) => {
              const isChat = entry.kind === "chat";
              const label = entry.label || entry.page || "/";
              const time = (
                <time dateTime={entry.created_at} title={new Date(entry.created_at).toLocaleString()}>
                  {isToday(entry.created_at, now) ? formatClock(entry.created_at) : formatDayMonth(entry.created_at)}
                </time>
              );

              return (
                <li key={entry.id} className="activity-row">
                  <span className="activity-rail" aria-hidden="true">
                    {isChat ? (
                      <MessageCircle size={11} strokeWidth={1.8} style={{ color: "var(--ink)" }} />
                    ) : (
                      <span
                        className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "var(--gray-400)" }}
                      />
                    )}
                  </span>
                  <div className="min-w-0 pb-0.5">
                    <p className="break-words text-xs leading-tight" style={{ color: "var(--ink)" }}>
                      {label}
                    </p>
                    <p
                      className="mt-0.5 text-[10px] uppercase tracking-[0.08em]"
                      style={{ color: "var(--gray-400)", fontFamily: "var(--font-mono)" }}
                    >
                      {isChat ? "chat · " : ""}
                      {time}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
