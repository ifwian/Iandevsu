import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, RefreshCw, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface Conversation {
  id: string;
  visitor_id: string;
  session_started_at: string;
  status: string;
  last_message_at: string;
  last_message_preview: string;
}

interface InboxMessage {
  id: number;
  conversation_id: string;
  role: "visitor" | "assistant" | "admin";
  body: string;
  created_at: string;
}

const TOKEN_STORAGE_KEY = "ian-chat-admin-token";

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.visitor_id === "string" &&
    typeof candidate.session_started_at === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.last_message_at === "string" &&
    typeof candidate.last_message_preview === "string"
  );
}

function isInboxMessage(value: unknown): value is InboxMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.conversation_id === "string" &&
    (candidate.role === "visitor" || candidate.role === "assistant" || candidate.role === "admin") &&
    typeof candidate.body === "string" &&
    typeof candidate.created_at === "string"
  );
}

function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
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
  const [token, setToken] = useState(getStoredToken);
  const [tokenDraft, setTokenDraft] = useState(token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session) return;
      setToken(data.session.access_token);
      setTokenDraft("");
      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.session.access_token);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        setToken("");
        setConversations([]);
        setSelectedId("");
        return;
      }
      if (session) {
        setToken(session.access_token);
        setTokenDraft("");
        sessionStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Request failed";
        throw new Error(message);
      }
      return data;
    },
    [token]
  );

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data: unknown = await request("/api/chat?admin=1");
      const next = data && typeof data === "object" && "conversations" in data && Array.isArray(data.conversations)
        ? data.conversations.filter(isConversation)
        : [];
      setConversations(next);
      setSelectedId((current) => current || next[0]?.id || "");
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load conversations");
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token || !conversationId) return;
      try {
        const data: unknown = await request(`/api/chat?admin=1&conversationId=${encodeURIComponent(conversationId)}`);
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
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => void loadConversations(), 3000);
    return () => window.clearInterval(interval);
  }, [loadConversations, token]);

  useEffect(() => {
    if (!token || !selectedId) return;
    const interval = window.setInterval(() => void loadMessages(selectedId), 2000);
    return () => window.clearInterval(interval);
  }, [loadMessages, selectedId, token]);

  useEffect(() => {
    const realtimeClient = supabase;
    if (!realtimeClient || !token) return;
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

  const connect = () => {
    const nextToken = tokenDraft.trim();
    if (!nextToken) return;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setError(null);
  };

  const signIn = async () => {
    if (!supabase || !email.trim() || !password) return;
    setAuthBusy(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.session) throw new Error(signInError?.message || "Supabase sign-in failed");
      setToken(data.session.access_token);
      setTokenDraft("");
      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.session.access_token);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Supabase sign-in failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const disconnect = () => {
    if (supabase) void supabase.auth.signOut();
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setTokenDraft("");
    setConversations([]);
    setSelectedId("");
    setMessages([]);
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!token || !selectedId || !text || sending) return;
    setSending(true);
    try {
      await request("/api/chat", {
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

        {!token ? (
          <section className="card mx-auto max-w-lg p-6">
            <div className="mb-4 flex items-center gap-3">
              <MessageCircle size={20} />
              <div>
                <h2 className="text-base font-semibold">Admin access</h2>
                <p className="text-xs text-[var(--gray-500)]">Enter the server-side inbox token.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") connect();
                }}
                placeholder="CHAT_ADMIN_TOKEN"
                className="min-w-0 flex-1 rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
              />
              <button
                type="button"
                onClick={connect}
                className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm text-[var(--bg)] transition-opacity hover:opacity-80"
              >
                connect
              </button>
            </div>
            {supabase && (
              <div className="mt-5 border-t border-[var(--gray-200)] pt-5">
                <p className="mb-3 text-xs text-[var(--gray-500)]">Supabase admin login enables Realtime updates.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin email"
                    className="min-w-0 flex-1 rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void signIn();
                    }}
                    placeholder="password"
                    className="min-w-0 flex-1 rounded-lg border border-[var(--gray-300)] bg-[var(--gray-50)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
                  />
                  <button
                    type="button"
                    onClick={() => void signIn()}
                    disabled={authBusy}
                    className="rounded-lg border border-[var(--ink)] px-4 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
                  >
                    {authBusy ? "signing in..." : "sign in"}
                  </button>
                </div>
              </div>
            )}
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
                      <span className="truncate text-xs font-semibold">{conversation.visitor_id}</span>
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.08em] text-[var(--gray-500)]">
                        {conversation.status}
                      </span>
                    </div>
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
                      <div>
                        <h2 className="text-sm font-semibold">visitor session</h2>
                        <p className="mt-1 break-all text-[10px] text-[var(--gray-500)]">{selectedConversation.visitor_id}</p>
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
