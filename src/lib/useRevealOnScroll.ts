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
 * visitor allows motion, the browser has an IntersectionObserver, and the
 * browser cannot bind the entrance to the scrollbar itself (in which case
 * theme.css animates it and this hook stays out of the way). Without all three,
 * the effect simply does not arm and the page renders exactly as it
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

    /* Where the browser can bind the entrance to the scrollbar, it does the
       job better than an observer can (see the `@supports` block next to
       these rules in theme.css). Standing down here rather than arming
       anyway: the hidden state exists to keep below-the-fold sections out of
       the first paint, and the animation's own fill does that already -- two
       mechanisms writing the same opacity would only be a chance for them to
       disagree. The test is on `animation-range` as well as the timeline,
       because it is the range names that make the motion short enough to be
       an entrance; without them the animation would span several screens. */
    if (
      window.CSS?.supports?.("animation-timeline: view()") &&
      window.CSS.supports("animation-range", "cover 0px cover 240px")
    ) {
      return;
    }

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
      // Fire as the group's top edge crosses into the bottom eighth of the
      // viewport, not 60px after it has already done so. With the 0.55s
      // transition (plus the CSS ladder) starting there, the last child has
      // settled by roughly the time the group's top reaches mid-screen, so the
      // motion is something the reader catches out of the corner of the eye
      // ahead of them rather than something still running underneath them.
      // `threshold: 0` also means the trigger is the group's own edge rather
      // than a fraction of its height, which is what made a tall section wait
      // longer than a short one to start.
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );

    groups.forEach((group) => observer.observe(group));

    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);
}
