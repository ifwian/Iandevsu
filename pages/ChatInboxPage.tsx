import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, RefreshCw, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/api";

interface Conversation {
  id: string;
  visitor_id: string;
  session_started_at: string;
  status: string;
  last_message_at: string;
  last_message_preview: string;
  /** Optional contact details -- null on conversations predating the pre-chat form. */
  visitor_name: string | null;
  visitor_email: string | null;
}

interface InboxMessage {
  id: string | number;
  conversation_id: string;
  role: "visitor" | "assistant" | "admin";
  body: string;
  created_at: string;
}

const SESSION_STORAGE_KEY = "ian-chat-admin-session";

/**
 * chat_messages.id is a Postgres `bigint`, which PostgREST may hand back as
 * either a JSON number or a string. Requiring a number caused the whole
 * transcript to be filtered out and rendered as "No messages in this
 * conversation", so accept either shape.
 */
function isRowId(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

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

/** Absent, null, or a string -- the contact columns are optional. */
function isOptionalText(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function normalizeContact(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isConversation(value: unknown): value is Conversation {
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

/** Best label for a visitor: their name, else a trimmed id. */
function visitorLabel(conversation: Conversation): string {
  return normalizeContact(conversation.visitor_name) || `anonymous · ${conversation.visitor_id.slice(0, 8)}`;
}

function isInboxMessage(value: unknown): value is InboxMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isRowId(candidate.id) &&
    typeof candidate.conversation_id === "string" &&
    (candidate.role === "visitor" || candidate.role === "assistant" || candidate.role === "admin") &&
    typeof candidate.body === "string" &&
    typeof candidate.created_at === "string"
  );
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

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function roleLabel(role: InboxMessage["role"]): string {
  if (role === "visitor") return "visitor";
  if (role === "admin") return "you";
  return "assistant";
}

export default function ChatInboxPage() {
  const [session, setSession] = useState(getStoredSession);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authReady, setAuthReady] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = session;

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

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );

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
      const data: unknown = await request(apiUrl("/api/chat?admin=1"));
      const next = data && typeof data === "object" && "conversations" in data && Array.isArray(data.conversations)
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
  }, [request, token]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token || !conversationId) return;
      try {
        const data: unknown = await request(apiUrl(`/api/chat?admin=1&conversationId=${encodeURIComponent(conversationId)}`));
        const next = data && typeof data === "object" && "messages" in data && Array.isArray(data.messages)
          ? data.messages.filter(isInboxMessage)
          : [];
        setMessages(next);
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

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8" style={{ fontFamily: "var(--font-mono)" }}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--gray-200)] pb-5">
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
            <button
              type="button"
              onClick={disconnect}
              className="rounded-full border border-[var(--gray-300)] px-3 py-2 text-xs text-[var(--gray-500)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              disconnect
            </button>
          )}
        </header>

        {!authReady ? (
          <section className="card mx-auto max-w-lg p-6 text-center text-sm text-[var(--gray-500)]">
            Restoring admin session...
          </section>
        ) : !token ? (
          <section className="card mx-auto max-w-lg p-6">
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
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--gray-400)]">
              Set <code>CHAT_ADMIN_PASSWORD</code> on the server. Sessions last 12 hours and are kept
              in this tab only, so closing the browser signs you out.
            </p>
            {error && <p className="mt-3 text-xs text-red-500" role="alert">{error}</p>}
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="card min-h-[540px] p-4">
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
              <div className="space-y-2">
                {conversations.length === 0 && !loading && (
                  <p className="py-8 text-center text-xs text-[var(--gray-500)]">No conversations yet.</p>
                )}
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedId === conversation.id
                        ? "border-[var(--ink)] bg-[var(--gray-100)]"
                        : "border-[var(--gray-200)] hover:border-[var(--gray-400)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">{visitorLabel(conversation)}</span>
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.08em] text-[var(--gray-500)]">
                        {conversation.status}
                      </span>
                    </div>
                    {normalizeContact(conversation.visitor_email) && (
                      <p className="mt-1 truncate text-[10px] text-[var(--gray-500)]">
                        {normalizeContact(conversation.visitor_email)}
                      </p>
                    )}
                    <p className="mt-2 truncate text-xs text-[var(--gray-500)]">{conversation.last_message_preview || "No messages yet"}</p>
                    <p className="mt-2 text-[9px] text-[var(--gray-400)]">{formatTime(conversation.last_message_at)}</p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="card flex min-h-[540px] min-w-0 flex-col p-5">
              {!selectedConversation ? (
                <div className="flex flex-1 items-center justify-center text-sm text-[var(--gray-500)]">Select a visitor to read the conversation.</div>
              ) : (
                <>
                  <div className="border-b border-[var(--gray-200)] pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold">
                          {normalizeContact(selectedConversation.visitor_name) || "anonymous visitor"}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--gray-500)]">
                          {selectedConversation.visitor_email ? (
                            <a
                              href={`mailto:${selectedConversation.visitor_email}`}
                              className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--ink)]"
                            >
                              {selectedConversation.visitor_email}
                            </a>
                          ) : (
                            <span className="italic opacity-70">no email given</span>
                          )}
                          <span className="break-all opacity-70">{selectedConversation.visitor_id}</span>
                        </div>
                      </div>
                      <span className="rounded-full border border-[var(--gray-300)] px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-[var(--gray-500)]">
                        started {formatTime(selectedConversation.session_started_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto py-5" aria-live="polite">
                    {messages.length === 0 && <p className="text-xs text-[var(--gray-500)]">No messages in this conversation.</p>}
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.role === "visitor" ? "justify-start" : "justify-end"}`}>
                        <div className="max-w-[85%]">
                          <p className="mb-1 text-[9px] uppercase tracking-[0.08em] text-[var(--gray-500)]">{roleLabel(message.role)}</p>
                          <p
                            className="whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed"
                            style={{
                              backgroundColor: message.role === "admin" ? "var(--ink)" : "var(--gray-100)",
                              color: message.role === "admin" ? "var(--bg)" : "var(--ink)",
                            }}
                          >
                            {message.body}
                          </p>
                          <p className="mt-1 text-right text-[9px] text-[var(--gray-400)]">{formatTime(message.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[var(--gray-200)] pt-4">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={600}
                      placeholder="Reply to this visitor..."
                      className="min-h-20 w-full resize-y rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[10px] text-[var(--gray-500)]">Replies appear in the visitor&apos;s chat window.</span>
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
              {error && <p className="mt-3 text-xs text-red-500" role="alert">{error}</p>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
