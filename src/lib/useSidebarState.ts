import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sidebar";
const ATTR = "data-sidebar";

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** The pre-paint attribute wins; localStorage is the fallback if that script did not run. */
function readInitial(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.getAttribute(ATTR) === "collapsed") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

/**
 * Collapsed / expanded state of the desktop rail.
 *
 * The source of truth for layout is `data-sidebar="collapsed"` on <html>: the
 * `--sidebar-w` token flips with it, so the rail and the content offset change
 * together with no JS measuring. index.html restores the attribute before first
 * paint (keep the key in step); this hook reads it back, persists changes, and
 * enables the width transitions only after mount so a restored state never animates.
 * Ctrl/Cmd+B toggles it, except while typing.
 */
export function useSidebarState() {
  const [collapsed, setCollapsed] = useState<boolean>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) root.setAttribute(ATTR, "collapsed");
    else root.removeAttribute(ATTR);
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      /* private mode: the preference just won't persist */
    }
  }, [collapsed]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => document.documentElement.classList.add("sidebar-ready"));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "b" || isEditable(event.target)) return;
      if (!window.matchMedia("(min-width: 1024px)").matches) return; // no rail to toggle on small screens
      event.preventDefault();
      setCollapsed((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = useCallback(() => setCollapsed((value) => !value), []);
  return { collapsed, toggle };
}
