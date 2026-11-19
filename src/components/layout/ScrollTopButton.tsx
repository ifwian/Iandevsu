"use client";

import { useEffect, useState } from "react";

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    // Passive, so the handler can never sit between the wheel/trackpad and the
    // next painted frame: nothing here calls `preventDefault`, and without the
    // flag the browser has to assume it might.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
      data-dos-avoid
      /* Stacked above the chat launcher (h-12 at bottom 1rem / 1.5rem) and right-aligned
         with it, so the two never overlap. Keep these offsets in step with ChatWithIan. */
      className="scroll-top"
    >
      &uarr;
    </button>
  );
}
