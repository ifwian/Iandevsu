interface ChatNoticeProps {
  message: string;
  onDismiss?: () => void;
}

/**
 * An error or notice inside the conversation.
 *
 * Errors used to be 12px gray text at the bottom of the thread, the same weight
 * as a timestamp, so a failed message looked like nothing had happened. This is a
 * bordered box with a mark, and it can be dismissed. Monochrome on purpose: the
 * site has no accent colour, so it gets weight from the border and the "!" mark,
 * not from red.
 */
export default function ChatNotice({ message, onDismiss }: ChatNoticeProps) {
  return (
    <div className="chat-notice" role="alert">
      <span className="chat-notice-mark" aria-hidden="true">
        !
      </span>
      <span className="chat-notice-text">{message}</span>
      {onDismiss ? (
        <button type="button" className="chat-notice-dismiss" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      ) : null}
    </div>
  );
}
