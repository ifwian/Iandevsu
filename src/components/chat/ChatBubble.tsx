import ChatText from "@/components/chat/ChatText";

interface ChatBubbleProps {
  sender: "visitor" | "assistant";
  /** The label above the bubble: "You" or the assistant's name. */
  name: string;
  /** A ready-to-show time like "11:46 AM". */
  time?: string;
  text: string;
  /** The reply is still arriving: show the caret. */
  streaming?: boolean;
  /** A follow-up from the same sender: no name or time above it. */
  grouped?: boolean;
}

/**
 * One message. The visitor's sits on the right with a soft fill; the assistant's
 * on the left with a hairline border. Monochrome, with the difference carried by
 * fill versus border, so it holds up in both themes. The assistant's text goes
 * through ChatText (bold, lists, links); the visitor's stays exactly as typed.
 */
export default function ChatBubble({ sender, name, time, text, streaming = false, grouped = false }: ChatBubbleProps) {
  return (
    <div className="chat-msg" data-sender={sender} data-grouped={grouped ? "true" : undefined}>
      {grouped ? null : (
        <p className="chat-msg-meta">
          <span className="chat-msg-name">{name}</span>
          {time ? <span className="chat-msg-time">{time}</span> : null}
        </p>
      )}
      <div className="chat-bubble">
        {sender === "assistant" ? (
          text ? (
            <ChatText text={text} caret={streaming} />
          ) : streaming ? (
            <span className="chat-bubble-wait">Typing...</span>
          ) : null
        ) : (
          <p className="chat-bubble-plain">{text}</p>
        )}
      </div>
    </div>
  );
}
