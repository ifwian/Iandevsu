import { useEffect, useRef } from "react";
import ChatText from "@/components/chat/ChatText";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatClock, formatDayMonth, formatFull, shouldGroupMessage } from "@/lib/chatFormat";
import { roleLabel } from "@/components/inbox/types";
import type { ReactNode } from "react";

interface TranscriptMessage {
  role: "visitor" | "assistant" | "admin" | "system";
  created_at: string;
  body: string;
}

interface TranscriptProps {
  conversationId: string;
  messages: TranscriptMessage[];
  visitorName: string;
  visitorTyping: boolean;
  takeoverActive?: boolean;
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
 * Three registers, carried by fill vs border:
 *   Visitor (left): hairline box, bg var(--bg)
 *   Assistant (right): soft fill, bg var(--gray-100)
 *   Admin (right): ink fill, bg var(--bg) with ink text
 *   System: centred notice, no bubble
 *
 * Avatar: right-side messages get an avatar pill at the end;
 * left-side messages can optionally show an avatar at the start.
 */
export default function Transcript({ conversationId, messages, visitorName, visitorTyping, takeoverActive }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

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
  let takeoverShown = useRef(false);

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const { role, created_at, body } = message;
    const at = new Date(created_at);
    const day = dayLabel(at);
    const avatarSrc = role !== "visitor" ? "/images/anime-avatar-64.webp" : null;

    if (day !== currentDay) {
      nodes.push(
        <p className="inbox-day" key={`day-${day}-${i}`}>
          {day}
        </p>
      );
      currentDay = day;
      previous = null;
    }

    if (role === "system") {
      nodes.push(
        <p className="inbox-notice" key={i}>
          {body}
        </p>
      );
      if (takeoverActive && !takeoverShown.current) {
        takeoverShown.current = true;
        nodes.push(
          <p className="inbox-notice" key="takeover-announcement">
            Ian has joined the chat
          </p>
        );
      }
      continue;
    }

    const meta = { sender: role, at: at.getTime() };
    const grouped = shouldGroupMessage(previous, meta);
    previous = meta;
    const side = role === "visitor" ? "in" : "out";

    nodes.push(
      <div
        className="inbox-msg"
        key={i}
        data-side={side}
        data-role={role}
        data-grouped={grouped ? "true" : undefined}
      >
        {grouped ? null : (
          <p className="inbox-msg-meta">
            <span>{roleLabel(role)}</span>
            <span title={formatFull(at)}>{formatClock(at)}</span>
          </p>
        )}
        <div className="inbox-bubble">
          {role === "assistant" ? (
            <ChatText text={body} />
          ) : (
            <p className="inbox-bubble-text">{body}</p>
          )}
          {/* Avatar: appears at end of right-side messages, start of left-side messages */}
          {side === "out" ? (
            <span className="inbox-avatar" aria-hidden="true" />
          ) : side === "in" && avatarSrc ? (
            <img
              className="inbox-avatar"
              src={avatarSrc}
              alt={role}
            />
          ) : null}
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