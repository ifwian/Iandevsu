import { useEffect, useRef, type ReactNode } from "react";
import ChatText from "@/components/chat/ChatText";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatClock, formatDayMonth, formatFull, shouldGroupMessage } from "@/lib/chatFormat";
import { roleLabel, type InboxMessage } from "@/components/inbox/types";

interface TranscriptProps {
  conversationId: string;
  messages: InboxMessage[];
  visitorName: string;
  visitorTyping: boolean;
}

/** "today" / "yesterday" / "Sep 27" -- the separator above a new day's messages. */
function dayLabel(date: Date, now = new Date()): string {
  const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return formatDayMonth(date);
}

/**
 * The transcript: date separators, then messages grouped the way a chat client
 * groups them -- consecutive messages from the same speaker in the same burst
 * share one meta line instead of printing the name and time three times.
 *
 * Three registers, carried by fill rather than colour. The visitor is a hairline
 * box on the page; Ian is a soft fill, because it is still the visitor's side of
 * the conversation; the admin is ink with the page knocked out of it, the
 * system's one emphasis move and the only thing here that says "this one is
 * mine". System notices are neither -- they are centred, in the muted text, with
 * no bubble at all.
 */
export default function Transcript({ conversationId, messages, visitorName, visitorTyping }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  /**
   * Whether the view was at the bottom when the last message arrived.
   *
   * Without it, a new message would yank the transcript down while the admin was
   * reading something earlier -- and with a 2s poll, "a new message" happens
   * often enough that this is the difference between reading and chasing.
   */
  const stickRef = useRef(true);

  // A different conversation always starts at the bottom, wherever the previous
  // one was left.
  useEffect(() => {
    stickRef.current = true;
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [conversationId]);

  const count = messages.length;
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !stickRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [count, visitorTyping]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  };

  const nodes: ReactNode[] = [];
  let currentDay = "";
  let previous: { sender: string; at: number } | null = null;

  for (const message of messages) {
    const at = new Date(message.created_at);
    const day = dayLabel(at);
    if (day !== currentDay) {
      nodes.push(
        <p className="inbox-day" key={`day-${day}-${message.id}`}>
          {day}
        </p>
      );
      currentDay = day;
      // A new day always prints the meta line, even mid-burst.
      previous = null;
    }

    if (message.role === "system") {
      nodes.push(
        <p className="inbox-notice" key={message.id}>
          {message.body}
        </p>
      );
      continue;
    }

    const meta = { sender: message.role, at: at.getTime() };
    const grouped = shouldGroupMessage(previous, meta);
    previous = meta;
    const side = message.role === "admin" ? "out" : "in";

    nodes.push(
      <div
        className="inbox-msg"
        key={message.id}
        data-side={side}
        data-role={message.role}
        data-grouped={grouped ? "true" : undefined}
      >
        {grouped ? null : (
          <p className="inbox-msg-meta">
            <span>{roleLabel(message.role)}</span>
            <span title={formatFull(at)}>{formatClock(at)}</span>
          </p>
        )}
        <div className="inbox-bubble">
          {message.role === "assistant" ? (
            <ChatText text={message.body} />
          ) : (
            <p className="inbox-bubble-text">{message.body}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea
      ref={scrollRef}
      className="inbox-transcript"
      onScroll={onScroll}
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Messages"
    >
      {nodes}
      {visitorTyping ? (
        <p className="inbox-notice" role="status">
          {visitorName} is typing...
        </p>
      ) : null}
    </ScrollArea>
  );
}
