import { forwardRef, useLayoutEffect, useRef, type KeyboardEvent } from "react";

interface ChatTextareaProps {
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter (not Shift+Enter, and not while an IME is composing). */
  onSend: () => void;
  maxLength: number;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
}

/**
 * The message box.
 *
 * A single-line `<input>` cannot show a message longer than the box is wide, and
 * stops accepting text at its limit without saying so. This grows with what is
 * typed (up to about five lines, then scrolls), sends on Enter, breaks the line on
 * Shift+Enter, and counts down once the visitor gets within 20% of the limit.
 *
 * It is deliberately NOT disabled while a reply is streaming: a disabled field
 * loses focus, so the visitor had to click back into it after every message.
 * Typing ahead is fine; `send()` itself already refuses while a reply is loading.
 */
const ChatTextarea = forwardRef<HTMLTextAreaElement, ChatTextareaProps>(function ChatTextarea(
  { value, onChange, onSend, maxLength, placeholder, disabled = false, ariaLabel },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  // Grow to fit. CSS `max-height` caps it; past that the box scrolls.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSend();
    }
  };

  const left = maxLength - value.length;
  const showCounter = value.length >= Math.floor(maxLength * 0.8);

  return (
    <div className="chat-field">
      <textarea
        ref={setRefs}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        enterKeyHint="send"
        autoComplete="off"
        className="chat-field-input chat-input"
      />
      {showCounter ? (
        <span className="chat-counter" data-low={left <= 20 ? "true" : undefined} aria-hidden="true">
          {left}
        </span>
      ) : null}
    </div>
  );
});

export default ChatTextarea;
