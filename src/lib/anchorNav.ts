/**
 * In-page anchor navigation shared by the sidebar, the mobile menu and the
 * hero's "view projects" link.
 *
 * Why not a plain `#id` link: the entrance animations are armed by
 * IntersectionObservers, and during a smooth scroll the target section first
 * crosses the viewport from the BOTTOM, so its entrance played while it was
 * still scrolling in and was over by the time it landed. Here the target's
 * entrance is held back while the page is travelling, then released once the
 * section sits at the top of the screen, so it animates in from the top
 * (header bar first, then cards in page order).
 */

let heldId: string | null = null;

/** True while `sectionId` is the target of an in-flight anchor scroll. */
export function isRevealHeld(sectionId: string | null | undefined): boolean {
  return heldId !== null && sectionId === heldId;
}

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function release(el: HTMLElement) {
  heldId = null;
  el.classList.add("in-view");
  el.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((g) => g.classList.add("is-revealed"));
}

export function goToSection(hash: string, opts: { replay?: boolean } = {}): void {
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);
  if (!el) return;

  const top = id === "home";
  if (history.replaceState) history.replaceState(null, "", top ? window.location.pathname : `#${id}`);

  if (reduced()) {
    el.scrollIntoView({ behavior: "auto", block: "start" });
    return;
  }

  // `replay` (the hero's "view projects"): the section may already be showing
  // at the foot of the first screen, revealed from the bottom. Put it back to
  // its hidden state so it can play again from the top once it has landed.
  if (opts.replay && !top) {
    el.classList.remove("in-view");
    el.querySelectorAll("[data-reveal-group]").forEach((g) => g.classList.remove("is-revealed"));
  }
  // Hold sections that have not been revealed yet (or are being replayed).
  const needsReveal = !top && !el.classList.contains("in-view");
  if (needsReveal) heldId = id;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!needsReveal) return;

  let done = false;
  let timer = 0;
  const finish = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", finish);
    window.removeEventListener("wheel", finish);
    window.removeEventListener("touchstart", finish);
    release(el);
  };
  // `scrollend` where it exists; otherwise "no scroll event for 120ms". The
  // hard cap guarantees the section is never left hidden.
  const onScroll = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(finish, 120);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", finish, { once: true });
  // A visitor grabbing the page mid-scroll cancels the hold too.
  window.addEventListener("wheel", finish, { once: true, passive: true });
  window.addEventListener("touchstart", finish, { once: true, passive: true });
  timer = window.setTimeout(finish, 160);
  window.setTimeout(finish, 2200);
}

/** onClick helper for `<a href="#id">`: lets modified clicks through. */
export function anchorClick(
  event: { preventDefault(): void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number },
  hash: string,
  opts?: { replay?: boolean }
) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  goToSection(hash, opts);
}
