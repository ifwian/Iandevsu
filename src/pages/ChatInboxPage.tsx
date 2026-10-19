import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useReplyDrafts } from "@/lib/useReplyDrafts";
import { useTypingSignal } from "@/lib/useTypingSignal";
import { useUnreadTitle } from "@/lib/useUnreadTitle";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import "@/components/ui/ui.css";
import "@/components/inbox/inbox.css";
import ConversationList from "@/components/inbox/ConversationList";
import EmptyState from "@/components/inbox/EmptyState";
import InboxShell, { InboxPane } from "@/components/inbox/InboxShell";
import SignInGate from "@/components/inbox/SignInGate";
import ThreadHeader from "@/components/inbox/ThreadHeader";
import Transcript from "@/components/inbox/Transcript";
import Composer from "@/components/inbox/Composer";
import { MessageCircle, X } from "lucide-react";
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

const REALTIME_TYPING_EVENT = "typing";
const REALTIME_THREAD_CHANGED_EVENT = "thread-changed";
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

function pollWhileVisible(task: () => Promise<unknown>, intervalMs: number): () => void {
  let inFlight = false;
  const run = () => {
    if (inFlight || document.hidden) return;
    inFlight = true;
    void task().finally(() => { inFlight = false; });
  };
  const onVisibilityChange = () => { if (!document.hidden) run(); };
  const interval = window.setInterval(run, intervalMs);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tab, setTab] = useState<"open" | "archived">("open");
  const [pane, setPane] = useState<InboxPane>("list");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [takeoverBusy, setTakeoverBusy] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);

  const { reply, setReply, clearReply, hasDraft } = useReplyDrafts(selectedId);

  const token = session;
  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );
  const takeoverActive = selectedConversation?.mode === "takeover";
  const selectedEmail = normalizeContact(
    selectedConversation?.visitor_email ?? null
  );

  const threadRequestRef = useRef(0);
  const listRequestRef = useRef(0);
  const threadChannelRef = useRef<
    ReturnType<NonNullable<typeof supabase>["channel"]> | null
  >(null);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + unreadOf(conversation), 0),
    [conversations]
  );

  const counts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = conversations.filter((c) => !term || matchesQuery(c, term));
    return {
      open: visible.filter((c) => !isArchived(c)).length,
      archived: visible.filter((c) => isArchived(c)).length,
    };
  }, [conversations, query]);

  const visibleConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (isArchived(c) !== (tab === "archived")) return false;
      return !term || matchesQuery(c, term);
    });
  }, [conversations, query, tab]);

  useUnreadTitle(totalUnread);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied, selectedId]);

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
    return () => { active = false; };
  }, [session]);

  const request = useCallback(
    async (url: string, init: RequestInit = {}): Promise<Record<string, unknown>> => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      const response = await fetch(url, { ...init, headers, cache: "no-store" });
      const data: Record<string, unknown> = await response.json().catch(() => null);
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
      if (seq !== listRequestRef.current) return;
      const next =
        data && typeof data === "object" && "conversations" in data && Array.isArray(data.conversations)
          ? data.conversations.filter(isConversation)
          : [];
      setConversations(next);
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

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token || !conversationId) return;
      const seq = ++threadRequestRef.current;
      try {
        const data: unknown = await request(
          apiUrl(`/api/chat?admin=1&conversationId=${encodeURIComponent(conversationId)}`)
        );
        if (seq !== threadRequestRef.current) return;
        const record = data as { messages?: InboxMessage[]; visitor?: VisitorInfo };
        setMessages(record.messages ?? []);
        setVisitor(record.visitor ?? null);
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

  // Realtime list subscriptions
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
    return () => { void realtimeClient.removeChannel(channel); };
  }, [loadConversations, loadMessages, selectedId, token]);

  // Typing signal to visitor widget
  const selectedVisitorId = selectedConversation?.visitor_id ?? "";
  useEffect(() => {
    const realtimeClient = supabase;
    if (!authReady || !realtimeClient || !selectedVisitorId) {
      threadChannelRef.current = null;
      return;
    }
    const channel = realtimeClient.channel(`visitor-chat-${selectedVisitorId}`);
    threadChannelRef.current = channel;
    channel.on(
      "broadcast",
      { event: REALTIME_TYPING_EVENT },
      (payload) => {
        const data = payload.payload as { typing?: unknown } | undefined;
        if (!data || data.typing !== true) return;
        setVisitorTyping(true);
      }
    );
    void channel.subscribe();

    return () => {
      threadChannelRef.current = null;
      void realtimeClient.removeChannel(channel);
    };
  }, [authReady, selectedVisitorId]);

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
            conversation.id === selectedId
              ? { ...conversation, unread_count: 0 }
              : conversation
          )
        );
      })
      .catch(() => undefined);
  }, [authReady, messageCount, request, selectedId, selectedUnread, token]);

  const selectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setDeleteTarget(null);
    setPane("thread");
    setVisitorTyping(false);
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!token || !selectedId || !text || sending) return;
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
      await Promise.all([loadMessages(selectedId), loadConversations()]);
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not change takeover mode"
      );
    } finally {
      setTakeoverBusy(false);
    }
  };

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

  const searchRef = useRef<HTMLInputElement>(null);

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
            takeoverActive={takeoverActive}
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
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
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