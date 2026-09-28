"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import type { NavIcon } from "@/lib/navigation";

export interface PaletteItem {
  /** Matches the anchor target, e.g. "#about". */
  id: string;
  label: string;
  /** Extra searchable words, so "degree" can surface education. */
  keywords?: string;
  Icon?: NavIcon;
}

interface CommandPaletteProps {
  open: boolean;
  items: PaletteItem[];
  /** Placeholder in the search field. */
  placeholder?: string;
  /** Label announced to assistive tech for the dialog itself. */
  label?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}

/**
 * A ⌘K-style jump-to-section palette.
 *
 * Deliberately content-agnostic (`.clinerules` keeps site-specific markup out of
 * components/ui/): it takes items as props and knows nothing about sections. The
 * caller supplies the list and the scroll behaviour.
 *
 * Two things it does that a plain list does not, and both are accessibility
 * requirements rather than polish:
 *
 *  - Arrow keys move a real selection, and the active row carries
 *    `aria-selected`, so the highlighted item is announced rather than only
 *    drawn. The list is a `listbox` for exactly that reason.
 *  - The list is scrolled with `block: "nearest"` so the active row cannot be
 *    dragged under the sticky search field or off the bottom of the panel.
 *
 * Focus is moved into the input on open and returned to whatever had it on
 * close, so a keyboard user is never dropped back at the top of the document.
 */
export default function CommandPalette({
  open,
  items,
  placeholder = "jump to section...",
  label = "Jump to section",
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Whatever had focus before the palette opened, to restore on close. */
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Label-first, then keywords, and every term must match. Substring rather
   * than fuzzy on purpose: a palette for eight fixed destinations should never
   * reorder results behind the visitor's back, and "ed" matching "education" is
   * all the cleverness this needs.
   */
  const matches = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return items;
    return items.filter((item) => {
      const haystack = `${item.label} ${item.keywords ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [items, query]);

  /**
   * Clamp rather than reset, so filtering from a long list to a short one
   * highlights the first result instead of leaving the index pointing past the
   * end of the array -- which would make Enter select nothing at all.
   */
  useEffect(() => {
    setActiveIndex((current) => (current < matches.length ? current : 0));
  }, [matches.length]);

  /** Open: take focus, remember where it came from, start from a clean query. */
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActiveIndex(0);
    // The input is mounted by the time this runs, but focusing is deferred to
    // the next frame so it is never lost to the open transition.
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  /** Close: hand focus back to the trigger so the keyboard user is not lost. */
  useEffect(() => {
    if (open) return;
    const restore = restoreFocusRef.current;
    restoreFocusRef.current = null;
    if (restore && document.contains(restore)) restore.focus();
  }, [open]);

  /**
   * Body scroll lock while open.
   *
   * Restores the exact previous value rather than blanking it, because the
   * mobile nav drawer also writes `document.body.style.overflow` and a hard
   * reset here would unlock the page when that drawer is still open.
   */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /** Keeps the active row visible inside the scrollable list. */
  useEffect(() => {
    const list = listRef.current;
    const row = list?.children[activeIndex] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, matches]);

  const choose = useCallback(
    (index: number) => {
      const item = matches[index];
      if (!item) return;
      onSelect(item.id);
    },
    [matches, onSelect]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      // Wraps, so holding the key cycles rather than sticking on the last row.
      setActiveIndex((current) => (matches.length ? (current + 1) % matches.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        matches.length ? (current - 1 + matches.length) % matches.length : 0
      );
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, matches.length - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]"
      style={{ backgroundColor: "color-mix(in srgb, var(--bg) 72%, transparent)" }}
      onKeyDown={onKeyDown}
    >
      {/* Clicking the backdrop dismisses. `onMouseDown` rather than `onClick` so
          a drag that began inside the panel and ended outside does not close it. */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        aria-hidden="true"
        onMouseDown={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--gray-200)] shadow-2xl"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--gray-200)] px-4 py-3">
          <Search
            size={14}
            strokeWidth={1.8}
            aria-hidden="true"
            className="shrink-0 text-[var(--gray-400)]"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={label}
            aria-controls="command-palette-results"
            // The palette matches on substrings, so the browser's own
            // autocomplete is noise here rather than a feature.
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            // `min-w-0` because an input is a flex child here and flex children
            // default to `min-width: auto` -- derived from the input's `size`
            // attribute, not its content. Without it the field can hold the
            // `esc` tag out of the row on a narrow phone and push the clear
            // affordance off the edge.
            className="w-full min-w-0 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--gray-400)]"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <kbd
            className="shrink-0 rounded border border-[var(--gray-200)] px-1.5 py-0.5 text-[10px] text-[var(--gray-500)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            esc
          </kbd>
        </div>

        {matches.length > 0 ? (
          <ul
            id="command-palette-results"
            ref={listRef}
            role="listbox"
            aria-label={label}
            className="max-h-[min(22rem,50vh)] overflow-y-auto p-1.5"
          >
            {matches.map((item, index) => {
              const isActive = index === activeIndex;
              const Icon = item.Icon;
              return (
                <li key={item.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    // `onMouseMove` rather than `onMouseEnter`, so the selection
                    // follows the pointer as it travels down a list instead of
                    // only updating for rows it settles inside.
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => choose(index)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors"
                    style={{
                      // Inversion rather than an accent colour: the palette is
                      // monochrome, and a filled active row reads instantly in
                      // both themes and in a greyscale screenshot.
                      backgroundColor: isActive ? "var(--ink)" : "transparent",
                      color: isActive ? "var(--bg)" : "var(--gray-500)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {Icon ? (
                      <Icon
                        size={14}
                        strokeWidth={1.7}
                        className="shrink-0"
                        style={{ color: isActive ? "var(--bg)" : "var(--gray-400)" }}
                      />
                    ) : null}
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive ? (
                      <CornerDownLeft
                        size={12}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="shrink-0"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p
            className="px-4 py-6 text-center text-[12px] text-[var(--gray-500)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            no section matches &ldquo;{query.trim()}&rdquo;
          </p>
        )}

        <div
          className="flex items-center gap-3 border-t border-[var(--gray-200)] px-4 py-2 text-[10px] text-[var(--gray-400)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <span>↑↓ navigate</span>
          <span>↵ jump</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
