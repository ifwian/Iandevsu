import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { PROFILE } from "@/content/profile";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/api";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  id?: number;
  source?: "assistant" | "admin";
}

interface StreamEvent {
  type: "chunk" | "done" | "error";
  text?: string;
  reply?: string;
  error?: string;
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

const GREETING: ChatMessage = {
  role: "model",
  text: `Hey! I'm ${PROFILE.goesBy} - feel free to ask about my projects, the stack I work with, or anything else on the site.`,
};

/** Same asset the favicon uses (see index.html), so the browser reuses the
 *  cached copy instead of pulling a separate image for a 32px avatar. */
const ASSISTANT_AVATAR = "/images/anime.jpg";
const PRESENCE_COLOR = "#22c55e";

const VISITOR_STORAGE_KEY = "ian-chat-visitor-id";
const SESSION_STARTED_KEY = "ian-chat-session-started-at";
const START_NOTIFIED_KEY = "ian-chat-start-notified";
const HISTORY_PREFIX = "ian-chat-history:";

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

function readHistory(visitorId: string): ChatMessage[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${visitorId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isChatMessage)) return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      "messages" in parsed &&
      Array.isArray(parsed.messages) &&
      parsed.messages.every(isChatMessage)
    ) {
      return parsed.messages;
    }
  } catch {
    return null;
  }

  return null;
}

function saveHistory(visitorId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      `${HISTORY_PREFIX}${visitorId}`,
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        messages: messages.slice(-50),
      })
    );
  } catch {
    return;
  }
}

interface RemoteAdminMessage {
  id: number;
  body: string;
}

function isRemoteAdminMessage(value: unknown): value is RemoteAdminMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { id?: unknown; body?: unknown };
  return typeof candidate.id === "number" && typeof candidate.body === "string" && candidate.body.trim().length > 0;
}

function mergeAdminMessages(current: ChatMessage[], remote: RemoteAdminMessage[]): ChatMessage[] {
  const knownIds = new Set(current.map((message) => message.id).filter((id): id is number => typeof id === "number"));
  const knownText = new Set(current.filter((message) => message.source === "admin").map((message) => message.text));
  const additions = remote
    .filter((message) => !knownIds.has(message.id) && !knownText.has(message.body))
    .map((message) => ({ role: "model" as const, text: message.body, id: message.id, source: "admin" as const }));

  return additions.length ? [...current, ...additions] : current;
}

async function fetchAdminReplies(visitorId: string, accessToken?: string): Promise<RemoteAdminMessage[]> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl(`/api/chat?visitorId=${encodeURIComponent(visitorId)}&role=admin`), {
    cache: "no-store",
    headers,
  });
  if (!response.ok) return [];
  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== "object" || !("messages" in data) || !Array.isArray(data.messages)) return [];
  return data.messages.filter(isRemoteAdminMessage);
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
    const candidate = parsed as { type?: unknown; text?: unknown; reply?: unknown; error?: unknown };
    if (candidate.type !== "chunk" && candidate.type !== "done" && candidate.type !== "error") return null;
    return {
      type: candidate.type,
      text: typeof candidate.text === "string" ? candidate.text : undefined,
      reply: typeof candidate.reply === "string" ? candidate.reply : undefined,
      error: typeof candidate.error === "string" ? candidate.error : undefined,
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

async function notifyChatStarted(session: ChatSession): Promise<void> {
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
      }),
    });
    if (response.ok) sessionStorage.setItem(notificationKey, "1");
  } catch {
    return;
  }
}

export default function ChatWithIan({ variant = "floating" }: ChatWithIanProps) {
  const isSidebar = variant === "sidebar";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
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
      const storedMessages = readHistory(nextSession.visitorId);
      setSession(nextSession);
      if (storedMessages?.length) setMessages(storedMessages);
      setHistoryLoaded(true);
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

  useEffect(() => {
    const visitorId = session?.visitorId;
    if (!open || !visitorId) return;
    let active = true;

    const poll = async () => {
      try {
        const remoteMessages = await fetchAdminReplies(visitorId, session?.accessToken);
        if (active && remoteMessages.length) {
          setMessages((current) => mergeAdminMessages(current, remoteMessages));
        }
      } catch {
        return;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [open, session?.accessToken, session?.visitorId]);

  useEffect(() => {
    const visitorId = session?.visitorId;
    const realtimeClient = supabase;
    if (!open || !realtimeClient || !session?.accessToken || !visitorId) return;

    const channel = realtimeClient.channel(`visitor-chat-${visitorId}`);
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      (payload) => {
        const record = payload.new as Record<string, unknown>;
        if (record.role !== "admin" || typeof record.id !== "number" || typeof record.body !== "string") return;
        setMessages((current) => mergeAdminMessages(current, [{ id: record.id as number, body: record.body as string }]));
      }
    );
    void channel.subscribe();

    return () => {
      void realtimeClient.removeChannel(channel);
    };
  }, [open, session?.accessToken, session?.visitorId]);

  useEffect(() => {
    if (historyLoaded && session) saveHistory(session.visitorId, messages);
  }, [historyLoaded, messages, session]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleOpen = () => {
    setOpen(true);
    const activeSession = session || getChatSession();
    if (!session) setSession(activeSession);
    void notifyChatStarted(activeSession);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !session) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    const assistantIndex = nextMessages.length;
    setMessages([...nextMessages, { role: "model", text: "" }]);
    setInput("");
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const updateAssistant = (textValue: string) => {
      setMessages((current) => {
        const next = [...current];
        if (next[assistantIndex]?.role !== "model") return current;
        next[assistantIndex] = { role: "model", text: textValue };
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
          messages: nextMessages,
        }),
      });

      if (!response.ok) throw new Error(await responseError(response));

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedText = "";

        const processBlock = (block: string): StreamEvent | null => parseStreamBlock(block);

        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
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
            if (event.type === "done" && event.reply) {
              streamedText = event.reply;
              updateAssistant(streamedText);
            }
          }

          if (done) {
            if (buffer.trim()) {
              const event = processBlock(buffer);
              if (event?.type === "error") throw new Error(event.error || "Chat stream failed");
              if (event?.type === "done" && event.reply) {
                streamedText = event.reply;
                updateAssistant(streamedText);
              }
            }
            break;
          }
        }

        if (!streamedText.trim()) throw new Error("The assistant returned an empty response");
      } else {
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("reply" in data) || typeof data.reply !== "string") {
          throw new Error("The assistant returned an invalid response");
        }
        updateAssistant(data.reply);
      }
    } catch (caughtError) {
      if (controller.signal.aborted) return;
      setMessages((current) => {
        const next = [...current];
        if (next[assistantIndex]?.role === "model" && !next[assistantIndex].text) next.splice(assistantIndex, 1);
        return next;
      });
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong -- try again.");
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
              ? "card fixed bottom-4 left-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden lg:left-[21rem]"
              : "card fixed bottom-[25px] left-[25px] z-40 flex w-[min(360px,calc(100vw-50px))] flex-col overflow-hidden"
          }
          style={{
            height: isSidebar ? "min(520px, calc(100vh - 2rem))" : "min(520px, calc(100vh - 120px))",
          }}
          role="dialog"
          aria-label={`Chat with ${PROFILE.goesBy}`}
          aria-busy={loading}
        >
          <div
            className="flex items-center justify-between gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--gray-200)" }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
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
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PRESENCE_COLOR, border: "2px solid var(--bg)" }}
                />
              </span>
              <div className="min-w-0">
                <p className="micro-label truncate" style={{ color: "var(--ink)" }}>
                  chat with {PROFILE.goesBy.toLowerCase()}
                </p>
                <p
                  className="flex items-center gap-1 text-[9px] uppercase leading-tight tracking-[0.12em]"
                  style={{ color: "var(--gray-400)" }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: PRESENCE_COLOR }}
                  />
                  online · ai assistant
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center"
              style={{ color: "var(--gray-400)" }}
            >
              <X size={15} />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {messages.map((message, index) => {
              const isStreaming = loading && index === messages.length - 1 && message.role === "model";
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "model" && (
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
                  <p
                    className="max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed"
                    style={{
                      backgroundColor: message.role === "user" ? "var(--ink)" : "var(--gray-100)",
                      color: message.role === "user" ? "var(--bg)" : "var(--ink)",
                    }}
                  >
                    {message.source === "admin" && (
                      <span className="mr-1 text-[9px] uppercase tracking-[0.08em] opacity-60">you · </span>
                    )}
                    {message.text || (isStreaming ? "thinking…" : "")}
                    {isStreaming && message.text && <span className="ml-0.5 animate-pulse">▍</span>}
                  </p>
                </div>
              );
            })}

            {error && (
              <p className="text-xs" role="alert" style={{ color: "var(--gray-500)" }}>
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 p-3" style={{ borderTop: "1px solid var(--gray-200)" }}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about my projects, stack..."
              maxLength={600}
              disabled={loading || !session}
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
              style={{ backgroundColor: "var(--gray-100)", color: "var(--ink)" }}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim() || !session}
              aria-label="Send message"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
              style={{ backgroundColor: "var(--ink)", color: "var(--bg)" }}
            >
              <Send size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
