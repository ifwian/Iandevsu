import { useEffect } from "react";

/**
 * Feeds the card spotlight (neutral radial highlight that follows the pointer,
 * styled in monochrome.css). One delegated listener for the whole page: it
 * writes --mx / --my, in px relative to the card, onto whichever `.card` or
 * `.project-card` the pointer is over. Mouse and pen only; touch has no hover.
 */
export function useSpotlight() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const card = (event.target as Element | null)?.closest<HTMLElement>(".card, .project-card");
      if (!card) return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${clientX - rect.left}px`);
        card.style.setProperty("--my", `${clientY - rect.top}px`);
      });
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}
