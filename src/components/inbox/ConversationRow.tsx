import { Badge } from "@/components/ui/badge";
import { formatFull, formatRelative } from "@/lib/relativeTime";

interface ConversationRowProps {
  name: string;
  preview: string;
  time: string | number | Date;
  /** Unread messages; 0 shows "Read". */
  unread?: number;
  /** e.g. "Active", "Waiting", "Resolved". */
  statusLabel?: string;
  selected?: boolean;
  /** The admin has an unsent reply in this conversation. */
  draft?: boolean;
  onSelect: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

/** One conversation in the list: who, when, the latest message, and whether it needs attention. */
export default function ConversationRow({ name, preview, time, unread = 0, statusLabel, selected = false, draft = false, onSelect }: ConversationRowProps) {
  const date = time instanceof Date ? time : new Date(time);
  const iso = Number.isNaN(date.getTime()) ? undefined : date.toISOString();

  return (
    <button
      type="button"
      className="ibx-row"
      data-selected={selected ? "true" : undefined}
      data-unread={unread > 0 ? "true" : undefined}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
    >
      <span className="ibx-avatar" aria-hidden="true">
        {initials(name)}
      </span>
      <span className="ibx-row-body">
        <span className="ibx-row-top">
          <span className="ibx-row-name">{name}</span>
          <time className="ibx-row-time" dateTime={iso} title={formatFull(date)}>
            {formatRelative(date)}
          </time>
        </span>
        <span className="ibx-row-preview">
          {draft ? <span className="ibx-row-draft">Draft: </span> : null}
          {preview || "No messages yet"}
        </span>
        <span className="ibx-row-meta">
          {unread > 0 ? <Badge>{unread} unread</Badge> : <Badge variant="outline">Read</Badge>}
          {statusLabel ? <Badge variant="secondary">{statusLabel}</Badge> : null}
        </span>
      </span>
    </button>
  );
}
