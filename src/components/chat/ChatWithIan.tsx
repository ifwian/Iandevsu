import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Paperclip, RotateCcw, Send, X } from "lucide-react";
import { PROFILE } from "@/content/profile";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/api";
import {
  attachmentTranscriptLine,
  formatBytes,
  formatClock,
  isReaction,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  reactionKey,
  shouldGroupMessage,
  type Reaction,
  type ReactionKind,
} from "@/lib/chatFormat";
import TypingIndicator from "@/components/chat/TypingIndicator";
import ReactionBar from "@/components/chat/ReactionBar";
import { useTypingSignal } from "@/lib/useTypingSignal";

interface MessageAttachment {
  name: string;
  size: number;
  /**
   * Object URL for a local preview. Created at send time and therefore not
   * restored from history -- after a reload the chip shows the name and size
   * only, which is honest rather than showing a broken image.
   */
  url?: string;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  /** chat_messages.id is a Postgres bigint -- PostgREST may send number or string. */
  id?: string | number;
  /** Epoch ms. Set on creation; older restored history gets a synthetic one. */
  at?: number;
  /**
   * Who produced a `model` message. `assistant` is the default (no AI reply
   * sets it explicitly), `admin` is a human typing from the inbox, and
   * `system` is a server-authored notice such as a takeover announcement --
   * which must never be rendered as something a person said.
   */
  source?: "assistant" | "admin" | "system";
  attachments?: MessageAttachment[];
}

interface StreamEvent {
  type: "chunk" | "done" | "error";
  text?: string;
  reply?: string;
  error?: string;
  /** Row ids, so the widget can offer reactions on its own messages. */
  visitorMessageId?: string | number | null;
  assistantMessageId?: string | number | null;
}

interface ChatWithIanProps {
  variant?: "floating" | "sidebar";
}

interface ChatSession {
  visitorId: string;
  sessionStartedAt: number;
  accessToken?: string;
  authUserId?: string;
}

/**
 * The conversation opener.
 *
 * Deliberately one question and three affordances rather than a paragraph of
 * self-description: the greeting states the job ("ask me"), and the pills below
 * it remove the blank-input problem that is the main reason a chat panel gets
 * closed without a word being exchanged.
 */
const GREETING: ChatMessage = {
  role: "model",
  text: `What would you like to know? Ask me about what I'm building, what I work with, or how to reach me.`,
};

interface QuickAction {
  /** Rendered verbatim, uppercase, inside the pill. */
  label: string;
  /** The question actually sent. The label is a shortcut, not the message. */
  prompt: string;
}

const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: "my projects", prompt: "Walk me through your projects -- what are you building and why?" },
  { label: "my skills", prompt: "What are your skills, and what are you learning right now?" },
  { label: "contact me", prompt: "How can I get in touch with you?" },
];

/** Same asset the favicon uses (see index.html), so the browser reuses the
 *  cached copy instead of pulling a separate image for a 32px avatar. */
const ASSISTANT_AVATAR = "/images/anime.jpg";
const PRESENCE_COLOR = "#22c55e";

const VISITOR_STORAGE_KEY = "ian-chat-visitor-id";
const SESSION_STARTED_KEY = "ian-chat-session-started-at";
const START_NOTIFIED_KEY = "ian-chat-start-notified";
const HISTORY_PREFIX = "ian-chat-history:";
const CONTACT_NAME_KEY = "ian-chat-visitor-name";
const CONTACT_EMAIL_KEY = "ian-chat-visitor-email";
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;

/**
 * Client-side backstop for a stalled SSE stream, in ms. Deliberately a little
 * above the server's GEMINI_STREAM_IDLE_TIMEOUT_MS (30s) so the server's own
 * error message wins when it does fire, and this only catches the case where
 * the connection dies without the server noticing.
 */
const STREAM_IDLE_TIMEOUT_MS = 40_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * How long the remote side treats a typing signal as live. Longer than the
 * 3s heartbeat in `useTypingSignal` so a single dropped beat does not blank
 * the indicator, and short enough that a visitor who closes the tab mid-sentence
 * does not leave "Ian is typing..." on the admin's screen forever.
 */
const TYPING_IDLE_TIMEOUT_MS = 6000;

const REALTIME_TYPING_EVENT = "typing";
/**
 * Broadcast by the inbox the moment a takeover or release succeeds, so the
 * visitor refetches immediately instead of waiting out the poll interval.
 *
 * The payload carries no message text on purpose. This is a "go look" signal,
 * not a delivery of the announcement: the visitor re-reads the thread through
 * the same endpoint the poll uses, so the system message arrives with its
 * server-assigned id and goes through the one merge path. Injecting the text
 * here instead would create a second, id-less copy of a row that is also being
 * written -- which the id dedupe in mergeAdminMessages cannot recognise, and
 * which would then sit on screen twice.
 */
const REALTIME_THREAD_CHANGED_EVENT = "thread-changed";

interface VisitorContact {
  name: string;
  email: string;
}

function readStored(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string): void {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    return;
  }
}

/**
 * Contact details are kept in sessionStorage rather than localStorage: it is
 * per-tab and clears when the tab closes, so a shared computer does not retain
 * a visitor's name and email indefinitely.
 */
function getStoredContact(): VisitorContact | null {
  const name = readStored(CONTACT_NAME_KEY).trim();
  if (!name) return null;
  return { name, email: readStored(CONTACT_EMAIL_KEY).trim() };
}

function cleanText(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validateContact(name: string, email: string): { contact: VisitorContact } | { error: string } {
  const cleanName = cleanText(name, MAX_NAME_LENGTH);
  if (!cleanName) return { error: "Please add your name so I know who I'm talking to." };

  const cleanEmail = cleanText(email, MAX_EMAIL_LENGTH);
  if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) {
    return { error: "That email doesn't look right -- or leave it blank." };
  }

  return { contact: { name: cleanName, email: cleanEmail } };
}

function createVisitorId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getChatSession(): ChatSession {
  if (typeof window === "undefined") {
    return { visitorId: "server-session", sessionStartedAt: Date.now() };
  }

  try {
    let visitorId = sessionStorage.getItem(VISITOR_STORAGE_KEY);
    if (!visitorId || !/^[a-zA-Z0-9_-]{8,128}$/.test(visitorId)) {
      visitorId = createVisitorId();
      sessionStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
      sessionStorage.removeItem(SESSION_STARTED_KEY);
    }

    const storedStart = Number(sessionStorage.getItem(SESSION_STARTED_KEY));
    const sessionStartedAt = Number.isFinite(storedStart) && storedStart > 0 ? storedStart : Date.now();
    sessionStorage.setItem(SESSION_STARTED_KEY, String(sessionStartedAt));

    return { visitorId, sessionStartedAt };
  } catch {
    return { visitorId: createVisitorId(), sessionStartedAt: Date.now() };
  }
}

function getAuthHeaders(session: ChatSession): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  return headers;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { role?: unknown; text?: unknown };
  return (
    (candidate.role === "user" || candidate.role === "model") &&
    typeof candidate.text === "string" &&
    candidate.text.trim().length > 0
  );
}

/**
 * Reads the stored transcript, normalising timestamps on the way out.
 *
 * `updatedAt` from the envelope is the save time, so it is the anchor for the
 * synthetic clock applied to messages written before timestamps existed. Falls
 * back to "now" when the envelope is missing, which only happens for a bare
 * array written by an older build.
 */
function readHistory(visitorId: string): ChatMessage[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${visitorId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.every(isChatMessage) ? withRestoredTimestamps(parsed, Date.now()) : null;
    }

    if (parsed && typeof parsed === "object" && "messages" in parsed) {
      const list = parsed.messages;
      if (!Array.isArray(list) || !list.every(isChatMessage)) return null;
      const updatedAt = "updatedAt" in parsed && typeof parsed.updatedAt === "string"
        ? Date.parse(parsed.updatedAt)
        : Number.NaN;
      return withRestoredTimestamps(list, Number.isNaN(updatedAt) ? Date.now() : updatedAt);
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Gives a restored transcript a plausible clock.
 *
 * Messages saved before this feature existed carry no timestamp, and rendering
 * them with a bare "9:42 AM" would be a lie. Rather than drop the transcript or
 * print an empty time, the missing values are filled with an even spread
 * leading up to the save time -- visibly a reconstruction, but a useful one,
 * and it means every bubble has a meta line from the first render.
 */
function withRestoredTimestamps(
  messages: ChatMessage[],
  savedAt: number
): ChatMessage[] {
  let cursor = savedAt;
  // 30s apart, walking backwards, so consecutive turns do not all collapse onto
  // the same minute.
  const step = 30_000;
  return messages.map((message) => {
    if (typeof message.at === "number") {
      cursor = message.at;
      return message;
    }
    cursor -= step;
    return { ...message, at: cursor };
  });
}

function saveHistory(visitorId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      `${HISTORY_PREFIX}${visitorId}`,
      JSON.stringify({
        version: 2,
        updatedAt: new Date().toISOString(),
        messages: messages.slice(-50).map((message) =>
          // Blob URLs die with the document that made them, so persisting one
          // would restore a chip pointing at a revoked object URL -- a broken
          // image on every message from a previous session. The name and size
          // survive; the preview does not, and says so by being absent.
          message.attachments
            ? { ...message, attachments: message.attachments.map(({ name, size }) => ({ name, size })) }
            : message
        ),
      })
    );
  } catch {
    return;
  }
}

interface RemoteAdminMessage {
  id: string | number;
  body: string;
  created_at: string;
  /**
   * chat_messages.role for this row. Only 'admin' and 'system' ever reach the
   * visitor (the server filters the rest), but the value is validated rather
   * than assumed so a future role cannot be silently rendered as a human
   * message.
   */
  role: "admin" | "system";
}

interface RemoteThread {
  messages: RemoteAdminMessage[];
  reactions: Reaction[];
}

function isRowId(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function isRemoteAdminMessage(value: unknown): value is RemoteAdminMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.id) &&
    typeof candidate.body === "string" &&
    candidate.body.trim().length > 0 &&
    typeof candidate.created_at === "string" &&
    (candidate.role === "admin" || candidate.role === "system")
  );
}

function mergeAdminMessages(current: ChatMessage[], remote: RemoteAdminMessage[]): ChatMessage[] {
  // Compare ids as strings so "12" and 12 are recognised as the same row
  // regardless of which numeric form the API returned.
  const knownIds = new Set(
    current.map((message) => message.id).filter(isRowId).map((id) => String(id))
  );
  const knownText = new Set(current.filter((message) => message.source === "admin").map((message) => message.text));
  const additions = remote
    .filter((message) => !knownIds.has(String(message.id)) && !knownText.has(message.body))
    // Carries the stored role through as `source`. Hardcoding "admin" here is
    // what previously made a "Ian has joined the chat" notice render as an
    // ordinary reply the admin supposedly typed.
    .map((message) => ({
      role: "model" as const,
      text: message.body,
      id: message.id,
      at: Date.parse(message.created_at) || undefined,
      source: message.role,
    }));

  return additions.length ? [...current, ...additions] : current;
}

async function fetchAdminReplies(
  visitorId: string,
  accessToken?: string
): Promise<RemoteThread> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl(`/api/chat?visitorId=${encodeURIComponent(visitorId)}&role=admin`), {
    cache: "no-store",
    headers,
  });
  if (!response.ok) return { messages: [], reactions: [] };
  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== "object") return { messages: [], reactions: [] };
  return {
    messages: "messages" in data && Array.isArray(data.messages) ? data.messages.filter(isRemoteAdminMessage) : [],
    reactions: "reactions" in data && Array.isArray(data.reactions) ? data.reactions.filter(isReaction) : [],
  };
}

function parseStreamBlock(block: string): StreamEvent | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  if (!data || data === "[DONE]") return null;

  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return null;
    const candidate = parsed as Record<string, unknown>;
    if (candidate.type !== "chunk" && candidate.type !== "done" && candidate.type !== "error") return null;
    return {
      type: candidate.type,
      text: typeof candidate.text === "string" ? candidate.text : undefined,
      reply: typeof candidate.reply === "string" ? candidate.reply : undefined,
      error: typeof candidate.error === "string" ? candidate.error : undefined,
      visitorMessageId: isRowId(candidate.visitorMessageId) ? candidate.visitorMessageId : null,
      assistantMessageId: isRowId(candidate.assistantMessageId) ? candidate.assistantMessageId : null,
    };
  } catch {
    return null;
  }
}

async function responseError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  const fallback = `Chat request failed (${response.status}). Please try again.`;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      if ("error" in parsed && typeof parsed.error === "string") return parsed.error;
      if ("detail" in parsed && typeof parsed.detail === "string") return parsed.detail;
    }
  } catch {
    return fallback;
  }
  return text || fallback;
}

async function notifyChatStarted(session: ChatSession, contact: VisitorContact): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const notificationKey = `${START_NOTIFIED_KEY}:${session.visitorId}`;
    if (sessionStorage.getItem(notificationKey)) return;
    const response = await fetch(apiUrl("/api/chat"), {
      method: "POST",
      headers: getAuthHeaders(session),
      body: JSON.stringify({
        event: "chat_started",
        visitorId: session.visitorId,
        visitorAuthId: session.authUserId,
        sessionStartedAt: session.sessionStartedAt,
        visitorName: contact.name,
        visitorEmail: contact.email,
      }),
    });
    if (response.ok) sessionStorage.setItem(notificationKey, "1");
  } catch {
    return;
  }
}

/** Broadcasts which page the visitor is on. Failures are never surfaced. */
async function reportActivity(
  session: ChatSession,
  contact: VisitorContact,
  page: string,
  activity: "page" | "chat"
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch(apiUrl("/api/chat"), {
      method: "POST",
      headers: getAuthHeaders(session),
      body: JSON.stringify({
        event: "visitor_activity",
        visitorId: session.visitorId,
        visitorAuthId: session.authUserId,
        sessionStartedAt: session.sessionStartedAt,
        visitorName: contact.name,
        visitorEmail: contact.email,
        page,
        activity,
      }),
    });
  } catch {
    return;
  }
}

export default function ChatWithIan({ variant = "floating" }: ChatWithIanProps) {
  const isSidebar = variant === "sidebar";
  const [open, setOpen] = useState(false);
  // `at` is set on the opener too: without it the first paint would render a
  // meta line reading "Ian - " with no time, which looks like a bug.
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ ...GREETING, at: Date.now() }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Available synchronously on the first render, not after the auth round trip.
   *
   * It used to start as null and be filled in by `initialize`, which left a
   * window on every page load where `handleOpen` had to fall back to
   * `getChatSession()` -- a session with no access token. Announcing the visit
   * with that session created the conversation row with a null
   * `visitor_auth_id`, and nothing ever backfills it, so every later
   * `?visitorId=` poll 403'd: the visitor silently never saw admin replies or
   * reactions again. The visitorId itself is cheap and local, so there is no
   * reason to withhold it.
   */
  const [session, setSession] = useState<ChatSession | null>(() =>
    typeof window === "undefined" ? null : getChatSession()
  );
  /**
   * True once the Supabase token has been resolved (or found unobtainable).
   *
   * `chat_started` must not be sent before this: the server derives the
   * conversation's owner from the Authorization header, not the body, so an
   * early announce permanently writes a row nobody can claim.
   */
  const [authSettled, setAuthSettled] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Pre-chat contact capture. `null` contact means the form is still pending.
  const [contact, setContact] = useState<VisitorContact | null>(() => getStoredContact());
  const [nameDraft, setNameDraft] = useState(() => getStoredContact()?.name || "");
  const [emailDraft, setEmailDraft] = useState(() => getStoredContact()?.email || "");
  const [contactError, setContactError] = useState<string | null>(null);
  // Files staged for the next message. Object URLs are revoked on removal and
  // on unmount; a leaked blob URL holds the whole file in memory for the life
  // of the document.
  const [pendingFiles, setPendingFiles] = useState<MessageAttachment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [adminTyping, setAdminTyping] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [sendingReaction, setSendingReaction] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Held in a ref rather than state: the broadcast effect must not re-subscribe
  // every time the composer text changes.
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const fileUrlsRef = useRef<string[]>([]);
  /**
   * Set whenever a reaction write is confirmed, so the next poll replaces the
   * optimistic local set with the server's authoritative one.
   *
   * A ref rather than state: it is read by the poll interval, and state would
   * re-run the poll effect on every toggle. Initialized true so the first poll
   * after opening the panel always loads the server's reactions -- without
   * that, a reload shows no reactions at all until the visitor clicks one.
   */
  const reactionsDirtyRef = useRef(true);
  /**
   * The poll function, published so the realtime effect can force an immediate
   * refetch when the inbox signals a takeover. Assigned and cleared inside the
   * polling effect, so it is never callable once that effect has torn down.
   */
  const pollRef = useRef<() => void>(() => undefined);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      // The identity is already in state from the lazy initializer, so this
      // only ever adds credentials to it. Overwriting it here would reintroduce
      // the null-session window that the synchronous initializer closed.
      const nextSession = getChatSession();

      if (supabase) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          let authSession = sessionData.session;
          if (!authSession) {
            const { data: anonymousData, error } = await supabase.auth.signInAnonymously();
            if (!error) authSession = anonymousData.session;
          }
          if (authSession) {
            nextSession.accessToken = authSession.access_token;
            nextSession.authUserId = authSession.user.id;
          }
        } catch {
          nextSession.accessToken = undefined;
          nextSession.authUserId = undefined;
        }
      }

      if (!active) return;
      const stored = readHistory(nextSession.visitorId);
      setSession((current) => (current ? { ...current, ...nextSession } : nextSession));
      if (stored?.length) setMessages(stored);
      setHistoryLoaded(true);
      // Whether or not a token was obtainable, the wait is over -- the visit can
      // now be announced without stranding the conversation unowned.
      setAuthSettled(true);
    };

    void initialize();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(apiUrl("/api/chat"))
      .then((response) => response.json())
      .then((data: unknown) => {
        if (!active || !data || typeof data !== "object" || !("configured" in data)) return;
        if (import.meta.env.DEV) console.log("API Key loaded:", Boolean(data.configured));
      })
      .catch(() => {
        if (active && import.meta.env.DEV) console.log("API Key loaded:", false);
      });

    return () => {
      active = false;
    };
  }, []);

  /**
   * Polls for admin replies and reactions.
   *
   * Two different clocks: admin messages are rare and worth an immediate fetch
   * so a human reply does not sit unseen for seconds, but reactions are
   * low-churn and would double the request count for no visible benefit, so
   * they are folded into the same response and only refetched on the slow tick.
   *
   * `pollRef` exposes this same function to the realtime effect below, which
   * calls it when the inbox broadcasts a takeover. A ref rather than shared
   * state so the nudge cannot re-render anything or re-subscribe the channel.
   */
  useEffect(() => {
    const visitorId = session?.visitorId;
    if (!open || !visitorId) return;
    let active = true;

    const poll = async () => {
      try {
        const remote = await fetchAdminReplies(visitorId, session?.accessToken);
        if (!active) return;
        if (remote.messages.length) {
          setMessages((current) => mergeAdminMessages(current, remote.messages));
        }
        if (reactionsDirtyRef.current) {
          reactionsDirtyRef.current = false;
          // Wholesale replacement, not a merge: the server owns the reaction
          // set, and ReactionBar already ignores rows whose message is not in
          // the transcript, so nothing needs filtering here.
          setReactions(remote.reactions);
        }
      } catch {
        return;
      }
    };

    pollRef.current = () => void poll();
    void poll();
    const interval = window.setInterval(() => void poll(), 2500);
    return () => {
      active = false;
      window.clearInterval(interval);
      pollRef.current = () => undefined;
    };
  }, [open, session?.accessToken, session?.visitorId]);

  /**
   * Realtime: incoming admin/system messages, incoming reactions, and the
   * typing indicator in both directions.
   *
   * Typing rides on a Supabase broadcast rather than being stored, because
   * "someone is typing" is worth nothing a second later and writing it to the
   * database would add a row per few seconds of somebody's typing. Broadcast is
   * also the only transport that works in both directions here: the inbox
   * subscribes to this same channel name for the thread it has open.
   *
   * `channelRef` is published so the composer can broadcast without this
   * effect re-running on every keystroke.
   */
  useEffect(() => {
    const visitorId = session?.visitorId;
    const realtimeClient = supabase;
    if (!open || !realtimeClient || !session?.accessToken || !visitorId) return;

    const channel = realtimeClient.channel(`visitor-chat-${visitorId}`);
    channelRef.current = channel;

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      (payload) => {
        const record = payload.new as Record<string, unknown>;
        const id = record.id;
        const body = record.body;
        const role = record.role;
        // Both 'admin' and 'system' must pass. Filtering on 'admin' alone
        // dropped the takeover announcement on the floor, so the visitor only
        // learned a human had joined on the next poll -- or never, if they
        // closed the tab first.
        if ((role !== "admin" && role !== "system") || !isRowId(id) || typeof body !== "string") {
          return;
        }
        const createdAt = typeof record.created_at === "string" ? record.created_at : new Date().toISOString();
        setMessages((current) => mergeAdminMessages(current, [{ id, body, role, created_at: createdAt }]));
      }
    );

    channel.on(
      "broadcast",
      { event: REALTIME_TYPING_EVENT },
      (payload) => {
        const data = payload.payload as { typing?: unknown } | undefined;
        if (!data || data.typing !== true) return;
        setAdminTyping(true);
      }
    );

    /**
     * A takeover or release just happened. Refetch now rather than waiting out
     * the poll interval, so "Ian has joined the chat" lands while the visitor
     * is still looking at the window.
     *
     * Broadcast is the only transport that works here in both directions: the
     * inbox authenticates with a password and never holds a Supabase session,
     * so it cannot rely on `postgres_changes` reaching it, whereas Supabase
     * broadcast is not subject to the RLS policies. That makes this the
     * dependable path and `postgres_changes` the belt-and-braces one -- which
     * is also why the refetch goes through `pollRef` rather than rendering the
     * announcement from the payload: one insert path, real row ids, no chance
     * of the same message appearing twice.
     */
    channel.on("broadcast", { event: REALTIME_THREAD_CHANGED_EVENT }, () => {
      pollRef.current();
    });

    void channel.subscribe();

    return () => {
      channelRef.current = null;
      void realtimeClient.removeChannel(channel);
    };
  }, [open, session?.accessToken, session?.visitorId]);

  /**
   * Clears the indicator when the admin stops. Without this a dropped
   * connection, a closed tab, or a browser that was backgrounded mid-reply
   * would leave "Ian is typing..." on screen forever.
   */
  useEffect(() => {
    if (!adminTyping) return;
    const timer = window.setTimeout(() => setAdminTyping(false), TYPING_IDLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [adminTyping, messages]);

  useEffect(() => {
    if (historyLoaded && session) saveHistory(session.visitorId, messages);
  }, [historyLoaded, messages, session]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [messages, loading, adminTyping]);

  /**
   * Reports the current route to the admin's visitor panel.
   *
   * Only while the chat is open: a closed panel has no session to attribute the
   * page view to, and reporting every navigation of a site the visitor may only
   * ever see once would be tracking rather than context.
   */
  useEffect(() => {
    if (!open || !session || !contact) return;
    void reportActivity(session, contact, location.pathname, "page");
  }, [contact, location.pathname, open, session]);

  useEffect(() => {
    return () => {
      for (const url of fileUrlsRef.current) URL.revokeObjectURL(url);
    };
  }, []);

  /**
   * Starts a brand-new visitor thread.
   *
   * `chat_conversations.visitor_id` is UNIQUE and the server does
   * find-or-create on it, so a fresh thread is only possible with a fresh id.
   * Everything keyed by the old id is cleared so the new thread starts empty
   * rather than inheriting the previous transcript.
   */
  const startFreshThread = () => {
    // Abort first. Without this an in-flight SSE reply keeps streaming after
    // the id has changed: the server finishes persisting it against the OLD
    // visitorId while the client writes those chunks into the NEW thread's
    // message list -- so the reply vanishes from the visitor's view and the
    // inbox shows a thread that appears to have gone silent.
    abortRef.current?.abort();
    abortRef.current = null;

    const previousId = session?.visitorId;
    try {
      if (previousId) {
        localStorage.removeItem(`${HISTORY_PREFIX}${previousId}`);
        sessionStorage.removeItem(`${START_NOTIFIED_KEY}:${previousId}`);
      }
      sessionStorage.removeItem(VISITOR_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STARTED_KEY);
      // Re-prompt for the pre-chat form, since the new thread is a new visitor.
      writeStored(CONTACT_NAME_KEY, "");
      writeStored(CONTACT_EMAIL_KEY, "");
    } catch {
      // Storage unavailable; the in-memory reset below still applies.
    }

    // getChatSession mints a new id now that the stored one is gone. The
    // credentials have to be carried across explicitly: getChatSession only
    // knows about storage, so a bare `setSession(next)` handed the new thread
    // a session with no access token. The server then created its conversation
    // row with a null visitor_auth_id, which nothing ever backfills, so that
    // thread could never receive admin replies or reactions.
    const next = getChatSession();
    next.accessToken = session?.accessToken;
    next.authUserId = session?.authUserId;
    setSession(next);
    setContact(null);
    setNameDraft("");
    setEmailDraft("");
    setContactError(null);
    // historyLoaded deliberately stays true. Setting it false here (as this
    // used to) was the last write to it, so the save effect's guard never
    // reopened and every message in the new thread was discarded on reload --
    // one click of "new chat" permanently disabled the widget's only
    // persistence. The gate exists solely to stop the greeting overwriting
    // stored history before the restore lands, and by this point the restore
    // happened long ago; the new thread legitimately starts as a bare greeting.
    setMessages([{ ...GREETING, at: Date.now() }]);
    setInput("");
    setError(null);
    setLoading(false);
    setAdminTyping(false);
    setReactions([]);
    clearPendingFiles();
  };

  /**
   * Announces the visit, then records where they are.
   *
   * Sequenced, not parallel: `visitor_activity` attaches to an existing
   * conversation and is a no-op when there is none, so firing it alongside
   * `chat_started` races the row's creation and the entry is silently dropped.
   * The very first "Opened Chat" line is the one worth having, so it waits.
   */
  const announceVisit = useCallback(
    async (activeSession: ChatSession, activeContact: VisitorContact, page: string) => {
      await notifyChatStarted(activeSession, activeContact);
      await reportActivity(activeSession, activeContact, page, "chat");
    },
    []
  );

  const handleOpen = () => {
    setOpen(true);
    // Announcing is gated on authSettled, not merely on having a session: a
    // session that exists but carries no token creates the conversation row
    // with a null visitor_auth_id, and that column is never backfilled, so the
    // visitor would be locked out of admin replies for the rest of the thread.
    if (contact && authSettled && session) void announceVisit(session, contact, location.pathname);
  };

  const submitContact = () => {
    const result = validateContact(nameDraft, emailDraft);
    if ("error" in result) {
      setContactError(result.error);
      return;
    }
    setContactError(null);
    writeStored(CONTACT_NAME_KEY, result.contact.name);
    writeStored(CONTACT_EMAIL_KEY, result.contact.email);
    setContact(result.contact);
    setMessages([{ ...GREETING, at: Date.now() }]);
    if (session && authSettled) void announceVisit(session, result.contact, location.pathname);
  };

  /**
   * Catches the case the two handlers above deliberately skip: the visitor
   * opened the panel and gave their details before the token resolved. Without
   * this the conversation would be announced by whoever opened it next, which
   * may be never.
   *
   * `announceVisit` is itself idempotent per visitor id (it no-ops once
   * sessionStorage records the start), so firing it once auth lands is safe
   * even if a handler already got there first.
   */
  useEffect(() => {
    if (!authSettled || !open || !contact || !session) return;
    void announceVisit(session, contact, location.pathname);
  }, [announceVisit, authSettled, contact, location.pathname, open, session]);

  /** Revokes every object URL this component has created. */
  const releaseFileUrls = useCallback(() => {
    for (const url of fileUrlsRef.current) URL.revokeObjectURL(url);
    fileUrlsRef.current = [];
  }, []);

  const clearPendingFiles = useCallback(() => {
    releaseFileUrls();
    setPendingFiles([]);
    setAttachmentError(null);
  }, [releaseFileUrls]);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);

    const room = MAX_ATTACHMENTS - pendingFiles.length;
    if (room <= 0) {
      setAttachmentError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      return;
    }

    const accepted: MessageAttachment[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachmentError(`${file.name} is ${formatBytes(file.size)} -- the limit is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`);
        continue;
      }
      // Only images get a preview URL. A blob URL for a PDF is pure overhead:
      // nothing renders it, and it still pins the file in memory.
      const url = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      if (url) fileUrlsRef.current.push(url);
      accepted.push({ name: file.name, size: file.size, url });
    }

    if (files.length > room) {
      setAttachmentError(`Only the first ${room} file${room === 1 ? "" : "s"} were attached.`);
    }
    if (accepted.length) setPendingFiles((current) => [...current, ...accepted]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    // Reset so re-picking the same file fires `change` again.
    event.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((current) => {
      const target = current[index];
      if (target?.url) {
        URL.revokeObjectURL(target.url);
        fileUrlsRef.current = fileUrlsRef.current.filter((url) => url !== target.url);
      }
      return current.filter((_, position) => position !== index);
    });
  };

  /**
   * Signals to the admin that the visitor is typing.
   *
   * The channel is read through a ref-backed callback so this identity is
   * stable: if it changed whenever the channel was re-created, the heartbeat
   * effect would restart and a typing visitor would never get a second beat.
   */
  const sendTypingSignal = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || channel.state !== "joined") return;
    void channel.send({
      type: "broadcast",
      event: REALTIME_TYPING_EVENT,
      payload: { typing: true },
    });
  }, []);

  useTypingSignal({ broadcast: sendTypingSignal, active: Boolean(input.trim()) });

  const toggleReaction = async (messageId: string | number, kind: ReactionKind, active: boolean) => {
    if (!session || sendingReaction) return;
    setSendingReaction(true);

    const optimistic: Reaction = { message_id: messageId, kind, actor: session.visitorId };
    setReactions((current) => {
      const without = current.filter(
        (reaction) => reactionKey(reaction.message_id, reaction.kind, reaction.actor) !== reactionKey(messageId, kind, session.visitorId)
      );
      return active ? [...without, optimistic] : without;
    });

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: getAuthHeaders(session),
        body: JSON.stringify({
          event: "reaction",
          visitorId: session.visitorId,
          conversationId: undefined,
          messageId,
          kind,
          active,
        }),
      });
      if (!response.ok) {
        // Roll the optimistic change back: leaving a reaction on screen that
        // was never stored is the one failure mode the user could not detect.
        setReactions((current) => {
          const without = current.filter(
            (reaction) => reactionKey(reaction.message_id, reaction.kind, reaction.actor) !== reactionKey(messageId, kind, session.visitorId)
          );
          return active ? without : [...without, optimistic];
        });
      }
      // Confirmed either way, so let the next poll reconcile against the
      // server: it is the only thing that can pick up a reaction the admin
      // added in the inbox, or one removed in another tab.
      reactionsDirtyRef.current = true;
    } catch {
      setReactions((current) =>
        current.filter(
          (reaction) => reactionKey(reaction.message_id, reaction.kind, reaction.actor) !== reactionKey(messageId, kind, session.visitorId)
        )
      );
    } finally {
      setSendingReaction(false);
    }
  };

  const send = async (override?: string) => {
    const typedText = input.trim();
    const text = (override ?? typedText).trim();
    const attachments = pendingFiles;
    // Contact must be captured before the first message so the transcript is
    // attributed to a person rather than an anonymous visitor id.
    if ((!text && attachments.length === 0) || loading || !session || !contact) return;

    // The model reads text, so an attachment travels as its filename. That line
    // goes into the persisted body, which means the admin sees the reference
    // too -- the honest version of "I sent you a screenshot".
    const attachmentLines = attachments.map((file) => attachmentTranscriptLine(file.name, file.size));
    const body = [text, ...attachmentLines].filter(Boolean).join("\n\n");

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", text: text || attachmentLines.join("\n"), at: Date.now(), attachments: attachments.length ? attachments : undefined },
    ];
    const assistantIndex = nextMessages.length;
    setMessages([...nextMessages, { role: "model", text: "", at: Date.now() }]);
    setInput("");
    setError(null);
    setAttachmentError(null);
    setLoading(true);
    // Ownership of the preview URLs moves to the rendered message, so the
    // clear below must not revoke them.
    fileUrlsRef.current = fileUrlsRef.current.filter(
      (url) => !attachments.some((file) => file.url === url)
    );
    setPendingFiles([]);

    const controller = new AbortController();
    abortRef.current = controller;
    // Distinguishes a deliberate abort (new thread / unmount, where the reply
    // is abandoned on purpose) from the idle watchdog firing, which is a real
    // failure the visitor should be told about.
    let timedOut = false;

    const updateAssistant = (textValue: string) => {
      setMessages((current) => {
        const next = [...current];
        if (next[assistantIndex]?.role !== "model") return current;
        next[assistantIndex] = { ...next[assistantIndex], text: textValue };
        return next;
      });
    };

    /** Attaches a stored row id to a message so it can be reacted to. */
    const assignId = (index: number, id: string | number | null | undefined) => {
      if (id === null || id === undefined) return;
      setMessages((current) => {
        const next = [...current];
        const target = next[index];
        if (!target || target.id !== undefined) return current;
        next[index] = { ...target, id };
        return next;
      });
    };

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { ...getAuthHeaders(session), Accept: "text/event-stream" },
        signal: controller.signal,
        body: JSON.stringify({
          event: "message",
          visitorId: session.visitorId,
          visitorAuthId: session.authUserId,
          sessionStartedAt: session.sessionStartedAt,
          visitorName: contact.name,
          visitorEmail: contact.email,
          messages: [...nextMessages, { role: "user", text: body }],
        }),
      });

      if (!response.ok) throw new Error(await responseError(response));

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedText = "";

        // Idle watchdog. The server has its own 30s stream guard, but that only
        // helps while the server is alive and the socket is healthy. Without a
        // client-side backstop, a stalled or half-open connection leaves
        // `reader.read()` pending forever and the composer's spinner stuck on.
        // Set slightly above the server's GEMINI_STREAM_IDLE_TIMEOUT_MS so the
        // server's own message wins the race when it does fire.
        let idleTimer: number | undefined;
        const armIdleTimer = () => {
          if (idleTimer !== undefined) window.clearTimeout(idleTimer);
          idleTimer = window.setTimeout(() => {
            timedOut = true;
            void reader.cancel().catch(() => undefined);
            controller.abort();
          }, STREAM_IDLE_TIMEOUT_MS);
        };
        armIdleTimer();

        const processBlock = (block: string): StreamEvent | null => parseStreamBlock(block);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            armIdleTimer();
            buffer += decoder.decode(value || new Uint8Array(), { stream: true });
            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() || "";

            for (const block of blocks) {
              const event = processBlock(block);
              if (!event) continue;
              if (event.type === "error") throw new Error(event.error || "Chat stream failed");
              if (event.type === "chunk" && event.text) {
                streamedText += event.text;
                updateAssistant(streamedText);
              }
              if (event.type === "done") {
                if (event.reply) {
                  streamedText = event.reply;
                  updateAssistant(streamedText);
                }
                // The ids for the pair of rows this exchange just created.
                assignId(assistantIndex - 1, event.visitorMessageId);
                assignId(assistantIndex, event.assistantMessageId);
              }
            }
          }
        } finally {
          if (idleTimer !== undefined) window.clearTimeout(idleTimer);
          buffer += decoder.decode();
          if (buffer.trim()) {
            const event = processBlock(buffer);
            if (event?.type === "done") {
              if (event.reply) {
                streamedText = event.reply;
                updateAssistant(streamedText);
              }
              assignId(assistantIndex - 1, event.visitorMessageId);
              assignId(assistantIndex, event.assistantMessageId);
            }
          }
        }

        if (!streamedText.trim()) throw new Error("The assistant returned an empty response");
      } else {
        // JSON fallback: a takeover or a non-SSE error path.
        const data: unknown = await response.json();
        if (!data || typeof data !== "object") {
          throw new Error("The assistant returned an invalid response");
        }
        if ("visitorMessageId" in data) {
          assignId(assistantIndex - 1, isRowId(data.visitorMessageId) ? data.visitorMessageId : null);
        }
        if (!("takeover" in data)) {
          if (!("reply" in data) || typeof data.reply !== "string") {
            throw new Error("The assistant returned an invalid response");
          }
          updateAssistant(data.reply);
        }
      }
    } catch (caughtError) {
      // A deliberate abort (new thread, unmount) abandons the reply on purpose,
      // so it stays silent. A watchdog abort is a genuine failure.
      if (controller.signal.aborted && !timedOut) return;
      setMessages((current) => {
        const next = [...current];
        if (next[assistantIndex]?.role === "model" && !next[assistantIndex].text) next.splice(assistantIndex, 1);
        return next;
      });
      setError(
        timedOut
          ? "The assistant stopped responding. Please try again."
          : caughtError instanceof Error
            ? caughtError.message
            : "Something went wrong -- try again."
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  /**
   * Pills are hidden as soon as the visitor has asked anything, because by then
   * they are a distraction from the answer they are waiting for.
   */
  const showQuickActions = useMemo(
    () => !messages.some((message) => message.role === "user"),
    [messages]
  );

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Chat with Ian"
          className={
            isSidebar
              ? "flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--gray-300)] px-3 py-2.5 text-xs leading-none transition-colors hover:border-[var(--ink)]"
              : "fixed bottom-[25px] left-[25px] z-40 flex h-11 items-center gap-2 rounded-full px-4 text-sm shadow-lg transition-opacity hover:opacity-85"
          }
          style={{
            backgroundColor: isSidebar ? "var(--gray-50)" : "var(--ink)",
            color: isSidebar ? "var(--ink)" : "var(--bg)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <MessageCircle size={isSidebar ? 14 : 16} strokeWidth={1.8} />
          chat with {PROFILE.goesBy.toLowerCase()}
        </button>
      )}

{open && (
        <div
          className={
            isSidebar
              ? "card sidebar-chat-panel chat-panel fixed bottom-4 left-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden"
              : "card chat-panel-floating fixed bottom-[25px] left-[25px] z-40 flex w-[min(360px,calc(100vw-50px))] flex-col overflow-hidden"
          }
          role="dialog"
          aria-label={`Chat with ${PROFILE.goesBy}`}
          aria-busy={loading}
        >
          <div
            className="flex items-center justify-between gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--gray-200)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
                style={{ border: "1px solid var(--gray-200)", backgroundColor: "var(--gray-100)" }}
              >
                <img
                  src={ASSISTANT_AVATAR}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              </span>
              <div>
                <p className="micro-label truncate" style={{ color: "var(--ink)" }}>
                  CHAT WITH IAN
                </p>
                <p
                  className="flex items-center gap-1 text-[11px] uppercase leading-tight tracking-[0.12em]"
                  style={{ color: "var(--gray-400)" }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: PRESENCE_COLOR }}
                  />
                  ONLINE · AI ASSISTANT
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startFreshThread}
                aria-label="Start a new chat"
                title="Start a new chat"
                className="flex h-6 w-6 items-center justify-center"
                style={{ color: "var(--gray-400)" }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                title="Close chat"
                className="flex h-6 w-6 items-center justify-center"
                style={{ color: "var(--gray-400)" }}
              >
                <X size={14} />
              </button>
</div>
          </div>

          {contact ? (
            <>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4"
                aria-live="polite"
                aria-label="Chat messages"
              >
                {messages.map((message, index) => {
                  const isStreaming =
                    loading && index === messages.length - 1 && message.role === "model" && message.source !== "system";

                  // A server-authored notice, not a chat bubble: centred,
                  // unaligned and without an avatar, so it cannot be mistaken
                  // for something either party typed.
                  //
                  // Given real weight because this one notice changes who the
                  // visitor is talking to. At 11px in --gray-500 -- what it was
                  // -- it was the faintest text in the panel, so the moment a
                  // human took over was the least noticeable moment in the
                  // whole conversation.
                  //
                  // Emphasis is inversion (an ink-filled chip) plus size, never
                  // colour: the palette is monochrome, and an accent here would
                  // fight the AI-vs-human distinction the notice exists to
                  // make. Inverting against --ink also survives a greyscale
                  // screenshot, which a colour cue would not. `role="status"`
                  // is kept so it is announced to a screen reader as a polite
                  // live update rather than being read as a stray bubble.
                  if (message.source === "system") {
                    return (
                      <div key={`system-${message.id ?? index}`} className="flex justify-center py-2">
                        <p
                          role="status"
                          className="max-w-[92%] break-words rounded-full bg-[var(--ink)] px-4 py-2.5 text-center text-[12px] font-medium leading-relaxed text-[var(--bg)]"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {message.text}
                        </p>
                      </div>
                    );
                  }

                  const isVisitor = message.role === "user";
                  // "Ian" for the assistant and for a human admin reply -- from
                  // the visitor's side they are the same person, and the
                  // avatar only appears on the AI's own turns.
                  const sender = isVisitor ? "you" : PROFILE.goesBy;
                  const grouped = shouldGroupMessage(
                    previousSender(messages, index),
                    { sender, at: message.at ?? 0 }
                  );
                  const canReact = message.id !== undefined;

                  return (
                    <div
                      key={`${message.role}-${message.id ?? index}-${index}`}
                      className={`chat-reaction-row flex flex-col ${isVisitor ? "items-end" : "items-start"}`}
                    >
                      {!grouped && (
                        <div className="chat-meta" style={{ justifyContent: isVisitor ? "flex-end" : "flex-start" }}>
                          <span style={{ color: "var(--ink)" }}>{sender}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={message.at ? new Date(message.at).toISOString() : undefined}>
                            {formatClock(message.at)}
                          </time>
                        </div>
                      )}
                      <div className={`flex w-full items-end gap-2 ${isVisitor ? "justify-end" : "justify-start"}`}>
                        {/* The anime avatar belongs to the AI persona. Showing it
                            next to a human reply would misattribute the message,
                            so human turns are labelled with a name instead. */}
                        {!isVisitor && message.source !== "admin" && (
                          <img
                            src={ASSISTANT_AVATAR}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            decoding="async"
                            className="mb-0.5 h-6 w-6 flex-shrink-0 rounded-full object-cover"
                            style={{ border: "1px solid var(--gray-200)" }}
                          />
                        )}
                        <div className="min-w-0 max-w-[80%]">
                          <p
                            className="whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm leading-relaxed"
                            style={{
                              backgroundColor: isVisitor ? "var(--ink)" : "var(--gray-100)",
                              color: isVisitor ? "var(--bg)" : "var(--ink)",
                            }}
                          >
                            {message.text || (isStreaming ? "thinking…" : "")}
                            {isStreaming && message.text && <span className="ml-0.5 animate-pulse">▍</span>}
                          </p>
                          {message.attachments && message.attachments.length > 0 && (
                            <ul className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                              {message.attachments.map((file) => (
                                <li key={file.name}>
                                  <span
                                    className="flex items-center gap-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] px-2 py-1"
                                    style={{ color: "var(--gray-500)" }}
                                  >
                                    {file.url ? (
                                      <img
                                        src={file.url}
                                        alt={file.name}
                                        className="h-8 w-8 rounded object-cover"
                                        style={{ border: "1px solid var(--gray-200)" }}
                                      />
                                    ) : (
                                      <Paperclip size={12} strokeWidth={1.8} aria-hidden="true" />
                                    )}
                                    <span className="text-[10px] leading-tight" style={{ fontFamily: "var(--font-mono)" }}>
                                      {file.name}
                                      <span className="opacity-60"> · {formatBytes(file.size)}</span>
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {/* Below the bubble, not under it: on a 360px panel a
                              row underneath would sit closer to the *next*
                              message and read as belonging to it. */}
                          <div className={isVisitor ? "flex justify-end" : "flex justify-start"}>
                            {canReact && (
                              <ReactionBar
                                messageId={message.id as string | number}
                                reactions={reactions}
                                actor={session?.visitorId ?? ""}
                                onToggle={(kind, active) => {
                                  if (message.id !== undefined) void toggleReaction(message.id, kind, active);
                                }}
                                busy={sendingReaction}
                                align={isVisitor ? "end" : "start"}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Quick actions sit under the opener, and only while the
                    conversation is still empty -- see showQuickActions. */}
                {showQuickActions && !loading && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => void send(action.prompt)}
                        disabled={!session}
                        className="pill disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {adminTyping && !loading && (
                  <div className="flex items-end gap-2">
                    <img
                      src={ASSISTANT_AVATAR}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className="mb-0.5 h-6 w-6 flex-shrink-0 rounded-full object-cover"
                      style={{ border: "1px solid var(--gray-200)" }}
                    />
                    <TypingIndicator name={PROFILE.goesBy} announce />
                  </div>
                )}

                {error && (
                  <p className="text-xs" role="alert" style={{ color: "var(--gray-500)" }}>
                    {error}
                  </p>
                )}
              </div>

              {/* shrink-0 keeps the composer from being squeezed when the
                  thread is long. h-9 on the input matches the send button
                  exactly -- its intrinsic height was 37px (14px text + py-2),
                  so the two never lined up. */}
              <div
                className="flex shrink-0 items-center gap-2 p-3"
                style={{ borderTop: "1px solid var(--gray-200)" }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,.pdf,.txt,.md,.csv,.json"
                  className="visually-hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || !session || pendingFiles.length >= MAX_ATTACHMENTS}
                  aria-label="Attach a file"
                  title="Attach a file"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--gray-300)] transition-colors hover:border-[var(--ink)] disabled:opacity-40"
                  style={{ color: "var(--gray-500)" }}
                >
                  <Paperclip size={15} strokeWidth={1.8} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about my projects, stack..."
                  aria-label="Message"
                  maxLength={600}
                  disabled={loading || !session}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--gray-300)] px-3 text-sm outline-none transition-colors chat-input focus:border-[var(--ink)] disabled:opacity-50"
                  style={{ backgroundColor: "var(--gray-100)", color: "var(--ink)" }}
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={loading || (!input.trim() && pendingFiles.length === 0) || !session}
                  aria-label="Send message"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
                  style={{ backgroundColor: "var(--ink)", color: "var(--bg)" }}
                >
                  <Send size={14} strokeWidth={1.8} />
                </button>
              </div>

              {/* Staged files, plus the honesty note. The assistant is
                  text-only, so the composer says so at the moment the visitor
                  picks a file rather than letting them assume the model can see
                  it. */}
              {(pendingFiles.length > 0 || attachmentError) && (
                <div className="shrink-0 px-3 pb-2">
                  {attachmentError && (
                    <p className="mb-1.5 text-[11px] leading-relaxed" role="alert" style={{ color: "var(--gray-500)" }}>
                      {attachmentError}
                    </p>
                  )}
                  {pendingFiles.length > 0 && (
                    <>
                      <ul className="flex flex-wrap gap-1.5">
                        {pendingFiles.map((file, index) => (
                          <li
                            key={file.name}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] py-1 pl-1.5 pr-1"
                          >
                            {file.url ? (
                              <img
                                src={file.url}
                                alt=""
                                aria-hidden="true"
                                className="h-6 w-6 rounded object-cover"
                                style={{ border: "1px solid var(--gray-200)" }}
                              />
                            ) : (
                              <Paperclip size={12} strokeWidth={1.8} aria-hidden="true" className="text-[var(--gray-500)]" />
                            )}
                            <span
                              className="max-w-[9rem] truncate text-[10px] leading-tight"
                              style={{ fontFamily: "var(--font-mono)", color: "var(--gray-500)" }}
                            >
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePendingFile(index)}
                              aria-label={`Remove ${file.name}`}
                              className="flex h-4 w-4 items-center justify-center"
                              style={{ color: "var(--gray-400)" }}
                            >
                              <X size={11} />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-[10px] leading-relaxed" style={{ color: "var(--gray-400)" }}>
                        I read text only, so {PROFILE.goesBy} will see the file name but not the file itself.
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Pre-chat step: name is required, email is optional. */
            <form
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitContact();
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {GREETING.text}
              </p>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ian-chat-name" className="micro-label" style={{ color: "var(--gray-500)" }}>
                  name
                </label>
                <input
                  id="ian-chat-name"
                  type="text"
                  value={nameDraft}
                  onChange={(event) => {
                    setNameDraft(event.target.value);
                    if (contactError) setContactError(null);
                  }}
                  maxLength={MAX_NAME_LENGTH}
                  required
                  autoFocus
                  autoComplete="given-name"
                  placeholder="Ada Lovelace"
                  // The input sets an inline `color`, which ::placeholder
                  // inherits -- so the sample name rendered as dark as real
                  // typed text and read like a filled-in value. Dimming the
                  // placeholder marks it as a hint.
                  className="chat-input w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
                  style={{ backgroundColor: "var(--gray-100)", color: "var(--ink)" }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ian-chat-email" className="micro-label" style={{ color: "var(--gray-500)" }}>
                  email <span style={{ opacity: 0.6 }}>· optional</span>
                </label>
                <input
                  id="ian-chat-email"
                  type="email"
                  value={emailDraft}
                  onChange={(event) => {
                    setEmailDraft(event.target.value);
                    if (contactError) setContactError(null);
                  }}
                  maxLength={MAX_EMAIL_LENGTH}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="chat-input w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
                  style={{ backgroundColor: "var(--gray-100)", color: "var(--ink)" }}
                />
              </div>

              {contactError && (
                <p className="text-xs" role="alert" style={{ color: "#dc2626" }}>
                  {contactError}
                </p>
              )}

              <button
                type="submit"
                disabled={!nameDraft.trim()}
                // Full width so it spans the panel instead of floating as a
                // small pill in a 360px column.
                className="mt-1 w-full rounded-lg px-4 py-2.5 text-sm transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ backgroundColor: "var(--ink)", color: "var(--bg)" }}
              >
                start chatting
              </button>

              {/* mt-auto pushes this to the bottom of the panel. The form is a
                  flex column in a fixed-height card, so without it the lower
                  third was dead space and the block looked unfinished. */}
              <p
                className="mt-auto pt-4 text-[11px] leading-relaxed"
                style={{ color: "var(--gray-400)" }}
              >
                Your email is only stored so {PROFILE.goesBy} can reply to you. Leave it blank if you'd
                rather not.
              </p>
            </form>
          )}
        </div>
      )}
    </>
  );
}

/**
 * The speaker and time of the previous bubble in the transcript, skipping
 * system notices -- a takeover announcement between two of Ian's messages
 * should not break the group, and a notice has no meta line to compare with.
 */
function previousSender(
  messages: ChatMessage[],
  index: number
): { sender: string; at: number } | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = messages[cursor];
    if (!candidate || candidate.source === "system") continue;
    return {
      sender: candidate.role === "user" ? "you" : PROFILE.goesBy,
      at: candidate.at ?? 0,
    };
  }
  return null;
}
