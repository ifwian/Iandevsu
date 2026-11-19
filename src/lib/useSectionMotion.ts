import { useLayoutEffect } from "react";
import { isRevealHeld } from "./anchorNav";

/**
 * Section-by-section entrance motion (styles: src/styles/motion.css).
 *
 * Each `section[id]` below the hero gets `in-view` the first time it scrolls
 * into view. CSS then fades/lifts its header bar and its cards in a short
 * stagger. The hook also numbers the animated elements (`--i`) so the stagger
 * follows page order.
 *
 * Safety, same rules as useRevealOnScroll: nothing is hidden unless this hook
 * armed `motion-ready` on <html>, which it only does when the visitor allows
 * motion and IntersectionObserver exists. Cleanup disarms everything.
 * (No timed failsafe on purpose: it would reveal unseen sections off-screen
 * and cost them their entrance. An observer always reports its targets once.)
 */
const ANIMATED = ".section-shell-bar, .section-shell-body .card, .section-shell-body .project-card";

export function useSectionMotion() {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]")).filter(
      (s) => s.id !== "home"
    );
    if (!sections.length) return;

    for (const section of sections) {
      section.querySelectorAll<HTMLElement>(ANIMATED).forEach((el, i) => {
        el.style.setProperty("--i", String(Math.min(i, 8)));
      });
    }

    root.classList.add("motion-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          // An anchor scroll is travelling to this section: anchorNav releases
          // it once it has landed, so it animates in from the top.
          if (isRevealHeld((entry.target as HTMLElement).id)) continue;
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    sections.forEach((s) => observer.observe(s));

    return () => {
      observer.disconnect();
      root.classList.remove("motion-ready");
      sections.forEach((s) => s.classList.remove("in-view"));
    };
  }, []);
}
