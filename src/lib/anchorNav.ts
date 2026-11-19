/**
 * In-page anchor navigation shared by the sidebar, the mobile menu and the
 * hero's "view projects" link.
 *
 * One behaviour everywhere: smooth-scroll to the section and show it. The
 * target is marked as revealed *before* the scroll starts, so it is never
 * hidden waiting for an entrance animation while the visitor lands on it. (An
 * earlier version held the target hidden until the scroll settled and then
 * played it in from the top -- the visitor waited on the animation.)
 *
 * Where the section is not on the current page (the /projects route has no
 * #stack, say) the navigation goes to the home route with that hash instead;
 * App's ScrollToTop then scrolls to it once the page has rendered.
 */

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function goToSection(hash: string): void {
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);

  if (!el) {
    window.history.pushState(null, "", `/#${id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    return;
  }

  el.classList.add("in-view");
  el.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((g) => g.classList.add("is-revealed"));

  if (window.history.replaceState) {
    window.history.replaceState(null, "", id === "home" ? window.location.pathname : `#${id}`);
  }
  el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
}

/** onClick helper for `<a href="#id">`: lets modified clicks through. */
export function anchorClick(
  event: { preventDefault(): void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number },
  hash: string
) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  goToSection(hash);
}
