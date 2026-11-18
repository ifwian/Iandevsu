interface ChatNoticeProps {
  message: string;
  onDismiss?: () => void;
  /** An optional button for the one thing the visitor can do about it, e.g. "Try again". */
  action?: { label: string; onClick: () => void };
}

/**
 * An error or notice inside the conversation.
 *
 * Errors used to be 12px gray text at the bottom of the thread, the same weight
 * as a timestamp, so a failed message looked like nothing had happened. This is a
 * bordered box with a mark, it can be dismissed, and it can carry one action
 * button. Monochrome on purpose: the site has no accent colour, so it gets weight
 * from the border and the "!" mark, not from red.
 */
export default function ChatNotice({ message, onDismiss, action }: ChatNoticeProps) {
  return (
    <div className="chat-notice" role="alert">
      <span className="chat-notice-mark" aria-hidden="true">
        !
      </span>
      <span className="chat-notice-text">{message}</span>
      {action ? (
        <button type="button" className="chat-notice-action" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
      {onDismiss ? (
        <button type="button" className="chat-notice-dismiss" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      ) : null}
    </div>
  );
}
