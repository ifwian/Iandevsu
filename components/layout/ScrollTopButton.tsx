"use client";

import { useEffect, useState } from "react";

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-[25px] right-[25px] z-40 flex h-11 w-11 items-center justify-center rounded-full text-lg shadow-lg transition-opacity hover:opacity-80"
      style={{ backgroundColor: "var(--ink)", color: "var(--bg)" }}
    >
      &uarr;
    </button>
  );
}
