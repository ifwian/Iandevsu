import type { Reaction, VisitorActivity } from "@/lib/chatFormat";

/**
 * Shapes the admin inbox exchanges with `/api/chat?admin=1`.
 *
 * They live here rather than in the page so the three panel components can
 * take typed props without importing the page (which would be a cycle), and so
 * the validators sit in one place instead of being re-implemented per panel.
 */

export interface Conversation {
  id: string;
  visitor_id: string;
  session_started_at: string;
  status: string;
  last_message_at: string;
  last_message_preview: string;
  /** Optional contact details -- null on conversations predating the pre-chat form. */
  visitor_name: string | null;
  visitor_email: string | null;
  /** 'ai' | 'takeover'. Undefined when the takeover migration has not been run. */
  mode?: string;
  /**
   * Visitor messages stored since the admin last opened the thread. Absent
   * (not zero) when the inbox migration has not been applied -- see
   * `ConversationRecord` in api/chat.ts for why the two are not merged.
   */
  unread_count?: number;
  first_seen_at?: string;
  device?: string | null;
  current_page?: string | null;
}

export interface InboxMessage {
  id: string | number;
  conversation_id: string;
  role: "visitor" | "assistant" | "admin" | "system";
  body: string;
  created_at: string;
}

export interface Note {
  id: string | number;
  conversation_id: string;
  body: string;
  created_at: string;
}

/** Everything the visitor information panel shows. */
export interface VisitorInfo {
  name: string | null;
  email: string | null;
  /** First time this person was ever seen, across every session. */
  firstSeenAt: string;
  /** This particular chat thread's start. */
  sessionStartedAt: string;
  currentPage: string | null;
  device: string | null;
  sessionCount: number;
  visitorId: string;
}

export interface ThreadPayload {
  messages: InboxMessage[];
  notes: Note[];
  activity: VisitorActivity[];
  reactions: Reaction[];
  visitor: VisitorInfo;
}

/** chat_messages.id is a bigint: PostgREST may hand back number or string. */
export function isRowId(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

/** Absent, null, or a string -- the contact columns are optional. */
export function isOptionalText(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

export function normalizeContact(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.visitor_id === "string" &&
    typeof candidate.session_started_at === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.last_message_at === "string" &&
    typeof candidate.last_message_preview === "string" &&
    // Must stay optional, otherwise conversations created before the pre-chat
    // form (and the migration) would vanish from the list entirely.
    isOptionalText(candidate.visitor_name) &&
    isOptionalText(candidate.visitor_email)
  );
}

export function isInboxMessage(value: unknown): value is InboxMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.id) &&
    typeof candidate.conversation_id === "string" &&
    // 'system' must be accepted. Takeover and resolution announcements are
    // stored with that role, and rejecting it here silently dropped them from
    // the transcript the admin is reading.
    (candidate.role === "visitor" ||
      candidate.role === "assistant" ||
      candidate.role === "admin" ||
      candidate.role === "system") &&
    typeof candidate.body === "string" &&
    typeof candidate.created_at === "string"
  );
}

export function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.id) &&
    typeof candidate.conversation_id === "string" &&
    typeof candidate.body === "string" &&
    typeof candidate.created_at === "string"
  );
}

export function isVisitorInfo(value: unknown): value is VisitorInfo {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.firstSeenAt === "string" &&
    typeof candidate.sessionStartedAt === "string" &&
    typeof candidate.sessionCount === "number" &&
    typeof candidate.visitorId === "string" &&
    isOptionalText(candidate.name) &&
    isOptionalText(candidate.email) &&
    isOptionalText(candidate.currentPage) &&
    isOptionalText(candidate.device)
  );
}

/** Best label for a visitor: their name, else a trimmed id. */
export function visitorLabel(conversation: Conversation): string {
  return normalizeContact(conversation.visitor_name) || `anonymous · ${conversation.visitor_id.slice(0, 8)}`;
}

/** Role -> the word the transcript puts above each bubble. */
export function roleLabel(role: InboxMessage["role"]): string {
  if (role === "visitor") return "visitor";
  if (role === "admin") return "you";
  if (role === "system") return "notice";
  return "assistant";
}

/** Every note is a fixed-height row so a long one cannot push the composer out. */
export const MAX_NOTE_LENGTH = 2000;
