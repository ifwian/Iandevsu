import { useEffect, useRef } from "react";

interface InboxShortcuts {
  /** `j`: the next conversation in the list. */
  onNext: () => void;
  /** `k`: the previous conversation. */
  onPrev: () => void;
  /** `/`: jump to the search box. */
  onSearch: () => void;
  enabled?: boolean;
}

/** True when a key press is going into a text field, where letters must be left alone. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

/**
 * Keyboard shortcuts for the inbox: j / k to move through conversations, / to
 * search. Ignored while typing in any field and whenever Ctrl, Cmd or Alt is held,
 * so they never fight the reply box or the browser's own shortcuts.
 */
export function useInboxShortcuts({ onNext, onPrev, onSearch, enabled = true }: InboxShortcuts) {
  const handlers = useRef({ onNext, onPrev, onSearch });
  handlers.current = { onNext, onPrev, onSearch };

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (isTyping(event.target)) return;

      if (event.key === "j") {
        event.preventDefault();
        handlers.current.onNext();
      } else if (event.key === "k") {
        event.preventDefault();
        handlers.current.onPrev();
      } else if (event.key === "/") {
        event.preventDefault();
        handlers.current.onSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
