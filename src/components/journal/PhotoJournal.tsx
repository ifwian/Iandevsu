"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { JournalEntry } from "@/content/journal";
import "./photo-journal.css";

/**
 * Interactive photo journal.
 *
 * A horizontally swipeable strip (native scroll + scroll-snap, so touch, wheel,
 * trackpad and keyboard all work without a gesture library). Each card is a
 * button: tapping it opens a larger viewer with previous/next, a caption, and
 * swipe / arrow-key navigation. The category pills above the strip jump to that
 * photo and follow the one in view.
 */
export default function PhotoJournal({ entries }: { entries: JournalEntry[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const slideRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  /* Track which slide is nearest the strip's left edge, for the pills and the
     prev/next buttons. Observing intersection against the track is cheaper and
     steadier than reading scrollLeft on every scroll event. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !("IntersectionObserver" in window)) return;
    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (items) => {
        for (const item of items) {
          ratios.set(Number((item.target as HTMLElement).dataset.index), item.intersectionRatio);
        }
        let best = 0;
        let bestRatio = -1;
        ratios.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            best = index;
            bestRatio = ratio;
          }
        });
        setCurrent(best);
      },
      { root: track, threshold: [0.25, 0.5, 0.75, 1] }
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [entries.length]);

  const scrollToSlide = useCallback((index: number) => {
    const el = slideRefs.current[index];
    const track = trackRef.current;
    if (!el || !track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Scroll the strip itself, never the page: scrollIntoView would also move
       the document vertically. */
    track.scrollTo({ left: el.offsetLeft - track.offsetLeft, behavior: reduced ? "auto" : "smooth" });
  }, []);

  const step = (delta: number) => scrollToSlide(Math.min(entries.length - 1, Math.max(0, current + delta)));

  const open = (index: number, opener: HTMLElement) => {
    openerRef.current = opener;
    setViewer(index);
  };

  const close = useCallback(() => {
    setViewer((index) => {
      if (index !== null) scrollToSlide(index); // leave the strip on the photo last viewed
      return null;
    });
    /* Hand focus back to the card that opened the viewer. */
    window.setTimeout(() => openerRef.current?.focus(), 0);
  }, [scrollToSlide]);

  return (
    <div className="journal">
      <div className="journal-head">
        <ul className="journal-pills" aria-label="Photo categories">
          {entries.map((entry, index) => (
            <li key={entry.category}>
              <button
                type="button"
                className="pill journal-pill"
                aria-pressed={current === index}
                onClick={() => scrollToSlide(index)}
              >
                {entry.category}
              </button>
            </li>
          ))}
        </ul>

        <div className="journal-nav">
          <span className="journal-count" aria-hidden="true">
            {String(current + 1).padStart(2, "0")} / {String(entries.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="journal-arrow"
            aria-label="Previous photo"
            disabled={current === 0}
            onClick={() => step(-1)}
          >
            <ChevronLeft size={16} strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="journal-arrow"
            aria-label="Next photo"
            disabled={current === entries.length - 1}
            onClick={() => step(1)}
          >
            <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul className="journal-track" ref={trackRef} aria-label="Photo journal, swipe sideways">
        {entries.map((entry, index) => (
          <li
            key={entry.src}
            className="journal-slide"
            data-index={index}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
          >
            <button
              type="button"
              className="journal-card"
              aria-label={`Open photo: ${entry.category}. ${entry.caption}`}
              onClick={(e) => open(index, e.currentTarget)}
            >
              <span className="journal-frame">
                <img
                  src={entry.src}
                  alt=""
                  width={600}
                  height={800}
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                />
              </span>
              <span className="journal-caption">
                <span className="journal-kicker">{entry.category}</span>
                <span className="journal-text">{entry.caption}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {viewer !== null ? (
        <Viewer entries={entries} index={viewer} onIndex={setViewer} onClose={close} />
      ) : null}
    </div>
  );
}

function Viewer({
  entries,
  index,
  onIndex,
  onClose,
}: {
  entries: JournalEntry[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [dragX, setDragX] = useState(0);
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const last = entries.length - 1;
  const entry = entries[index];

  const go = useCallback(
    (delta: number) => onIndex(Math.min(last, Math.max(0, index + delta))),
    [index, last, onIndex]
  );

  /* Lock page scroll while open; focus the close button; restore on unmount. */
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  /* Warm the neighbours so a swipe never waits on the network. */
  useEffect(() => {
    [index - 1, index + 1].forEach((i) => {
      if (entries[i]) new Image().src = entries[i].src;
    });
  }, [entries, index]);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (event.key === "ArrowLeft") go(-1);
    else if (event.key === "ArrowRight") go(1);
    else if (event.key === "Tab") {
      /* Keep focus inside the dialog. */
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        first.focus();
      }
    }
  }, [go, onClose]);

  /* On the window, not the dialog: after a swipe or a tap on the photo focus can
     be on <body>, and Escape / arrows must still work. */
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, horizontal: null };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (d.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) d.horizontal = Math.abs(dx) > Math.abs(dy);
    if (d.horizontal) setDragX(dx);
  };
  const endDrag = (event: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    setDragX(0);
    if (d.horizontal && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      ref={dialogRef}
      className="journal-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <button type="button" className="journal-scrim" aria-label="Close viewer" tabIndex={-1} onClick={onClose} />

      <div className="journal-viewer-bar">
        <span className="journal-count" aria-live="polite">
          {String(index + 1).padStart(2, "0")} / {String(entries.length).padStart(2, "0")}
        </span>
        <button ref={closeRef} type="button" className="journal-arrow" aria-label="Close viewer" onClick={onClose}>
          <X size={18} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>

      <div
        className="journal-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <button
          type="button"
          className="journal-arrow journal-arrow--side journal-arrow--prev"
          aria-label="Previous photo"
          disabled={index === 0}
          onClick={() => go(-1)}
        >
          <ChevronLeft size={20} strokeWidth={1.7} aria-hidden="true" />
        </button>

        <img
          key={entry.src}
          className="journal-big"
          src={entry.src}
          alt={`${entry.category}: ${entry.caption}`}
          draggable={false}
          style={dragX ? { transform: `translateX(${dragX}px)`, transition: "none" } : undefined}
        />

        <button
          type="button"
          className="journal-arrow journal-arrow--side journal-arrow--next"
          aria-label="Next photo"
          disabled={index === last}
          onClick={() => go(1)}
        >
          <ChevronRight size={20} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>

      <p className="journal-viewer-caption" key={`cap-${entry.src}`}>
        <span className="journal-kicker">{entry.category}</span>
        <span className="journal-text">{entry.caption}</span>
      </p>
    </div>
  );
}
