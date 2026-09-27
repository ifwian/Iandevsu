interface TypingIndicatorProps {
  /** Speaker name, e.g. "Ian". */
  name: string;
  /** Dark-theme-appropriate muted copy, e.g. "is typing". */
  trailing?: string;
  /** Read to assistive tech as a live region; keeps the bubble from being silent. */
  announce?: boolean;
}

/**
 * The "Ian is typing..." bubble.
 *
 * Lives in the message list rather than beside the composer, so it occupies the
 * same slot the incoming bubble is about to take. The height and padding are
 * fixed in `.chat-typing-bubble` to match a real message bubble -- if they
 * differ even slightly, the transcript jumps every time typing starts and
 * stops.
 */
export default function TypingIndicator({
  name,
  trailing = "is typing",
  announce = false,
}: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2" role={announce ? "status" : undefined} aria-live="polite">
      <span
        className="chat-typing-bubble"
        style={{ borderBottomLeftRadius: "0.3rem" }}
      >
        <span className="whitespace-nowrap">{`${name} ${trailing}...`}</span>
        <span aria-hidden="true">
          <span className="chat-typing-dot" />
          <span className="chat-typing-dot" />
          <span className="chat-typing-dot" />
        </span>
      </span>
    </div>
  );
}
