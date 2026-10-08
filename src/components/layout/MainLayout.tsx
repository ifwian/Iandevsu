"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import ScrollTopButton from "./ScrollTopButton";
import CommandPalette from "@/components/ui/CommandPalette";
import { NAV_ITEMS } from "@/lib/navigation";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  /**
   * Adapts the shared nav list to what the palette expects.
   *
   * The palette takes `id`, the nav calls the same value `href` because it is an
   * anchor target. Mapping here rather than renaming either keeps the palette
   * free of any knowledge of anchors -- it hands back an opaque id and lets the
   * caller decide what to do with it -- and keeps `href` meaningful for the
   * scroll-spy, which compares against it.
   */
  const paletteItems = useMemo(
    () =>
      NAV_ITEMS.map(({ href, label, keywords, Icon }) => ({
        id: href,
        label,
        keywords,
        Icon,
      })),
    []
  );

  /**
   * ⌘K / Ctrl+K anywhere on the page.
   *
   * Bound on the document rather than on the trigger, so the palette is
   * reachable without aiming at the sidebar -- the whole point of a shortcut.
   * `metaKey` covers macOS and `ctrlKey` everything else; both are accepted so
   * the same chord works on a Windows machine with a Mac keyboard.
   *
   * `preventDefault` because browsers bind ⌘K to the address-bar search, and
   * without it the palette would open *and* focus the URL bar.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();

      setPaletteOpen((open) => {
        /**
         * The typing guard only applies when opening. Once the palette is up its
         * own search field holds focus, and blocking there would strand the
         * shortcut: ⌘K would neither open nor close, leaving Escape as the only
         * way out. Typing in the chat composer or a note field still means a
         * literal "k".
         */
        if (!open) {
          const target = event.target as HTMLElement | null;
          const tag = target?.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return open;
        }
        return !open;
      });
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /**
   * Jumps to a section and dismisses the palette.
   *
   * `scrollIntoView()` is called with no options on purpose: `html` already
   * carries `scroll-behavior: smooth`, and the `prefers-reduced-motion` block in
   * theme.css resets it to `auto`. Passing `behavior: "smooth"` here would
   * override that media query from a stylesheet the visitor cannot reach.
   */
  const jumpTo = useCallback((id: string) => {
    setPaletteOpen(false);
    const target = document.querySelector(id);
    if (!target) return;
    target.scrollIntoView();
    // `replaceState` rather than assigning `location.hash`, so the URL becomes
    // copyable without pushing a history entry per jump -- and without React
    // Router observing a change it did not make.
    window.history.replaceState(null, "", id);
  }, []);

  return (
    <>
      {/* No font utility on the wrapper on purpose. `font-geist-mono` was never
          a real class in this project, so it was silently doing nothing. Each
          section picks its own role (--font-body / --font-mono / --font-display)
          and everything else inherits Geist from `body`. */}
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Sidebar wrapper */}
        <div className="w-0 shrink-0">
          {/* No `onOpenPalette`: the rail has no palette button, and the palette is
          opened by the document-level ⌘K handler above. */}
      <Sidebar />
        </div>

        {/* Main content wrapper. `sidebar-offset` replaces the old `lg:pl-80`;
            it reads --sidebar-w so it cannot drift from the sidebar width. */}
        <main
          id="main-content"
          data-dos-container
          tabIndex={-1}
          className="sidebar-offset w-full px-5 pb-8 pt-20 sm:pt-24 lg:px-0 lg:py-12 lg:pr-8"
        >
          {/* The page-level measure, and the only one that applies to all three
              routes. Individual sections carry their own
              `w-full max-w-4xl mx-auto`, which cannot bind past this cap -- so
              this is what actually sets the column width on the home page.

              It is also what currently holds /chat-inbox at 4xl: that page asks
              for `max-w-[1600px]` and is clamped by this wrapper. Removing this
              cap as "redundant" would silently widen the inbox, so don't. */}
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>

        <ScrollTopButton />
      </div>

      <CommandPalette
        open={paletteOpen}
        items={paletteItems}
        onClose={() => setPaletteOpen(false)}
        onSelect={jumpTo}
      />
    </>
  );
}
