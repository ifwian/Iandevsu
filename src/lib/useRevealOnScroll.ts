import { useLayoutEffect } from "react";

/**
 * Arms the scroll-entrance stagger used by every section below the hero.
 *
 * The hero's blocks animate once on load (`.enter` in theme.css). Sections
 * further down need the same beat to happen when they are actually looked at,
 * so this hook marks <html> with `reveal-ready` and hands every
 * `[data-reveal-group]` to an IntersectionObserver, which adds `is-revealed`
 * the first time the group scrolls into view. The CSS for both states lives
 * next to `.enter` in theme.css.
 *
 * The `reveal-ready` gate is the whole safety story: the hidden state only
 * exists while that class is on <html>, and this hook only adds it when the
 * visitor allows motion and the browser has an IntersectionObserver. Without
 * either, the effect simply does not arm and the page renders exactly as it
 * did before -- nothing is ever hidden by default.
 *
 * `useLayoutEffect`, not `useEffect`: the class has to land before the
 * browser paints the page. A passive effect would paint one fully visible
 * frame and then snap the below-the-fold sections into their hidden state,
 * which reads as a flash.
 *
 * Cleanup disarms both (class off, observer disconnected), so leaving a route
 * cannot leave a half-revealed state for a page this hook does not run on, and
 * coming back re-arms from a clean slate.
 */
export function useRevealOnScroll() {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    root.classList.add("reveal-ready");

    const groups = document.querySelectorAll<HTMLElement>("[data-reveal-group]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          // One-shot: a section that has entered stays entered, so scrolling
          // back up does not replay the stagger on every pass.
          observer.unobserve(entry.target);
        }
      },
      // A little past the fold (`-60px`) and 8% of the body's own height:
      // the group is already meaningfully on screen before it starts, so the
      // motion lands where the reader is looking instead of at the edge.
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" }
    );

    groups.forEach((group) => observer.observe(group));

    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);
}
