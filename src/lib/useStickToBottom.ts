import { useCallback, useEffect, useRef, useState } from "react";

/** Within this many px of the bottom counts as "reading the latest message". */
const PINNED_THRESHOLD = 80;

/**
 * Keeps a scrolling transcript at the bottom, but only while the reader is there.
 *
 * The widget used to smooth-scroll to the bottom on every change, including every
 * streamed token, which dragged anyone reading an earlier message back down
 * mid-sentence. Now: if the reader is at (or near) the bottom, new content keeps
 * them there; if they have scrolled up, they stay where they are and `showJump`
 * turns true so the UI can offer a "new messages" button.
 *
 * `deps` are what should trigger a check (the messages, the loading flag...).
 * `streaming` switches off smooth scrolling while tokens arrive, because dozens of
 * overlapping smooth scrolls a second look like jitter.
 *
 * Call `scrollToBottom()` when the visitor sends a message: their own message
 * should always bring them to the bottom.
 */
export function useStickToBottom<T extends HTMLElement = HTMLDivElement>(
  deps: readonly unknown[],
  { streaming = false }: { streaming?: boolean } = {},
) {
  const ref = useRef<T | null>(null);
  const pinned = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const el = ref.current;
      if (!el) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduced && !streaming ? "smooth" : "auto" });
      pinned.current = true;
      setShowJump(false);
    },
    [streaming],
  );

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight <= PINNED_THRESHOLD;
    if (pinned.current) setShowJump(false);
  }, []);

  useEffect(() => {
    if (pinned.current) scrollToBottom();
    else setShowJump(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, onScroll, showJump, scrollToBottom };
}
