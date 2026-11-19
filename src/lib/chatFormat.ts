/**
 * Chat formatting and vocabulary shared by the visitor widget
 * (`components/chat/ChatWithIan.tsx`) and the admin inbox
 * (`pages/ChatInboxPage.tsx`).
 *
 * Anything the two surfaces have to agree on byte-for-byte lives here: the
 * reaction keys sent over the wire, the route -> activity-label mapping, and
 * the timestamp formats. Keeping them in one file is what stops the widget
 * from rendering "9:42 AM" while the inbox renders "09:42" for the same row.
 */

/* -------------------------------------------------------------------------- */
/* Reactions                                                                  */
/* -------------------------------------------------------------------------- */

export type ReactionKind = "thumbs_up" | "heart";

export const REACTION_KINDS: readonly ReactionKind[] = ["thumbs_up", "heart"];

/** Must match `chat_message_reactions.kind` in the Supabase migration. */
function isReactionKind(value: unknown): value is ReactionKind {
  return value === "thumbs_up" || value === "heart";
}

export const REACTION_GLYPH: Record<ReactionKind, string> = {
  thumbs_up: "\u{1F44D}",
  heart: "\u2764\uFE0F",
};

export function reactionLabel(kind: ReactionKind): string {
  return kind === "thumbs_up" ? "thumbs up" : "heart";
}

export interface Reaction {
  message_id: string | number;
  kind: ReactionKind;
  actor: string;
}

export function isReaction(value: unknown): value is Reaction {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (typeof candidate.message_id === "number" || typeof candidate.message_id === "string") &&
    isReactionKind(candidate.kind) &&
    typeof candidate.actor === "string"
  );
}

/** Key for lookups by message, since bigint ids may arrive as number or string. */
export function reactionKey(messageId: string | number, kind: ReactionKind, actor: string): string {
  return `${String(messageId)}|${kind}|${actor}`;
}

/* -------------------------------------------------------------------------- */
/* Timestamps                                                                 */
/* -------------------------------------------------------------------------- */

/** Accepts a `Date`, an epoch number, or an ISO string. "" when unparseable. */
function toDate(value: Date | number | string | undefined | null): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "9:42 AM" -- the compact form used on message meta lines. */
export function formatClock(value: Date | number | string | undefined | null): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Sep 27" -- used for activity timeline entries that are not from today. */
export function formatDayMonth(value: Date | number | string | undefined | null): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Full local date and time, for tooltips and absolute references. */
export function formatFull(value: Date | number | string | undefined | null): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleString();
}

/** "just now" / "12m" / "3h" / "Sep 27" -- dense relative time for list rows. */
export function formatRelative(value: Date | number | string | undefined | null, now = Date.now()): string {
  const date = toDate(value);
  if (!date) return "";
  const seconds = Math.round((now - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDayMonth(date);
}

/**
 * Consecutive messages from the same speaker within this window share one
 * meta line, the way a group-chat client does. Without it a three-message
 * burst prints the same name and time three times, which is noise.
 */
const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;

export function shouldGroupMessage(
  previous: { sender: string; at: number } | null,
  current: { sender: string; at: number }
): boolean {
  if (!previous) return false;
  if (previous.sender !== current.sender) return false;
  return current.at - previous.at < MESSAGE_GROUP_WINDOW_MS;
}

/* -------------------------------------------------------------------------- */
/* Visitor activity                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Route path -> the label the activity timeline shows. Paths the app does not
 * know about fall through to the raw path, so a new route shows up in the
 * timeline as soon as it exists rather than as a blank row.
 */
const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/projects": "Projects",
  "/chat-inbox": "Chat Inbox",
};

export function pageLabel(path: string): string {
  const normalized = path.split("?")[0]?.split("#")[0] || "/";
  return PAGE_LABELS[normalized] ?? normalized;
}
