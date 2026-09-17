import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { PROFILE } from "@/content/profile";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

const GREETING: ChatMessage = {
  role: "model",
  text: `hey, I'm ${PROFILE.goesBy}'s AI assistant -- ask me anything about their background, projects, or stack.`,
};

/**
 * Floating chat launcher, bottom-left (ScrollTopButton already owns
 * bottom-right). Talks to /api/chat, a Vercel serverless function
 * that holds the Gemini API key server-side -- this component never
 * touches the key directly.
 *
 * Local dev note: `vite dev` doesn't run /api routes. Use `vercel dev`
 * to test this locally, or just test it after deploying.
 */
export default function ChatWithIan() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Something went wrong -- try again.");
        return;
      }

      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch {
      setError("Couldn't reach the server -- check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send();
  };

  return (
    <>
      {/* ---------- Launcher ---------- */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Ian"
          className="fixed bottom-[25px] left-[25px] z-40 flex h-11 items-center gap-2 rounded-full px-4 text-sm shadow-lg transition-opacity hover:opacity-85"
          style={{ backgroundColor: "var(--ink)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
        >
          <MessageCircle size={16} strokeWidth={1.8} />
          chat with {PROFILE.goesBy.toLowerCase()}
        </button>
      )}

      {/* ---------- Panel ---------- */}
      {open && (
        <div
          className="card fixed bottom-[25px] left-[25px] z-40 flex w-[min(360px,calc(100vw-50px))] flex-col overflow-hidden"
          style={{ height: "min(520px, calc(100vh - 120px))" }}
          role="dialog"
          aria-label={`Chat with ${PROFILE.goesBy}`}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--gray-200)" }}
          >
            <p className="micro-label" style={{ color: "var(--ink)" }}>
              chat with {PROFILE.goesBy.toLowerCase()}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-6 w-6 items-center justify-center"
              style={{ color: "var(--gray-400)" }}
            >
              <X size={15} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed"
                  style={{
                    backgroundColor: m.role === "user" ? "var(--ink)" : "var(--gray-100)",
                    color: m.role === "user" ? "var(--bg)" : "var(--ink)",
                  }}
                >
                  {m.text}
                </p>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <p
                  className="micro-label rounded-xl px-3 py-2"
                  style={{ backgroundColor: "var(--gray-100)" }}
                >
                  thinking&hellip;
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs" style={{ color: "var(--gray-500)" }}>
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 p-3" style={{ borderTop: "1px solid var(--gray-200)" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about my projects, stack..."
              maxLength={600}
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--gray-100)", color: "var(--ink)" }}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
              style={{ backgroundColor: "var(--ink)", color: "var(--bg)" }}
            >
              <Send size={14} strokeWidth={1.8} />
            </button>
          </div>

          <p
            className="micro-label px-4 pb-3"
            style={{ color: "var(--gray-400)", fontSize: "9px" }}
          >
            AI-generated, based on facts {PROFILE.goesBy} provided -- not a live conversation with {PROFILE.goesBy}.
          </p>
        </div>
      )}
    </>
  );
}
