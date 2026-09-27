import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, MessageCircle, RefreshCw, Search, Send, Trash2, X } from "lucide-react";
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
const PRESENCE_COLOR = "#22c55e";

const REALTIME_TYPING_EVENT = "typing";
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
    setLoading(true);
    try {
      const params = new URLSearchParams({ admin: "1" });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const data: unknown = await request(apiUrl(`/api/chat?${params.toString()}`));
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
      }
      setError(caughtError instanceof Error ? caughtError.message : "Could not load conversations");
    } finally {
      setLoading(false);
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
   * Loads everything about the open thread in one request: transcript, notes,
   * activity, reactions and the visitor summary. The server does the five reads
   * in parallel, so the panel never shows a half-populated state on refresh.
   */
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token || !conversationId) return;
      try {
        const data: unknown = await request(
          apiUrl(`/api/chat?admin=1&conversationId=${encodeURIComponent(conversationId)}`)
        );
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
        setError(caughtError instanceof Error ? caughtError.message : "Could not load messages");
      }
    },
    [request, token]
  );

  useEffect(() => {
    if (authReady) void loadConversations();
  }, [authReady, loadConversations]);

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
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not change takeover mode");
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

  return (
    // Fixed-height shell. `h-[100dvh]` rather than `min-h-screen`: the page
    // used to grow with the transcript, so a long thread turned into an
    // unmanageably tall page. Everything below scrolls inside itself.
    <div
      className="flex h-[100dvh] flex-col overflow-hidden px-5 py-6 sm:px-8"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col">
        <header className="mb-6 flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-[var(--gray-200)] pb-5">
          <div>
            <Link to="/" className="mb-4 inline-flex items-center gap-2 text-xs text-[var(--gray-500)] transition-colors hover:text-[var(--ink)]">
              <ArrowLeft size={14} />
              back to portfolio
            </Link>
            <p className="section-eyebrow mb-2">live support</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">chat inbox</h1>
            <p className="mt-2 text-sm text-[var(--gray-500)]">Review visitor sessions and reply in real time.</p>
          </div>
          {token && (
            <div className="flex items-center gap-3">
              {/* A single number rather than a per-row count: the point is
                  "is there anything I have not looked at", and summing it here
                  answers that without making the admin read 50 rows. */}
              {totalUnread > 0 && (
                <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-[var(--gray-500)]">
                  <span className="chat-unread-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>
                  unread
                </span>
              )}
              <button
                type="button"
                onClick={disconnect}
                className="rounded-full border border-[var(--gray-300)] px-3 py-2 text-xs text-[var(--gray-500)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
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
          // min-h-0 on the grid and on every panel is what actually stops the
          // page growing: without it a flex/grid child refuses to shrink below
          // its content, so the transcript pushed the whole page taller.
          //
          // Three explicit rows below lg, where the panels stack: with `auto`
          // rows a panel sized itself to its content and `flex-1` was inert, so
          // the page grew again. `minmax(0,1fr)` gives each the leftover height
          // and lets it shrink. One row from lg, where they are columns instead.
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.9fr)_minmax(0,1.5fr)_minmax(0,1.1fr)] gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,300px)] lg:grid-rows-[minmax(0,1fr)]">
            <aside className="card flex min-h-0 flex-col p-4">
              <div className="shrink-0">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">visitors</h2>
                  <button
                    type="button"
                    onClick={() => void loadConversations()}
                    aria-label="Refresh conversations"
                    className="text-[var(--gray-500)] transition-colors hover:text-[var(--ink)]"
                  >
                    <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)]"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name or email..."
                    aria-label="Search conversations by visitor name or email"
                    className="w-full rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] py-2 pl-9 pr-8 text-xs outline-none focus:border-[var(--ink)]"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--gray-400)] transition-colors hover:text-[var(--ink)]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by conversation status">
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setStatusFilter(filter.value)}
                      aria-pressed={statusFilter === filter.value}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] transition-colors ${
                        statusFilter === filter.value
                          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                          : "border-[var(--gray-300)] text-[var(--gray-500)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {filter.value !== "all" && (
                        <StatusPill status={filter.value} variant="dot" hideLabel />
                      )}
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Only the list scrolls; the search field and status chips stay
                  pinned so filtering is always reachable. */}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
                      onClick={() => setSelectedId(conversation.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-[var(--ink)] bg-[var(--gray-100)]"
                          : "border-[var(--gray-200)] hover:border-[var(--gray-400)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`min-w-0 flex-1 truncate text-xs ${unread ? "font-semibold" : "font-medium"}`}
                          style={{ color: "var(--ink)" }}
                        >
                          {visitorLabel(conversation)}
                        </span>
                        <span className="flex flex-shrink-0 items-center gap-1.5">
                          <StatusPill status={conversation.status} variant="dot" />
                          {unread > 0 && (
                            <span className="chat-unread-badge" title={`${unread} unread`}>
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </span>
                      </div>
                      {normalizeContact(conversation.visitor_email) && (
                        <p className="mt-1 truncate text-[11px] text-[var(--gray-500)]">
                          {normalizeContact(conversation.visitor_email)}
                        </p>
                      )}
                      <p
                        className="mt-2 truncate text-xs"
                        style={{ color: unread ? "var(--ink)" : "var(--gray-500)" }}
                      >
                        {conversation.last_message_preview || "No messages yet"}
                      </p>
                      <p
                        className="mt-2 text-[11px]"
                        style={{ color: "var(--gray-400)" }}
                        title={formatFull(conversation.last_message_at)}
                      >
                        {formatRelative(conversation.last_message_at)}
                      </p>
                    </button>
                  );
                })}
              </div>
              {filtersActive && visibleConversations.length > 0 && (
                <p className="mt-3 shrink-0 text-[11px] text-[var(--gray-400)]">
                  showing {visibleConversations.length} of {conversations.length} loaded
                </p>
              )}
            </aside>

            <section className="card flex min-h-0 min-w-0 flex-col p-5">
              {!selectedConversation ? (
                <div className="flex flex-1 items-center justify-center text-sm text-[var(--gray-500)]">Select a visitor to read the conversation.</div>
              ) : (
                <>
                  <div className="shrink-0 border-b border-[var(--gray-200)] pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          <span className="truncate">
                            {normalizeContact(selectedConversation.visitor_name) || "anonymous visitor"}
                          </span>
                          <StatusPill status={selectedStatus} />
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--gray-500)]">
                          <span title={selectedConversation.session_started_at}>
                            started {formatRelative(selectedConversation.session_started_at)}
                          </span>
                          {selectedConversation.visitor_email ? (
                            <span className="inline-flex items-center gap-1.5">
                              <a
                                href={`mailto:${selectedConversation.visitor_email}`}
                                className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--ink)]"
                              >
                                {selectedConversation.visitor_email}
                              </a>
                              <button
                                type="button"
                                onClick={() => void copyEmail()}
                                aria-label={`Copy ${selectedEmail} to clipboard`}
                                title={copied ? "Copied" : "Copy email address"}
                                className="inline-flex items-center gap-1 rounded border border-[var(--gray-300)] px-1.5 py-0.5 text-[11px] uppercase tracking-[0.08em] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                              >
                                {copied ? <Check size={10} /> : <Copy size={10} />}
                                {copied ? "copied" : "copy"}
                              </button>
                            </span>
                          ) : (
                            <span className="italic opacity-70">no email given</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleTakeover()}
                          disabled={takeoverBusy}
                          className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors disabled:opacity-50"
                          style={
                            takeoverActive
                              ? { backgroundColor: "var(--ink)", color: "var(--bg)" }
                              : { border: "1px solid var(--gray-300)", color: "var(--gray-500)" }
                          }
                        >
                          {takeoverBusy
                            ? "working..."
                            : takeoverActive
                              ? "release to ai"
                              : "take over chat"}
                        </button>
                      </div>
                    </div>

                    {/* Status as a row of one-click pills rather than a
                        <select>: these are triage actions, and a menu that
                        hides the four states behind a click is what made the
                        old two-state toggle easy to forget existed. */}
                    <div
                      className="mt-4 flex flex-wrap items-center gap-1.5"
                      role="group"
                      aria-label="Set conversation status"
                    >
                      <span className="micro-label mr-1" style={{ color: "var(--gray-400)" }}>
                        status
                      </span>
                      {CONVERSATION_STATUSES.map((status) => {
                        const active = selectedStatus === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void setStatus(status)}
                            disabled={statusBusy !== null || active}
                            aria-pressed={active}
                            className="rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] transition-colors disabled:opacity-50"
                            style={
                              active
                                ? { borderColor: "var(--ink)", backgroundColor: "var(--ink)", color: "var(--bg)" }
                                : { borderColor: "var(--gray-300)", color: "var(--gray-500)" }
                            }
                          >
                            {status === selectedStatus && statusBusy === status ? "saving..." : status}
                          </button>
                        );
                      })}
                    </div>

                    {takeoverActive && (
                      <p
                        className="mt-3 text-[11px] uppercase tracking-[0.08em]"
                        style={{ color: PRESENCE_COLOR }}
                      >
                        you are answering this chat -- the assistant is paused
                      </p>
                    )}

                    {/* Destructive action, kept in its own bordered row beneath
                        the resolve / takeover controls so it can never overlap
                        them or the visitor details above. Still two-step: the
                        first click arms it, the second confirms. */}
                    <div className="mt-4 flex justify-end border-t border-[var(--gray-200)] pt-4">
                      {confirmDeleteId === selectedConversation.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--gray-500)]">
                            delete this thread and its messages?
                          </span>
                          <button
                            type="button"
                            onClick={() => void deleteConversation(selectedConversation.id)}
                            disabled={deletingId === selectedConversation.id}
                            className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--bg)] transition-opacity disabled:opacity-50"
                          >
                            {deletingId === selectedConversation.id ? "deleting..." : "delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-full border border-[var(--gray-300)] px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--gray-500)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                          >
                            cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(selectedConversation.id)}
                          disabled={deletingId === selectedConversation.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gray-300)] px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--gray-500)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-50"
                        >
                          <Trash2 size={13} strokeWidth={1.7} />
                          delete session
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-5" aria-live="polite">
                    {messages.length === 0 && <p className="text-xs text-[var(--gray-500)]">No messages in this conversation.</p>}
                    {messages.map((message) => {
                      if (message.role === "system") {
                        return (
                          <div key={message.id} className="flex justify-center">
                            <p
                              role="status"
                              className="max-w-[85%] break-words rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] px-3 py-2 text-center text-[11px] leading-relaxed text-[var(--gray-500)]"
                            >
                              {message.body}
                            </p>
                          </div>
                        );
                      }

                      const isOwn = message.role === "admin";
                      return (
                        <div
                          key={message.id}
                          className={`chat-reaction-row flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                        >
                          <div className="chat-meta" style={{ justifyContent: isOwn ? "flex-end" : "flex-start" }}>
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
                          <div className={`max-w-[85%] ${isOwn ? "self-end" : "self-start"}`}>
                            <p
                              className="whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed"
                              style={{
                                backgroundColor: isOwn ? "var(--ink)" : "var(--gray-100)",
                                color: isOwn ? "var(--bg)" : "var(--ink)",
                              }}
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
                        </div>
                      );
                    })}

                    {visitorTyping && (
                      <TypingIndicator
                        name={normalizeContact(selectedConversation.visitor_name) || "visitor"}
                        announce
                      />
                    )}
                  </div>

                  <div className="shrink-0 border-t border-[var(--gray-200)] pt-4">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={600}
                      rows={2}
                      placeholder="Reply to this visitor..."
                      aria-label="Reply to this visitor"
                      className="min-h-16 w-full resize-y rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-[var(--gray-500)]">
                        {selectedResolved
                          ? "Resolved -- replying does not reopen it, but a new visitor message will."
                          : "Replies appear in the visitor's chat window."}
                      </span>
                      <button
                        type="button"
                        onClick={() => void sendReply()}
                        disabled={!reply.trim() || sending}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2 text-xs text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-40"
                      >
                        <Send size={14} />
                        {sending ? "sending..." : "send reply"}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {error && <p className="mt-3 shrink-0 text-xs text-red-500" role="alert">{error}</p>}
            </section>

            <aside className="card flex min-h-0 flex-col p-4">
              {/* Notes are pinned to the bottom rather than sitting in the tab
                  strip: they are the one thing an admin opens this panel to
                  write, and a third tab would hide the composer. */}
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 gap-1.5" role="tablist" aria-label="Visitor context">
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
                      className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
                        panelTab === tab.value
                          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                          : "border-[var(--gray-300)] text-[var(--gray-500)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                  {panelTab === "visitor" ? (
                    visitor ? (
                      <VisitorPanel visitor={visitor} copied={copied} onCopyEmail={() => void copyEmail()} />
                    ) : (
                      <p className="py-3 text-[11px] italic leading-relaxed text-[var(--gray-400)]">
                        No visitor details loaded yet.
                      </p>
                    )
                  ) : (
                    <ActivityTimeline activity={activity} currentPage={selectedConversation?.current_page ?? null} />
                  )}
                </div>
              </div>

              <div
                className="mt-4 flex min-h-0 shrink-0 flex-col border-t border-[var(--gray-200)] pt-4 lg:max-h-[45%]"
              >
                <InternalNotes
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
