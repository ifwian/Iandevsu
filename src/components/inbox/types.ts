/**
 * Shapes the browser half of the admin inbox exchanges with `/api/chat?admin=1`,
 * and the validators that guard them.
 *
 * They live apart from the page so the row, the header and the transcript can
 * take typed props without importing the page (which would be a cycle), and so
 * "what the server is allowed to send" is answered once instead of per view.
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
  /**
   * Admin-side archive marker. Null (or absent, before
   * 20261019010000_add_chat_archived.sql is applied) means the conversation is
   * in the inbox; a timestamp means it is filed away.
   */
  archived_at?: string | null;
}

export interface InboxMessage {
  id: string | number;
  conversation_id: string;
  role: "visitor" | "assistant" | "admin" | "system";
  body: string;
  created_at: string;
}

/**
 * The visitor summary the thread response carries.
 *
 * Deliberately narrower than the server's object: this is what the header
 * actually renders. `sessionCount` and `device` still arrive and are ignored
 * rather than validated, so an older server cannot fail the whole thread on a
 * field the header does not use.
 */
export interface VisitorInfo {
  name: string | null;
  email: string | null;
  /** First time this person was ever seen, across every session. */
  firstSeenAt: string;
  /** This particular chat thread's start. */
  sessionStartedAt: string;
  currentPage: string | null;
  visitorId: string;
}

/* chat_messages.id is a bigint: PostgREST may hand back number or string. */
function isRowId(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

/** Absent, null, or a string -- the contact columns are optional. */
function isOptionalText(value: unknown): boolean {
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
    isOptionalText(candidate.archived_at) &&
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
    // 'system' must be accepted. Takeover announcements are stored with that
    // role, and rejecting it here silently dropped them from the transcript the
    // admin is reading.
    (candidate.role === "visitor" ||
      candidate.role === "assistant" ||
      candidate.role === "admin" ||
      candidate.role === "system") &&
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
    typeof candidate.visitorId === "string" &&
    isOptionalText(candidate.name) &&
    isOptionalText(candidate.email) &&
    isOptionalText(candidate.currentPage)
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

/** Unread count, tolerating the column not existing. */
export function unreadOf(conversation: Conversation): number {
  return typeof conversation.unread_count === "number" && conversation.unread_count > 0
    ? conversation.unread_count
    : 0;
}

/** Archived at any point in the past. */
export function isArchived(conversation: Conversation): boolean {
  return Boolean(conversation.archived_at);
}

/** Case-insensitive match on name, email, id, or the label the list shows. */
export function matchesQuery(conversation: Conversation, term: string): boolean {
  if (
    conversation.visitor_name?.toLowerCase().includes(term) ||
    conversation.visitor_email?.toLowerCase().includes(term) ||
    conversation.visitor_id.toLowerCase().includes(term)
  ) {
    return true;
  }
  // Match on what the list actually renders, so searching for the text a
  // visitor sees ("anonymous") finds the nameless rows.
  return visitorLabel(conversation).toLowerCase().includes(term);
}
