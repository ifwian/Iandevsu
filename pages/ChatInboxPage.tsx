import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
/* `Check` and `Copy` were used by the copy-email button in the thread header,
   which no longer exists -- the address moved to the context drawer, where
   `VisitorPanel` renders its own copy affordance. `copyEmail` and `copied`
   stay: the panel still calls them. */
import {
  ArrowLeft,
  Info,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/api";
import { useTypingSignal } from "@/lib/useTypingSignal";
import {
  CONVERSATION_STATUSES,
  formatClock,
  formatRelative,
  isReaction,
  isVisitorActivity,
  reactionKey,
  type ConversationStatus,
  type Reaction,
  type ReactionKind,
  type VisitorActivity,
} from "@/lib/chatFormat";
import StatusPill from "@/components/chat/StatusPill";
import ReactionBar from "@/components/chat/ReactionBar";
import TypingIndicator from "@/components/chat/TypingIndicator";
import VisitorPanel from "@/components/chat/inbox/VisitorPanel";
import InternalNotes from "@/components/chat/inbox/InternalNotes";
import ActivityTimeline from "@/components/chat/inbox/ActivityTimeline";
import {
  isConversation,
  isInboxMessage,
  isNote,
  isVisitorInfo,
  normalizeContact,
  roleLabel,
  visitorLabel,
  type Conversation,
  type InboxMessage,
  type Note,
  type VisitorInfo,
} from "@/components/chat/inbox/types";

const SESSION_STORAGE_KEY = "ian-chat-admin-session";

/**
 * The "you are answering" banner, and the live dot beside the header status.
 *
 * This was a literal `#22c55e`, which is the same value `--status-active` holds
 * in dark mode -- so it happened to look right there and was wrong everywhere
 * else: a fixed hex is a fixed hex whether the background is white or near-black,
 * so in light mode it sat as a mid green on near-white instead of lifting the
 * way the token does. `--status-active` is the same green the sidebar's live dot
 * and the hero's "building" stat already use, and it retints with the theme.
 */
const PRESENCE_COLOR = "var(--status-active)";


const REALTIME_TYPING_EVENT = "typing";
/**
 * Broadcast to the visitor's open window when a takeover or release succeeds,
 * so it refetches instead of waiting out its poll. Must match the constant of
 * the same name in components/chat/ChatWithIan.tsx.
 */
const REALTIME_THREAD_CHANGED_EVENT = "thread-changed";
/** Matches the visitor widget's timeout: a beat every 3s, expire after 6s. */
const TYPING_IDLE_TIMEOUT_MS = 6000;

/** Actor key for reactions made from this dashboard. */
const ADMIN_ACTOR = "admin";

function getStoredSession(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeSession(value: string): void {
  try {
    if (value) sessionStorage.setItem(SESSION_STORAGE_KEY, value);
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    return;
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return fallback;
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && (error as Error & { status?: number }).status === 401;
}

function formatFull(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

/** Triage filter for the visitor list. Mirrors the server's status vocabulary. */
type StatusFilter = "all" | ConversationStatus;

const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: "all", label: "all" },
  { value: "active", label: "active" },
  { value: "waiting", label: "waiting" },
  { value: "assigned", label: "assigned" },
  { value: "resolved", label: "resolved" },
];

const SEARCH_DEBOUNCE_MS = 250;

/** Case-insensitive match on name, then email, then the id shown in the thread header. */
function matchesQuery(conversation: Conversation, term: string): boolean {
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

/** Unread count, tolerating the column not existing. */
function unreadOf(conversation: Conversation): number {
  return typeof conversation.unread_count === "number" && conversation.unread_count > 0
    ? conversation.unread_count
    : 0;
}

/** The right-hand column's two scroll regions, as a tab. */
type PanelTab = "visitor" | "activity";

/**
 * Which pane is on screen below `lg`.
 *
 * The two panes cannot coexist on a phone. They used to be three stacked boxes
 * inside a `100dvh` page at `0.9fr / 1.5fr / 1.1fr`, which put the transcript --
 * the one thing this page exists to read -- in 43% of a phone viewport, minus a
 * header, a composer, and two of its own scroll regions above and below it.
 * Three independently scrolling boxes in one screen height is not a layout, it
 * is a fight over the same pixels, and the message history lost every time.
 *
 * So below `lg` it is one pane at a time, master-detail style: the conversation
 * drawer, the thread, or the context drawer. `lg` and up are unaffected -- this
 * state is only read in the responsive `hidden`/`flex` pairs.
 */
type MobilePane = "list" | "thread" | "info";

/**
 * A visitor's initial, as a CSS-drawn block.
 *
 * A messenger drawer is a list of people, and a list of people is scanned far
 * faster when each row has a fixed anchor than when it is text alone. There are
 * no avatars in `chat_conversations` -- only a name, sometimes null -- so this
 * derives one from the same string the row shows rather than inventing a second
 * identity.
 *
 * `aria-hidden` because the name is right beside it: announcing "A" before
 * "Ada Lovelace" is a stutter, not a label.
 */
function Monogram({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  // "md" IS the base `.inbox-avatar` size, so it emits no modifier -- otherwise
  // the default would carry a class that matches no rule.
  const modifier = size === "md" ? "" : ` inbox-avatar--${size}`;
  return (
    <span className={`inbox-avatar${modifier}`} aria-hidden="true">
      {initial}
    </span>
  );
}

export default function ChatInboxPage() {
  const [session, setSession] = useState(getStoredSession);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authReady, setAuthReady] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activity, setActivity] = useState<VisitorActivity[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [visitor, setVisitor] = useState<VisitorInfo | null>(null);
  const [reply, setReply] = useState("");
  const [query, setQuery] = useState("");
  // The value actually sent to the server. `query` updates on every keystroke
  // for instant local filtering; this trails it so typing does not fire a
  // request per character.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [panelTab, setPanelTab] = useState<PanelTab>("visitor");
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  /**
   * Whether the context drawer holds a column. False by default, so the thread
   * is the whole page until an admin asks for the rest.
   *
   * At `lg`+ this adds a grid column (see `.inbox-shell`); below `lg` it is
   * irrelevant, because there the drawer's visibility is `mobilePane`'s job and
   * the two are set together at the toggle.
   */
  const [infoOpen, setInfoOpen] = useState(false);

  /**
   * Whether the context drawer is on screen, at ANY width.
   *
   * Not the same as `infoOpen`. That flag is the `lg`+ column; below `lg` the
   * drawer's visibility is `mobilePane`'s job, and the two can disagree:
   * `selectConversation` moves `mobilePane` to "thread" without clearing
   * `infoOpen`, so a session that had the column open on a desktop and then
   * narrowed the window arrives on a phone with the flag set and the drawer
   * hidden.
   *
   * Reading the raw flag in the toggle is what that breaks: `aria-expanded`
   * would say "open", the button would render in its active state, and tapping
   * it would compute `next = !true = false` and change nothing the eye could
   * see. Deriving visibility from both means the one button is always a
   * truthful reflection of the screen, and one tap always does the obvious
   * thing.
   */
  const infoVisible = infoOpen || mobilePane === "info";
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [takeoverBusy, setTakeoverBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  // Conversation id awaiting confirmation, so a stray click cannot wipe a
  // thread. Cleared on any other selection.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );

  // Derived from the selected conversation so the controls always reflect the
  // server, never a stale local guess.
  const takeoverActive = selectedConversation?.mode === "takeover";
  const selectedEmail = normalizeContact(selectedConversation?.visitor_email ?? null);
  const selectedStatus = selectedConversation?.status ?? "active";
  const selectedResolved = selectedStatus === "resolved";
  const selectedVisitorId = selectedConversation?.visitor_id ?? "";

  const token = session;
  // Channel shared with the visitor's widget for the open thread. Held in a ref
  // so the reply composer can broadcast without re-subscribing on each keypress.
  const threadChannelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  /**
   * Monotonic token for thread loads, so a slow response cannot land on a
   * thread the admin has already navigated away from.
   *
   * Without it, `loadMessages` committed whatever it fetched -- transcript,
   * notes, activity, reactions and the visitor panel -- and with a poll running
   * every 2s against 5 parallel reads, an in-flight request for the previous
   * conversation routinely resolved after the next selection. The result was
   * one visitor's transcript rendered under another visitor's name, with the
   * header, takeover button and send target all belonging to the second.
   */
  const threadRequestRef = useRef(0);
  /**
   * Same guard for the conversation list. A poll that was in flight across
   * sign-out would otherwise restore a pre-logout selection on the next login.
   */
  const listRequestRef = useRef(0);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + unreadOf(conversation), 0),
    [conversations]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Clear the transient "copied" confirmation so the button returns to its
  // default label, and never leave it stuck on after switching visitors.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied, selectedId]);

  // A session restored from storage is only trusted once the server has
  // accepted it, so an expired or tampered value cannot unlock the UI.
  useEffect(() => {
    let active = true;
    if (!session) {
      setAuthReady(true);
      return;
    }
    setAuthReady(false);
    fetch(apiUrl("/api/chat?admin=1"), {
      headers: { Authorization: `Bearer ${session}` },
      cache: "no-store",
    })
      .then((response) => {
        if (!active) return;
        if (response.status === 401) {
          storeSession("");
          setSession("");
          setConversations([]);
          setMessages([]);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const request = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      const response = await fetch(url, { ...init, headers, cache: "no-store" });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(getErrorMessage(data, "Request failed")) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return data;
    },
    [token]
  );

  const loadConversations = useCallback(async () => {
    if (!token) return;
    const seq = ++listRequestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ admin: "1" });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const data: unknown = await request(apiUrl(`/api/chat?${params.toString()}`));
      // A newer poll (or a sign-out) has moved on; this result is stale.
      if (seq !== listRequestRef.current) return;
      const next =
        data && typeof data === "object" && "conversations" in data && Array.isArray(data.conversations)
          ? data.conversations.filter(isConversation)
          : [];
      setConversations(next);
      setSelectedId((current) => current || next[0]?.id || "");
      setError(null);
    } catch (caughtError) {
      if (isUnauthorizedError(caughtError)) {
        storeSession("");
        setSession("");
        setConversations([]);
        setSelectedId("");
        setMessages([]);
      } else if (seq === listRequestRef.current) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not load conversations");
      }
    } finally {
      if (seq === listRequestRef.current) setLoading(false);
    }
  }, [debouncedQuery, request, statusFilter, token]);

  /**
   * Re-applies the filters locally so typing narrows the list on the same
   * frame, before the debounced server request comes back with the wider
   * result set. Both layers run, so the list is correct either way.
   */
  const visibleConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (statusFilter !== "all" && conversation.status !== statusFilter) return false;
      return !term || matchesQuery(conversation, term);
    });
  }, [conversations, query, statusFilter]);

  const filtersActive = query.trim().length > 0 || statusFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
  };

  /**
   * The one way to change the open thread, so per-thread UI state cannot
   * outlive the thread it belongs to.
   *
   * The reply composer and the notes box both hold their draft in state that
   * is not keyed by conversation, and both stay mounted across a switch. A
   * half-typed reply to one visitor was therefore still in the box -- and
   * `sendReply` reads `selectedId` at send time -- so it posted to whoever was
   * selected next. Same for the notes draft, which `InternalNotes` also keeps
   * in an unkeyed instance.
   */
  const selectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setReply("");
    setNoteError(null);
    setConfirmDeleteId(null);
    // Below `lg` only one pane is mounted, so opening a thread from the list has
    // to bring the thread up. Harmless at `lg`+, where all three columns render
    // together and this state is not read.
    setMobilePane("thread");
  };

  /**
   * Loads everything about the open thread in one request: transcript, notes,
   * activity, reactions and the visitor summary. The server does the five reads
   * in parallel, so the panel never shows a half-populated state on refresh.
   */
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token || !conversationId) return;
      const seq = ++threadRequestRef.current;
      try {
        const data: unknown = await request(
          apiUrl(`/api/chat?admin=1&conversationId=${encodeURIComponent(conversationId)}`)
        );
        // The admin switched threads while this was in flight. Committing now
        // would paint the old visitor's transcript and notes under the new
        // visitor's header, while every control still targeted the new one.
        if (seq !== threadRequestRef.current) return;
        const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
        setMessages(record && Array.isArray(record.messages) ? record.messages.filter(isInboxMessage) : []);
        setNotes(record && Array.isArray(record.notes) ? record.notes.filter(isNote) : []);
        setActivity(
          record && Array.isArray(record.activity) ? record.activity.filter(isVisitorActivity) : []
        );
        setReactions(
          record && Array.isArray(record.reactions) ? record.reactions.filter(isReaction) : []
        );
        setVisitor(record && isVisitorInfo(record.visitor) ? record.visitor : null);
        setError(null);
      } catch (caughtError) {
        if (seq === threadRequestRef.current) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load messages");
        }
      }
    },
    [request, token]
  );

  useEffect(() => {
    if (authReady) void loadConversations();
  }, [authReady, loadConversations]);

  /**
   * Invalidates any in-flight thread load the moment the selection changes,
   * before the new request has even started. `loadMessages` bumps the counter
   * itself, but on a selection change that happens in the same commit as the
   * effect, so this closes the gap.
   */
  useEffect(() => {
    threadRequestRef.current += 1;
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    if (!authReady || !token) return;
    const interval = window.setInterval(() => void loadConversations(), 3000);
    return () => window.clearInterval(interval);
  }, [loadConversations, token]);

  useEffect(() => {
    if (!authReady || !token || !selectedId) return;
    const interval = window.setInterval(() => void loadMessages(selectedId), 2000);
    return () => window.clearInterval(interval);
  }, [loadMessages, selectedId, token]);

  /**
   * Best-effort realtime on the admin side.
   *
   * Worth being explicit about what this does and does not do today: this page
   * authenticates with CHAT_ADMIN_PASSWORD and never establishes a Supabase
   * session, so the anon role subscribes here. The SELECT policies on these
   * tables are `to authenticated`, which the anon role does not satisfy, so
   * these events do not currently arrive. The 2- and 3-second pollers above are
   * what actually keep this page live -- the subscriptions are left in place
   * because they cost nothing and start working the moment an admin Supabase
   * session exists.
   *
   * The tables with no policies at all (internal notes, activity, reactions)
   * must stay that way: granting an admin-scoped SELECT policy would mean
   * granting it to *someone*, and these rows are the ones a visitor must never
   * reach. They are served through the serverless function instead.
   */
  useEffect(() => {
    const realtimeClient = supabase;
    if (!authReady || !realtimeClient || !token) return;
    const channel = realtimeClient.channel("admin-chat-inbox");
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_conversations" },
      () => void loadConversations()
    );
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      () => {
        void loadConversations();
        if (selectedId) void loadMessages(selectedId);
      }
    );
    void channel.subscribe();
    return () => {
      void realtimeClient.removeChannel(channel);
    };
  }, [loadConversations, loadMessages, selectedId, token]);

  /**
   * Typing: joins the *visitor's* channel for the open thread.
   *
   * The channel is named after the visitor id in both directions, which is what
   * makes this work without any server involvement: the widget subscribes to
   * `visitor-chat-<id>` and the inbox subscribes to the same topic, so a
   * broadcast from either side reaches the other. Re-subscribing on every
   * selection is the only cost, and it is one channel per visitor switch.
   *
   * Unlike the postgres_changes subscriptions above, this one genuinely works:
   * Supabase broadcast is not routed through PostgREST, so it is not subject to
   * the RLS policies. The trade-off is that broadcast channels are public by
   * default -- anyone who guesses a topic could inject a fake typing signal.
   * The topic embeds the visitor id (a UUID kept in sessionStorage), so that is
   * a low-stakes risk, and it buys the visitor a real "someone is replying"
   * signal instead of a two-second poll.
   */
  useEffect(() => {
    const realtimeClient = supabase;
    if (!authReady || !realtimeClient || !selectedVisitorId) {
      threadChannelRef.current = null;
      return;
    }

    const channel = realtimeClient.channel(`visitor-chat-${selectedVisitorId}`);
    threadChannelRef.current = channel;
    channel.on("broadcast", { event: REALTIME_TYPING_EVENT }, (payload) => {
      const data = payload.payload as { typing?: unknown } | undefined;
      if (!data || data.typing !== true) return;
      setVisitorTyping(true);
    });
    void channel.subscribe();

    return () => {
      threadChannelRef.current = null;
      void realtimeClient.removeChannel(channel);
    };
  }, [authReady, selectedVisitorId]);

  /**
   * Expires the indicator. Without this a visitor who closes the tab
   * mid-sentence, or a lost broadcast, would leave "visitor is typing..." on
   * screen indefinitely -- the admin has no other way to know it stopped.
   */
  useEffect(() => {
    if (!visitorTyping) return;
    const timer = window.setTimeout(() => setVisitorTyping(false), TYPING_IDLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [visitorTyping, messages]);

  /** Identical callback identity to `threadChannelRef` swapping, so the hook
   *  only re-arms when the selected thread actually changes. */
  const sendTypingSignal = useCallback(() => {
    const channel = threadChannelRef.current;
    if (!channel || channel.state !== "joined") return;
    void channel.send({
      type: "broadcast",
      event: REALTIME_TYPING_EVENT,
      payload: { typing: true },
    });
  }, []);

  useTypingSignal({ broadcast: sendTypingSignal, active: Boolean(reply.trim()) && !sending });

  /**
   * Clears the unread badge for the open thread.
   *
   * Gated on the badge actually being set, and re-run when the transcript
   * grows. Two properties matter here: it must fire on *new messages arriving
   * in the open thread* (otherwise a thread the admin is actively watching
   * keeps a badge), and it must not fire on every 2-second poll of an
   * unchanged thread, which would be a write every poll forever.
   */
  const messageCount = messages.length;
  const selectedUnread = selectedConversation ? unreadOf(selectedConversation) : 0;
  useEffect(() => {
    if (!authReady || !token || !selectedId || selectedUnread === 0) return;
    void request(apiUrl("/api/chat"), {
      method: "POST",
      body: JSON.stringify({ event: "admin_read", conversationId: selectedId }),
    })
      .then(() => {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedId ? { ...conversation, unread_count: 0 } : conversation
          )
        );
      })
      // Non-fatal: the badge clears again on the next successful poll, and a
      // failed write must not surface as an error over a thread the admin can
      // perfectly well read.
      .catch(() => undefined);
  }, [authReady, messageCount, request, selectedId, selectedUnread, token]);

  const login = async () => {
    const password = passwordDraft.trim();
    if (!password || authBusy) return;
    setAuthBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "admin_login", password }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(data, "Could not sign in"));
      if (!data || typeof data !== "object" || !("session" in data) || typeof data.session !== "string" || !data.session) {
        throw new Error("Server did not return a session");
      }
      // Only the signed session is stored -- the password is never persisted.
      storeSession(data.session);
      setSession(data.session);
      setPasswordDraft("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not sign in");
    } finally {
      setAuthBusy(false);
    }
  };

  const disconnect = () => {
    storeSession("");
    setSession("");
    setPasswordDraft("");
    setConversations([]);
    setSelectedId("");
    setMessages([]);
    setNotes([]);
    setActivity([]);
    setReactions([]);
    setVisitor(null);
    clearFilters();
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!token || !selectedId || !text || sending) return;
    setSending(true);
    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({ event: "admin_reply", conversationId: selectedId, text }),
      });
      setReply("");
      await loadMessages(selectedId);
      await loadConversations();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not send reply");
    } finally {
      setSending(false);
    }
  };

  const toggleTakeover = async () => {
    if (!selectedId || takeoverBusy) return;
    setTakeoverBusy(true);
    setError(null);
    const takingOver = !takeoverActive;
    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({
          event: takingOver ? "admin_takeover" : "admin_release",
          conversationId: selectedId,
        }),
      });
      await Promise.all([loadMessages(selectedId), loadConversations()]);

      /**
       * Tell the visitor's open window to refetch, so the "Ian has joined the
       * chat" notice appears immediately instead of on its next 2.5s poll.
       *
       * Sent after the server write has been confirmed and carries no text:
       * the visitor re-reads the thread through the same endpoint it already
       * polls, so the notice arrives with its stored row id and is deduped by
       * that id. Pushing the wording over broadcast instead would put a second,
       * id-less copy of a row that is also being written.
       *
       * Best effort by design. A visitor who is not on the page, or whose
       * socket is closed, still gets the notice from the poll; losing the
       * broadcast costs latency, never the message.
       */
      const channel = threadChannelRef.current;
      if (channel && channel.state === "joined") {
        channel
          .send({
            type: "broadcast",
            event: REALTIME_THREAD_CHANGED_EVENT,
            payload: { mode: takingOver ? "takeover" : "ai" },
          })
          // removeChannel on unmount or thread switch rejects an in-flight
          // send, and that is not a failure worth surfacing to the admin.
          .catch(() => undefined);
      }
    } catch (caughtError) {
      /**
       * A rejected takeover means the notice was not saved, so the admin has to
       * hear about it. The list is reloaded either way: the mode flip is not
       * rolled back server-side, and leaving the toggle showing the wrong state
       * would be worse than the error itself.
       */
      await Promise.all([loadMessages(selectedId), loadConversations()]);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not change takeover mode"
      );
    } finally {
      setTakeoverBusy(false);
    }
  };

  const setStatus = async (status: ConversationStatus) => {
    if (!selectedId || statusBusy) return;
    setStatusBusy(status);
    setError(null);
    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({ event: "admin_status", conversationId: selectedId, status }),
      });
      // Resolving a conversation while its own status filter is on would drop
      // it out of the list and yank the open thread away, so fall back to the
      // unfiltered list. Predictable: the filter only resets when the change we
      // just made is the reason the row would disappear.
      if (statusFilter === status) setStatusFilter("all");
      await Promise.all([loadMessages(selectedId), loadConversations()]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update the status");
    } finally {
      setStatusBusy(null);
    }
  };

  const addNote = async (text: string) => {
    if (!token || !selectedId || noteBusy) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({ event: "admin_note", conversationId: selectedId, text }),
      });
      await loadMessages(selectedId);
    } catch (caughtError) {
      setNoteError(caughtError instanceof Error ? caughtError.message : "Could not save the note");
    } finally {
      setNoteBusy(false);
    }
  };

  const toggleReaction = async (messageId: string | number, kind: ReactionKind, active: boolean) => {
    if (!token || !selectedId || reactionBusy) return;
    setReactionBusy(true);

    const optimistic: Reaction = { message_id: messageId, kind, actor: ADMIN_ACTOR };
    setReactions((current) => {
      const without = current.filter(
        (reaction) =>
          reactionKey(reaction.message_id, reaction.kind, reaction.actor) !==
          reactionKey(messageId, kind, ADMIN_ACTOR)
      );
      return active ? [...without, optimistic] : without;
    });

    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({ event: "reaction", conversationId: selectedId, messageId, kind, active }),
      });
    } catch (caughtError) {
      // Roll back rather than leave a reaction on screen that was never stored.
      setReactions((current) => {
        const without = current.filter(
          (reaction) =>
            reactionKey(reaction.message_id, reaction.kind, reaction.actor) !==
            reactionKey(messageId, kind, ADMIN_ACTOR)
        );
        return active ? without : [...without, optimistic];
      });
      setError(caughtError instanceof Error ? caughtError.message : "Could not save the reaction");
    } finally {
      setReactionBusy(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (deletingId) return;
    setDeletingId(conversationId);
    setError(null);
    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({ event: "admin_delete", conversationId }),
      });
      setConfirmDeleteId(null);
      // Drop the row locally rather than refetching, so the list does not
      // visibly re-sort mid-interaction.
      setConversations((current) => current.filter((row) => row.id !== conversationId));
      if (selectedId === conversationId) {
        setSelectedId("");
        setMessages([]);
        setNotes([]);
        setActivity([]);
        setReactions([]);
        setVisitor(null);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete the conversation");
    } finally {
      setDeletingId(null);
    }
  };

  const copyEmail = async () => {
    if (!selectedEmail) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(selectedEmail);
      setCopied(true);
    } catch {
      setError("Could not copy to clipboard -- select the address and copy it manually");
    }
  };

  /**
   * The reply box grows with its content instead of scrolling inside itself.
   *
   * With a fixed `rows` and a `max-height`, a third line of a reply made the
   * textarea open a scrollbar of its own -- a second scroller stacked inside the
   * transcript's, in the one control the admin looks at while reading. The wheel
   * then went to whichever one the pointer happened to be over, which is the
   * "nested scrolling" this page kept growing. Every messenger composer grows.
   *
   * `height: auto` first, then back to `scrollHeight`: measuring without the
   * reset only ever grows the element, so a deleted line would leave the box
   * taller than its content. The clamp in CSS is the real cap; this keeps it in
   * sync so the two cannot disagree by a pixel.
   */
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = replyRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [reply]);

  return (
    /**
     * Fixed-height shell. `h-[100dvh]` rather than `min-h-screen`: the page used
     * to grow with the transcript, so a long thread turned into an
     * unmanageably tall page. Everything below scrolls inside itself.
     *
     * This is already the full height of the viewport, which is worth being
     * explicit about -- a `min-h-[75vh]` or `h-[80vh]` would give the chat LESS
     * room, not more. The cramping that made it look like it needed more height
     * was the ~200px marketing header above it, now one compact bar. So the
     * height is unchanged and the space the chat gets is up by roughly 200px.
     *
     * `inbox-app` rescales the whole surface down ~12% from the 16px document
     * root, which is the other half of the "zoomed" fix. See the rule in
     * theme.css.
     *
     * `px-3 sm:px-4` rather than `px-5 sm:px-8`: on a laptop this chrome is
     * competing with the transcript for the same screen, and 32px of side gutter
     * is a marketing page's worth of it.
     */
    <div
      className="inbox-app flex h-[100dvh] flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col">
        {/**
         * One bar, and it is one bar because this is a tool, not a page.
         *
         * It was a hero: a "back to portfolio" link on its own line with
         * `mb-4`, a "live support" eyebrow, a 30px mono h1, and a sentence of
         * description -- then `mb-6 pb-5` around the whole thing. On a 900px
         * laptop viewport that is roughly 200px of the screen gone before the
         * conversation grid draws a single pixel, which is a fifth of the
         * reading area, spent on a title and a sentence that say nothing an
         * operator needs while reading a conversation.
         *
                  * What survived: the way back, the name, and the way out. The
         * `section-eyebrow` and the description are gone rather than shrunk,
         * because at 11px they were not information -- they were decoration that
         * happened to be small. The unread count also left, because it already
         * sits beside the drawer's own heading; see the note at its old spot.
         */
}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--gray-200)] pb-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              aria-label="Back to portfolio"
              className="inbox-icon-btn"
            >
              <ArrowLeft size={14} />
            </Link>
            <h1 className="truncate text-sm font-semibold tracking-tight text-[var(--ink)]">
              chat inbox
            </h1>
            {/* No unread count here. It already sits beside the drawer's own
                heading, and at `lg`+ both are on screen at once -- two labels
                for one number. It belongs with the list of conversations it
                counts, which is where the admin acts on it. */}
          </div>

          {token && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={disconnect} className="inbox-btn">
                disconnect
              </button>
            </div>
          )}
        </header>


        {!authReady ? (
          <section className="card mx-auto my-auto max-w-lg p-6 text-center text-sm text-[var(--gray-500)]">
            Restoring admin session...
          </section>
        ) : !token ? (
          <section className="card mx-auto my-auto max-w-lg p-6">
            <div className="mb-4 flex items-center gap-3">
              <MessageCircle size={20} />
              <div>
                <h2 className="text-base font-semibold">Admin access</h2>
                <p className="text-xs text-[var(--gray-500)]">Enter the admin password to read and reply to visitor chats.</p>
              </div>
            </div>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void login();
              }}
            >
              <input
                type="password"
                value={passwordDraft}
                onChange={(event) => setPasswordDraft(event.target.value)}
                placeholder="admin password"
                autoComplete="current-password"
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
              />
              <button
                type="submit"
                disabled={authBusy || !passwordDraft.trim()}
                className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {authBusy ? "checking..." : "unlock"}
              </button>
            </form>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--gray-400)]">
              Set <code>CHAT_ADMIN_PASSWORD</code> on the server. Sessions last 12 hours and are kept
              in this tab only, so closing the browser signs you out.
            </p>
            {error && <p className="mt-3 text-xs text-red-500" role="alert">{error}</p>}
          </section>
        ) : (
          // A two-pane chatbox: conversation drawer, thread, and a context
          // drawer that only occupies a column while it is open.
          //
          // The grid itself is `.inbox-shell` in theme.css rather than Tailwind
          // grid utilities, because the column count now depends on runtime
          // state, not just a breakpoint: closing the info drawer has to REMOVE
          // a column, and a class that is merely absent from the element cannot
          // do that -- two competing column utilities resolve by stylesheet
          // order, never by intent. `[data-info]` makes the state explicit.
          <div className="inbox-shell" data-info={infoOpen ? "open" : "closed"}>
            {/* ---------- Conversation drawer ---------- */}
            <aside
              className={`inbox-panel inbox-drawer ${mobilePane === "list" ? "flex" : "hidden"} lg:flex`}
            >
              <div className="inbox-panel-head">
                <div className="inbox-panel-title">
                  inbox
                  <span className="ml-auto flex items-center gap-2">
                    {totalUnread > 0 && (
                      <span className="chat-unread-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => void loadConversations()}
                      aria-label="Refresh conversations"
                      className="text-[var(--gray-400)] transition-colors hover:text-[var(--ink)]"
                    >
                      <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    </button>
                  </span>
                </div>

                <div className="relative mt-2.5">
                  <Search
                    size={13}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name or email..."
                    aria-label="Search conversations by visitor name or email"
                    className="inbox-field w-full pl-8 pr-7"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--gray-400)] transition-colors hover:text-[var(--ink)]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* One joined control instead of five separately-bordered pills.
                    See `.inbox-seg`: five adjacent rounded pills read as five
                    unrelated buttons, not as one filter with five positions. */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <div className="inbox-seg" role="group" aria-label="Filter by conversation status">
                    {STATUS_FILTERS.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setStatusFilter(filter.value)}
                        aria-pressed={statusFilter === filter.value}
                        className="inbox-seg-item"
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Only the list scrolls; the search field and status chips stay
                  pinned so filtering is always reachable. */}
              <div className="inbox-panel-body space-y-1">

                {visibleConversations.length === 0 && !loading && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-[var(--gray-500)]">
                      {conversations.length === 0
                        ? "No conversations yet."
                        : "No visitors match this search."}
                    </p>
                    {filtersActive && conversations.length > 0 && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 text-[11px] uppercase tracking-[0.08em] text-[var(--gray-500)] underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--ink)]"
                      >
                        clear filters
                      </button>
                    )}
                  </div>
                )}
                {visibleConversations.map((conversation) => {
                  const unread = unreadOf(conversation);
                  const isSelected = selectedId === conversation.id;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => selectConversation(conversation.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className="inbox-row"
                    >
                      {/* Monogram, identity, then the preview under it. The
                          email is not on the row at all: `VisitorPanel` renders
                          it in the context drawer with its own copy button, and
                          at 280px it was being truncated to nothing anyway. */}
                      <span className="inbox-row-line">
                        <Monogram name={visitorLabel(conversation)} size="sm" />
                        <span className="inbox-row-name" style={{ fontWeight: unread ? 600 : 500 }}>
                          {visitorLabel(conversation)}
                        </span>
                        {unread > 0 && (
                          <span className="chat-unread-badge" title={`${unread} unread`}>
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                        <span className="inbox-row-time" title={formatFull(conversation.last_message_at)}>
                          {formatRelative(conversation.last_message_at)}
                        </span>
                      </span>
                      <span
                        className="inbox-row-preview"
                        style={{ color: unread ? "var(--ink)" : "var(--gray-500)" }}
                      >
                        {conversation.last_message_preview || "No messages yet"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {filtersActive && visibleConversations.length > 0 && (
                <p className="shrink-0 border-t border-[var(--gray-200)] px-3 py-2 text-[10px] text-[var(--gray-400)]">
                  showing {visibleConversations.length} of {conversations.length} loaded
                </p>
              )}
            </aside>

            {/* ---------- Chat pane ---------- */}
            <section
              className={`inbox-panel inbox-chat ${mobilePane === "thread" ? "flex" : "hidden"} lg:flex`}
            >
              {!selectedConversation ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                  <MessageCircle size={26} strokeWidth={1.5} className="text-[var(--gray-400)]" />
                  <p className="text-sm text-[var(--gray-500)]">Select a conversation to start reading.</p>
                </div>
              ) : (
                <>
                  {/* Identity and actions on one row. Status, visitor details,
                      activity and notes all moved to the context drawer, so the
                      transcript starts immediately below this -- which is the
                      whole point of the layout. */}
                  <div className="flex-none border-b border-[var(--gray-200)] px-3 py-2.5 sm:px-4">
                    <div className="flex items-center gap-2.5">
                      {/* Below `lg` this pane replaced the drawer, so it needs a
                          way back. */}
                      <button
                        type="button"
                        onClick={() => setMobilePane("list")}
                        aria-label="Back to conversations"
                        className="inbox-icon-btn lg:hidden"
                      >
                        <ArrowLeft size={14} />
                      </button>

                      <Monogram
                        name={normalizeContact(selectedConversation.visitor_name) || "anonymous"}
                        size="lg"
                      />

                      <div className="min-w-0 flex-1">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                          <span className="truncate">
                            {normalizeContact(selectedConversation.visitor_name) || "anonymous visitor"}
                          </span>
                          {/* Read-only indicator. The control that actually
                              changes the state is in the context drawer; this
                              is only so it is legible without opening
                              anything. */}
                          <StatusPill status={selectedStatus} />
                        </h2>
                        <p className="truncate text-[10px] uppercase tracking-[0.08em] text-[var(--gray-400)]">
                          started {formatRelative(selectedConversation.session_started_at)}
                        </p>
                      </div>

                      {/* Takeover stays in the header rather than moving to the
                          drawer: it is the switch you flip mid-conversation, and
                          burying it a click away would make it the one control
                          that genuinely must not move. */}
                      <button
                        type="button"
                        onClick={() => void toggleTakeover()}
                        disabled={takeoverBusy}
                        aria-pressed={takeoverActive}
                        className={`inbox-btn ${takeoverActive ? "inbox-btn--active" : ""}`}
                      >
                        {takeoverBusy ? "..." : takeoverActive ? "release to ai" : "take over"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Derived from what is actually on screen, not from
                          // `infoOpen` alone -- see `infoVisible`. Setting both
                          // states is what makes one button work as a column
                          // toggle on a laptop and as a page swap on a phone.
                          const next = !infoVisible;
                          setInfoOpen(next);
                          setMobilePane(next ? "info" : "thread");
                        }}
                        aria-expanded={infoVisible}
                        aria-label="Toggle conversation details"
                        className="inbox-icon-btn"
                      >
                        <Info size={14} />
                      </button>

                      {/* Destructive, last, and outline-only so it can never be
                          read as a primary action. Two-step. */}
                      {confirmDeleteId === selectedConversation.id ? (
                        <span className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void deleteConversation(selectedConversation.id)}
                            disabled={deletingId === selectedConversation.id}
                            className="inbox-btn inbox-btn--primary"
                          >
                            {deletingId === selectedConversation.id ? "..." : "delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            aria-label="Cancel delete"
                            className="inbox-icon-btn"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(selectedConversation.id)}
                          disabled={deletingId === selectedConversation.id}
                          aria-label="Delete session"
                          className="inbox-icon-btn"
                        >
                          <Trash2 size={14} strokeWidth={1.7} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* The transcript, on a centred measure. A chat window
                      stretched to the 1600px cap would run lines out to
                      ~1300px, which is as hard to track back to the next one as
                      a paragraph of unbroken text. This is the move Discord and
                      Telegram both make. */}
                  <div className="inbox-transcript" aria-live="polite">
                    <div className="inbox-thread-inner">
                      {messages.length === 0 && (
                        <p className="text-xs text-[var(--gray-500)]">No messages in this conversation.</p>
                      )}
                      {messages.map((message) => {
                        if (message.role === "system") {
                          return (
                            <p key={message.id} role="status" className="inbox-system">
                              {message.body}
                            </p>
                          );
                        }

                        const isOwn = message.role === "admin";
                        return (
                          <div
                            key={message.id}
                            className={`chat-reaction-row inbox-msg ${isOwn ? "inbox-msg--admin" : "inbox-msg--visitor"}`}
                          >
                            <div
                              className="chat-meta"
                              style={{ justifyContent: isOwn ? "flex-end" : "flex-start" }}
                            >
                              <span style={{ color: "var(--ink)" }}>{roleLabel(message.role)}</span>
                              <span aria-hidden="true">·</span>
                              <time
                                dateTime={message.created_at}
                                title={formatFull(message.created_at)}
                                className="text-[var(--gray-400)]"
                              >
                                {formatClock(message.created_at)}
                              </time>
                            </div>
                            <p
                              className={`inbox-bubble inbox-bubble--wrap ${isOwn ? "inbox-bubble--admin" : "inbox-bubble--visitor"}`}
                            >
                              {message.body}
                            </p>
                            <ReactionBar
                              messageId={message.id}
                              reactions={reactions}
                              actor={ADMIN_ACTOR}
                              onToggle={(kind, active) => void toggleReaction(message.id, kind, active)}
                              busy={reactionBusy}
                              align={isOwn ? "end" : "start"}
                            />
                          </div>
                        );
                      })}

                      {visitorTyping && (
                        <div className="inbox-msg inbox-msg--visitor">
                          <TypingIndicator
                            name={normalizeContact(selectedConversation.visitor_name) || "visitor"}
                            announce
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-none p-3 sm:p-4">
                    <div className="inbox-thread-inner">
                      {/* Above the composer, not below it. The error rendered
                          after the send button, so a failed send reported itself
                          underneath the control you had just pressed. */}
                      {error && (
                        <p className="mb-2 text-xs text-red-500" role="alert">
                          {error}
                        </p>
                      )}

                      <div className="inbox-composer">
                        <textarea
                          ref={replyRef}
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                            // Enter sends, Shift+Enter breaks the line. Same
                            // contract as the note composer, so the two text
                            // inputs on this page behave identically.
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              void sendReply();
                            }
                          }}
                          maxLength={600}
                          rows={1}
                          placeholder="Reply to this visitor..."
                          aria-label="Reply to this visitor"
                        />
                        <div className="inbox-composer-bar">
                          <span className="inbox-hint">
                            {selectedResolved
                              ? "Resolved — replying does not reopen it"
                              : "Enter sends · Shift+Enter for a new line"}
                          </span>
                          <button
                            type="button"
                            onClick={() => void sendReply()}
                            disabled={!reply.trim() || sending}
                            className="inbox-btn inbox-btn--primary"
                          >
                            <Send size={12} />
                            {sending ? "sending..." : "send"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>


            {/* ---------- Context drawer ----------
                Status, visitor details, activity, notes.

                Closed by default: the transcript is the point of the page, and a
                permanently visible rail beside it is the thing this layout
                replaced. At `lg`+ it takes a real third column and the chat pane
                narrows, so it never covers a message. Below `lg` it replaces the
                chat pane outright, which is the only way to give it room on a
                phone -- and there the `mobilePane` pair below decides. At `lg`+
                the visibility comes from `data-info` in CSS rather than from
                that class, so the grid and the pane cannot disagree. */}
            <aside
              className={`inbox-panel inbox-info ${mobilePane === "info" ? "flex" : "hidden"}`}
            >
              <div className="inbox-panel-head">
                <div className="inbox-panel-title">
                  conversation
                  <button
                    type="button"
                    onClick={() => {
                      setInfoOpen(false);
                      setMobilePane("thread");
                    }}
                    aria-label="Close conversation details"
                    className="ml-auto text-[var(--gray-400)] transition-colors hover:text-[var(--ink)]"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Status lives here rather than in the chat header. It is a
                    triage action, not part of the conversation, and four
                    positions plus a takeover plus a delete is most of a header
                    row for something an admin changes rarely. */}
                <div className="mt-2.5">
                  <p className="micro-label mb-1.5">status</p>
                  <div className="inbox-seg flex-wrap" role="group" aria-label="Set conversation status">
                    {CONVERSATION_STATUSES.map((status) => {
                      const active = selectedStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => void setStatus(status)}
                          disabled={statusBusy !== null || active}
                          aria-pressed={active}
                          className="inbox-seg-item"
                        >
                          {status === selectedStatus && statusBusy === status ? "saving..." : status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {takeoverActive && (
                  <p
                    className="mt-2.5 text-[10px] uppercase tracking-[0.08em]"
                    style={{ color: PRESENCE_COLOR }}
                  >
                    you are answering — assistant paused
                  </p>
                )}

                <div className="inbox-seg mt-2.5" role="tablist" aria-label="Visitor context">
                  {(
                    [
                      { value: "visitor", label: "visitor" },
                      { value: "activity", label: "activity" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      role="tab"
                      aria-selected={panelTab === tab.value}
                      onClick={() => setPanelTab(tab.value)}
                      className="inbox-seg-item"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ONE scroll region for both tabs. `VisitorPanel` and
                  `ActivityTimeline` each carried their own `overflow-y-auto` and
                  their own heading; nested inside a scrolling parent the wheel
                  grabs whichever one the pointer happens to be over, which is how
                  a narrow rail ends up with two scrollbars fighting over the
                  same content. `contained={false}` drops both. */}
              <div className="inbox-panel-body">
                {!selectedConversation ? (
                  <p className="px-1 py-3 text-[11px] italic leading-relaxed text-[var(--gray-400)]">
                    No conversation selected.
                  </p>
                ) : panelTab === "visitor" ? (
                  visitor ? (
                    <VisitorPanel
                      visitor={visitor}
                      copied={copied}
                      onCopyEmail={() => void copyEmail()}
                      contained={false}
                    />
                  ) : (
                    <p className="px-1 py-3 text-[11px] italic leading-relaxed text-[var(--gray-400)]">
                      No visitor details loaded yet.
                    </p>
                  )
                ) : (
                  <ActivityTimeline
                    activity={activity}
                    currentPage={selectedConversation?.current_page ?? null}
                    contained={false}
                  />
                )}
              </div>

              {/* Notes keep their own scroll and stay pinned below the tabs
                  rather than becoming a third tab: they are the one thing an
                  admin opens this drawer to write, and a tab would hide the
                  composer behind a click. The drawer is full height now, so
                  there is room for both halves. */}
              <div className="flex max-h-[38%] flex-none flex-col border-t border-[var(--gray-200)]">
                <InternalNotes
                  // Keyed so the draft is discarded per thread: the component
                  // keeps it in local state, and without a key React reuses one
                  // instance across every conversation switch.
                  key={selectedId}
                  notes={notes}
                  onAdd={addNote}
                  busy={noteBusy}
                  error={noteError}
                  disabled={!selectedConversation}
                />
              </div>
            </aside>


          </div>
        )}
      </div>
    </div>
  );
}
