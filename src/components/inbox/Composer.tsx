import { useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  /** No conversation is open, so there is nothing to reply to. */
  disabled: boolean;
  /** Sent with the reply, so the visitor sees "Ian is typing" while it is written. */
  onTyping: () => void;
}

/**
 * The reply box.
 *
 * It grows with its content instead of scrolling inside itself: a fixed `rows`
 * with a `max-height` made a third line of reply open a scrollbar of the box's
 * own, inside the transcript's scrollbar, and the wheel then went to whichever
 * the pointer happened to be over. `height: auto` first and then
 * `scrollHeight`, so a deleted line shrinks the box again -- measuring without
 * the reset only ever grows it.
 */
export default function Composer({ value, onChange, onSend, sending, disabled, onTyping }: ComposerProps) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = fieldRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  const canSend = !disabled && !sending && value.trim().length > 0;

  return (
    <div className="inbox-composer">
      <div className="inbox-composer-row">
        <Textarea
          ref={fieldRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={disabled ? "Select a conversation to reply" : "Reply to this visitor..."}
          aria-label="Reply to this visitor"
          onChange={(event) => {
            onChange(event.target.value);
            onTyping();
          }}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter breaks the line -- what every chat box
            // this size does, and the hint below says so.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
        <Button
          onClick={onSend}
          disabled={!canSend}
          icon={<Send size={14} />}
          aria-label="Send reply"
        >
          {sending ? "sending" : "send"}
        </Button>
      </div>
      <div className="inbox-composer-foot">
        <span>enter sends · shift+enter for a new line</span>
      </div>
    </div>
  );
}
