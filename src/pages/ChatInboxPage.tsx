import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useReplyDrafts } from "@/lib/useReplyDrafts";
import { useTypingSignal } from "@/lib/useTypingSignal";
import { useUnreadTitle } from "@/lib/useUnreadTitle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import "@/components/ui/ui.css";
import "@/components/inbox/inbox.css";
import Composer from "@/components/inbox/Composer";
import ConversationList, { type InboxTab } from "@/components/inbox/ConversationList";
import EmptyState from "@/components/inbox/EmptyState";
import InboxShell, { type InboxPane } from "@/components/inbox/InboxShell";
import SignInGate from "@/components/inbox/SignInGate";
import ThreadHeader from "@/components/inbox/ThreadHeader";
import Transcript from "@/components/inbox/Transcript";
import {
  isArchived,
  isConversation,
  isInboxMessage,
  isVisitorInfo,
  matchesQuery,
  normalizeContact,
  unreadOf,
  visitorLabel,
  type Conversation,
  type InboxMessage,
  type VisitorInfo,
} from "@/components/inbox/types";

const SESSION_STORAGE_KEY = "ian-chat-admin-session";

/** The visitor widget broadcasts this while a message is being written. */
const REALTIME_TYPING_EVENT = "typing";
/**
 * Broadcast to the visitor's open window when a takeover or release succeeds,
 * so it refetches instead of waiting out its poll. Must match the constant of
 * the same name in components/chat/ChatWithIan.tsx.
 */
const REALTIME_THREAD_CHANGED_EVENT = "thread-changed";
/** Matches the visitor widget's timeout: a beat every 3s, expire after 6s. */
const TYPING_IDLE_TIMEOUT_MS = 6000;
const SEARCH_DEBOUNCE_MS = 250;

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

/**
 * The server's message, plus its `hint` when it sent one.
 *
 * Writes that can fail for a reason the admin can fix -- a migration that has
 * not been run yet, most of all -- answer with both, and dropping the hint would
 * leave "Could not archive the conversation" as the whole story.
 */
function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const parts = [record.error, record.hint].filter(
      (part): part is string => typeof part === "string" && part.trim().length > 0
    );
    if (parts.length > 0) return parts.join(" -- ");
  }
  return fallback;
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && (error as Error & { status?: number }).status === 401;
}

/**
 * Runs `task` every `intervalMs`, skipping ticks while the tab is hidden or the
 * previous run is still in flight, and refreshing as soon as the tab returns.
 * Returns the cleanup function.
 */
function pollWhileVisible(task: () => Promise<unknown>, intervalMs: number): () => void {
  let inFlight = false;
  const run = () => {
    if (inFlight || document.hidden) return;
    inFlight = true;
    void task().finally(() => {
      inFlight = false;
    });
  };
  const onVisibilityChange = () => {
    if (!document.hidden) run();
  };
  const interval = window.setInterval(run, intervalMs);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

/**
 * The admin inbox.
 *
 * Two panes: who, and what they said. Everything the page does is one of four
 * things done to a conversation -- read it, reply to it, take it over, file it
 * away (or delete it) -- and each of those is one control in the place it
 * belongs rather than one control in a toolbar.
 *
 * What this page owns is the data: the session, the two pollers, the realtime
 * subscriptions, the reply drafts, and the writes. The look lives in
 * `components/inbox/` on top of `components/ui/`.
 */
export default function ChatInboxPage() {
  const [session, setSession] = useState(getStoredSession);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authReady, setAuthReady] = useState(true);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [visitor, setVisitor] = useState<VisitorInfo | null>(null);

  const [query, setQuery] = useState("");
  // The value actually sent to the server. `query` updates on every keystroke
  // for instant local filtering; this trails it so typing does not fire a
  // request per character.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tab, setTab] = useState<InboxTab>("open");
  const [pane, setPane] = useState<InboxPane>("list");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [takeoverBusy, setTakeoverBusy] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Conversation awaiting a delete confirmation, so a stray click cannot wipe a
  // transcript. Cleared on any other selection.
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);

  /**
   * One unsent reply per conversation, keyed by id.
   *
   * It used to be one string shared by every thread: switching conversations
   * either carried the half-typed text over to the next visitor -- where
   * `sendReply` would post it to them -- or threw it away.
   */
  const { reply, setReply, clearReply, hasDraft } = useReplyDrafts(selectedId);

  const token = session;
  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );
  const takeoverActive = selectedConversation?.mode === "takeover";
  const selectedEmail = normalizeContact(selectedConversation?.visitor_email ?? null);

  /**
   * Monotonic tokens for the two loaders, so a slow response cannot land on a
   * thread or a session the admin has already left. Without the thread one, a
   * 2s poll against a slow read routinely resolved after the next selection and
   * painted one visitor's transcript under another visitor's name.
   */
  const threadRequestRef = useRef(0);
  const listRequestRef = useRef(0);

  // Channel shared with the visitor's widget for the open thread. Held in a ref
  // so the composer can broadcast without re-subscribing on each keystroke.
  const threadChannelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + unreadOf(conversation), 0),
    [conversations]
  );

  /** Tab counts, honouring the search term so the numbers match the rows. */
  const counts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = conversations.filter((conversation) => !term || matchesQuery(conversation, term));
    return {
      open: visible.filter((conversation) => !isArchived(conversation)).length,
      archived: visible.filter((conversation) => isArchived(conversation)).length,
    };
  }, [conversations, query]);

  const visibleConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (isArchived(conversation) !== (tab === "archived")) return false;
      return !term || matchesQuery(conversation, term);
    });
  }, [conversations, query, tab]);

  // This page lives in a background tab all day, so the count belongs where the
  // eye already is. The hook restores the previous title on unmount.
  useUnreadTitle(totalUnread);

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
        const failure = new Error(getErrorMessage(data, "Request failed")) as Error & { status?: number };
        failure.status = response.status;
        throw failure;
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
      const data: unknown = await request(apiUrl(`/api/chat?${params.toString()}`));
      // A newer poll (or a sign-out) has moved on; this result is stale.
      if (seq !== listRequestRef.current) return;
      const next =
        data && typeof data === "object" && "conversations" in data && Array.isArray(data.conversations)
          ? data.conversations.filter(isConversation)
          : [];
      setConversations(next);
      // Default to the first *open* conversation: landing on a filed-away thread
      // while the Open tab is showing reads as a bug.
      setSelectedId(
        (current) =>
          current ||
          next.find((conversation) => !isArchived(conversation))?.id ||
          next[0]?.id ||
          ""
      );
      setError(null);
    } catch (caughtError) {
      if (isUnauthorizedError(caughtError)) {
        storeSession("");
        setSession("");
        setConversations([]);
        setSelectedId("");
        setMessages([]);
        setVisitor(null);
      } else if (seq === listRequestRef.current) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not load conversations");
      }
    } finally {
      if (seq === listRequestRef.current) setLoading(false);
    }
  }, [debouncedQuery, request, token]);

  /**
   * Loads the open thread: the transcript, and the visitor summary the header
   * reads. The server answers with more (notes, activity, reactions) for the
   * other surfaces that used to be on this page; this one ignores it.
   */
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token || !conversationId) return;
      const seq = ++threadRequestRef.current;
      try {
        const data: unknown = await request(
          apiUrl(`/api/chat?admin=1&conversationId=${encodeURIComponent(conversationId)}`)
        );
        if (seq !== threadRequestRef.current) return;
        const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
        setMessages(record && Array.isArray(record.messages) ? record.messages.filter(isInboxMessage) : []);
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
    return pollWhileVisible(() => loadConversations(), 3000);
  }, [loadConversations, token]);

  useEffect(() => {
    if (!authReady || !token || !selectedId) return;
    return pollWhileVisible(() => loadMessages(selectedId), 2000);
  }, [loadMessages, selectedId, token]);

  /**
   * Best-effort realtime on the admin side.
   *
   * This page authenticates with CHAT_ADMIN_PASSWORD and never establishes a
   * Supabase session, so the anon role subscribes here, and the SELECT policies
   * on these tables are `to authenticated` -- so these events do not currently
   * arrive. The 2- and 3-second pollers above are what actually keep the page
   * live. The subscriptions are left in place because they cost nothing and
   * start working the moment an admin Supabase session exists.
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
   * `visitor-chat-<id>` and the inbox subscribes to the same topic. Unlike the
   * postgres_changes subscriptions above, this one genuinely works -- Supabase
   * broadcast is not routed through PostgREST, so RLS does not apply.
   */
  const selectedVisitorId = selectedConversation?.visitor_id ?? "";
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
   * mid-sentence, or a lost broadcast, would leave "is typing..." on screen
   * indefinitely -- the admin has no other way to know it stopped.
   */
  useEffect(() => {
    if (!visitorTyping) return;
    const timer = window.setTimeout(() => setVisitorTyping(false), TYPING_IDLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [visitorTyping, messages]);

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
   * grows. Two properties matter: it must fire on new messages arriving in the
   * open thread (otherwise a thread the admin is watching keeps a badge), and it
   * must not fire on every 2-second poll of an unchanged thread, which would be
   * a write every poll forever.
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

  /**
   * The one way to change the open thread, so per-thread UI state cannot outlive
   * the thread it belongs to. The reply draft deliberately survives it: it is
   * keyed by conversation id, and is cleared when it is sent and nowhere else.
   */
  const selectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setDeleteTarget(null);
    setPane("thread");
    // The new thread has no typing signal yet; leaving the previous visitor's
    // "is typing..." up until it times out would attribute it to this one.
    setVisitorTyping(false);
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!token || !selectedId || !text || sending) return;
    // Captured before the request goes out: the draft is keyed by conversation,
    // so the one to clear is the one this text was typed for.
    const sendId = selectedId;
    setSending(true);
    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({ event: "admin_reply", conversationId: selectedId, text }),
      });
      clearReply(sendId);
      await loadMessages(sendId);
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
       * chat" notice appears immediately instead of on its next poll. Sent after
       * the server write is confirmed and carries no text: the visitor re-reads
       * the thread through the endpoint it already polls, so the notice arrives
       * with its stored row id and is deduped by that id.
       */
      const channel = threadChannelRef.current;
      if (channel && channel.state === "joined") {
        channel
          .send({
            type: "broadcast",
            event: REALTIME_THREAD_CHANGED_EVENT,
            payload: { mode: takingOver ? "takeover" : "ai" },
          })
          .catch(() => undefined);
      }
    } catch (caughtError) {
      /**
       * The list is reloaded either way: the mode flip is not rolled back
       * server-side, and leaving the toggle showing the wrong state would be
       * worse than the error itself.
       */
      await Promise.all([loadMessages(selectedId), loadConversations()]);
      setError(caughtError instanceof Error ? caughtError.message : "Could not change takeover mode");
    } finally {
      setTakeoverBusy(false);
    }
  };

  /**
   * Files a conversation away, or brings it back.
   *
   * Applied to the row locally rather than by refetching, so the list does not
   * visibly re-sort under the pointer. The write is admin-only and announces
   * nothing to the visitor -- see the archive migration for why.
   */
  const setArchived = async (conversation: Conversation, archived: boolean) => {
    if (archiveBusyId) return;
    setArchiveBusyId(conversation.id);
    setError(null);
    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({
          event: archived ? "admin_archive" : "admin_unarchive",
          conversationId: conversation.id,
        }),
      });
      setConversations((current) =>
        current.map((row) =>
          row.id === conversation.id
            ? { ...row, archived_at: archived ? new Date().toISOString() : null }
            : row
        )
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : archived
            ? "Could not archive the conversation"
            : "Could not restore the conversation"
      );
    } finally {
      setArchiveBusyId(null);
    }
  };

  const deleteConversation = async () => {
    const conversation = deleteTarget;
    if (!conversation || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await request(apiUrl("/api/chat"), {
        method: "POST",
        body: JSON.stringify({ event: "admin_delete", conversationId: conversation.id }),
      });
      setDeleteTarget(null);
      // Drop the row locally rather than refetching, so the list does not
      // visibly re-sort mid-interaction.
      setConversations((current) => current.filter((row) => row.id !== conversation.id));
      if (selectedId === conversation.id) {
        setSelectedId("");
        setMessages([]);
        setVisitor(null);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete the conversation");
    } finally {
      setDeleting(false);
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
      if (
        !data ||
        typeof data !== "object" ||
        !("session" in data) ||
        typeof data.session !== "string" ||
        !data.session
      ) {
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
    setVisitor(null);
    setQuery("");
    setTab("open");
    setPane("list");
    setError(null);
  };

  const listPane = (
    <ConversationList
      conversations={visibleConversations}
      loadedCount={conversations.length}
      counts={counts}
      unread={totalUnread}
      selectedId={selectedId}
      loading={loading}
      query={query}
      onQueryChange={setQuery}
      tab={tab}
      onTabChange={setTab}
      hasDraft={hasDraft}
      onSelect={selectConversation}
      onArchive={(conversation, archived) => void setArchived(conversation, archived)}
      onDelete={setDeleteTarget}
      busyId={archiveBusyId}
    />
  );

  const threadPane = (
    <Card className="inbox-thread">
      {!selectedConversation ? (
        <EmptyState
          icon={<MessageCircle size={22} strokeWidth={1.5} />}
          title="No conversation open"
          hint="Pick a visitor on the left to read the thread and reply."
        />
      ) : (
        <>
          <ThreadHeader
            conversation={selectedConversation}
            visitor={visitor}
            takeoverActive={takeoverActive}
            takeoverBusy={takeoverBusy}
            busy={archiveBusyId === selectedConversation.id}
            copied={copied}
            onBack={() => setPane("list")}
            onToggleTakeover={() => void toggleTakeover()}
            onCopyEmail={() => void copyEmail()}
            onArchive={(archived) => void setArchived(selectedConversation, archived)}
            onDelete={() => setDeleteTarget(selectedConversation)}
          />
          <Transcript
            conversationId={selectedConversation.id}
            messages={messages}
            visitorName={visitorLabel(selectedConversation)}
            visitorTyping={visitorTyping}
          />
          <Composer
            value={reply}
            onChange={setReply}
            onSend={() => void sendReply()}
            sending={sending}
            disabled={false}
            onTyping={sendTypingSignal}
          />
        </>
      )}
    </Card>
  );

  return (
    <main id="main-content" tabIndex={-1} className="inbox-page">
      {!authReady ? (
        <div className="inbox-gate">
          <Card className="inbox-gate-card">
            <CardContent>
              <p className="inbox-empty-hint">Restoring admin session...</p>
            </CardContent>
          </Card>
        </div>
      ) : !token ? (
        <SignInGate
          password={passwordDraft}
          onPasswordChange={setPasswordDraft}
          onSubmit={() => void login()}
          busy={authBusy}
          error={error}
        />
      ) : (
        <InboxShell
          unread={totalUnread}
          loading={loading}
          pane={pane}
          onRefresh={() => void loadConversations()}
          onSignOut={disconnect}
          banner={
            error ? (
              <div className="inbox-banner" role="alert">
                <span>{error}</span>
                <button
                  type="button"
                  className="inbox-banner-dismiss"
                  onClick={() => setError(null)}
                  aria-label="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            ) : undefined
          }
          list={listPane}
          thread={threadPane}
        />
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        busy={deleting}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete this conversation with {deleteTarget ? visitorLabel(deleteTarget) : "this visitor"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The whole transcript goes with it, for good. Nothing is archived, and the visitor cannot
            get it back either. Archive it instead if you only want it out of the way.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteConversation()}>
              {deleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
