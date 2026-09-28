"use client";

/**
 * DepthCarousel -- a 3D depth carousel, animated with GSAP.
 *
 * The important structural note is in `DepthCarousel.css`: the perspective, the
 * clipping and the `preserve-3d` context each live on a *different* element,
 * because `overflow: hidden` and `transform-style: preserve-3d` on the same box
 * cancel each other out and flatten the whole fan.
 *
 * Per-frame transforms are written straight to the DOM from a `gsap.ticker`
 * callback rather than through React state -- six cards re-rendering 60 times a
 * second is the alternative, and it costs the main thread.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./DepthCarousel.css";

export interface DepthCarouselItem {
  image: string;
  alt: string;
}

interface DepthCarouselProps {
  items: DepthCarouselItem[];
  cardWidth?: number;
  cardHeight?: number;
  /** How far each step pushes a card back in Z, in pixels. */
  depth?: number;
  /** Horizontal gap between cards, on top of a fraction of the card width. */
  spread?: number;
  /** Y rotation per step, in degrees. */
  tilt?: number;
  /** The 3D vanishing point distance, in pixels. */
  perspective?: number;
  /** How many steps either side of centre stay visible. */
  visibleCards?: number;
  /** Card corner radius, in pixels. */
  radius?: number;
  /** Backdrop the cards melt into. */
  tint?: string;
  autoplay?: boolean;
  loop?: boolean;
  autoplayInterval?: number;
  className?: string;
}

/** Easing the ticker applies while `position` chases `target`. */
const EASE = 0.12;

export default function DepthCarousel({
  items,
  cardWidth = 260,
  cardHeight = 340,
  depth = 180,
  spread = 70,
  tilt = 18,
  perspective = 1200,
  visibleCards = 3,
  radius = 12,
  tint = "#05060a",
  autoplay = false,
  loop = true,
  autoplayInterval = 2600,
  className = "",
}: DepthCarouselProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const pausedRef = useRef(false);
  const activeRef = useRef(0);

  const [active, setActive] = useState(0);
  const count = items.length;

  /**
   * Shortest signed distance from `position` to `index` around a ring of `total`.
   *
   * This is what makes `loop` work: stepping forward off the last card has to
   * land on the first, arriving from the far side, rather than sweeping across
   * the whole row.
   */
  const ringDelta = (index: number, position: number, total: number) => {
    const wrapped = (((index - position) % total) + total) % total;
    return wrapped > total / 2 ? wrapped - total : wrapped;
  };

  const step = useCallback(
    (delta: number) => {
      if (count === 0) return;
      if (loop) {
        // Wrap in a single hop. Letting the target run off to infinity would
        // eventually make the modulo inside ringDelta jump.
        targetRef.current = (((targetRef.current + delta) % count) + count) % count;
      } else {
        const next = targetRef.current + delta;
        if (next < 0 || next > count - 1) return;
        targetRef.current = next;
      }
    },
    [count, loop]
  );

  const goTo = useCallback((index: number) => {
    targetRef.current = index;
  }, []);

  /**
   * The render loop, on GSAP's ticker so it shares one clock with the rest of
   * the page's animation and tears down cleanly.
   */
  useEffect(() => {
    if (count === 0) return;

    // Horizontal step is a fraction of the card width so the row tightens as
    // the cards get narrower, plus `spread` so the gap is tunable on its own.
    const stepX = cardWidth * 0.22 + spread;
    // One step past the last visible card is fully gone, which is what stops a
    // stack of near-transparent cards smearing over the front ones.
    const fadeOver = visibleCards + 0.35;

    const apply = () => {
      const position = positionRef.current;

      for (let i = 0; i < count; i += 1) {
        const node = cardRefs.current[i];
        if (!node) continue;

        const delta = loop
          ? ringDelta(i, position, count)
          : Math.max(-visibleCards, Math.min(visibleCards, i - position));
        const distance = Math.abs(delta);

        const x = delta * stepX;
        const z = -distance * depth; // translateZ: further back, smaller
        const rotateY = -delta * tilt;
        // Perspective already shrinks the cards with distance. This is the extra
        // emphasis on top, deliberately gentle so the row does not collapse to
        // nothing two cards out.
        const scale = 1 - Math.min(distance, visibleCards) * 0.05;
        const opacity = Math.max(0, 1 - distance / fadeOver);

        node.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${rotateY}deg) scale(${scale})`;
        node.style.opacity = String(opacity);
        node.style.zIndex = String(100 - Math.round(distance * 10));
        node.style.visibility = distance > fadeOver + 0.5 ? "hidden" : "visible";
        // Pointer events only on the frontmost card, or the invisible ones
        // intercept clicks aimed at the visible one.
        node.style.pointerEvents = distance < 0.5 ? "auto" : "none";
      }

      // Only re-render when the rounded position actually changes a dot. Calling
      // setState unconditionally would schedule a React render every frame even
      // though the value is identical 59 times out of 60.
      const nearest = ((Math.round(position) % count) + count) % count;
      if (nearest !== activeRef.current) {
        activeRef.current = nearest;
        setActive(nearest);
      }
    };

    const tick = () => {
      // Frame-rate independent chase. `deltaRatio` is the current frame's
      // duration relative to a 60fps frame, so normalising by it keeps the
      // easing identical at 60Hz, 120Hz and after a stall.
      const ratio = gsap.ticker.deltaRatio();
      const blend = 1 - Math.pow(1 - EASE, Number.isFinite(ratio) ? ratio : 1);
      positionRef.current += (targetRef.current - positionRef.current) * blend;
      apply();
    };

    apply();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [count, loop, cardWidth, depth, spread, tilt, visibleCards]);

  /** Autoplay, paused on hover and when the tab is hidden. */
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Never autoplay under reduced motion: this is a continuously moving
    // carousel, which is exactly what that preference is about.
    if (!autoplay || reduced || count < 2) return;

    const timer = window.setInterval(() => {
      if (!pausedRef.current && document.visibilityState === "visible") step(1);
    }, autoplayInterval);

    return () => window.clearInterval(timer);
  }, [autoplay, autoplayInterval, count, step]);

  /**
   * Wheel, drag and keyboard -- all on the stage, never the window. A
   * window-level handler would also move the carousel every time the visitor
   * scrolled the page anywhere else, and the two would fight.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || count === 0) return;

    let wheelLock = 0;
    const onWheel = (event: WheelEvent) => {
      // A trackpad emits a long stream of small deltas; without a lock the
      // carousel sprints away from a single flick.
      const now = performance.now();
      if (now - wheelLock < 220) return;
      wheelLock = now;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 1) return;
      step(delta > 0 ? 1 : -1);
    };

    let dragging = false;
    let dragStartX = 0;
    let dragStartPosition = 0;
    let dragMoved = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return; // ignore right/middle click
      dragging = true;
      dragMoved = false;
      dragStartX = event.clientX;
      dragStartPosition = targetRef.current;
      stage.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const distance = event.clientX - dragStartX;
      if (Math.abs(distance) > 4) dragMoved = true;
      // A 120px drag is one full step, so the gesture feels linear rather than
      // having to cross a whole card to register.
      targetRef.current = dragStartPosition - distance / 120;
    };

    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      if (dragMoved) targetRef.current = Math.round(targetRef.current);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    };

    stage.addEventListener("wheel", onWheel, { passive: true });
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("keydown", onKeyDown);

    return () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", endDrag);
      stage.removeEventListener("pointercancel", endDrag);
      stage.removeEventListener("keydown", onKeyDown);
    };
  }, [count, step]);

  if (count === 0) return null;

  /**
   * The card's own dimensions are also published as custom properties, because
   * the stylesheet centres each card with
   * `margin-left: calc(var(--card-width) * -0.5)`.
   */
  const cardStyle = {
    width: cardWidth,
    height: cardHeight,
    borderRadius: radius,
    "--card-width": `${cardWidth}px`,
    "--card-height": `${cardHeight}px`,
  } as React.CSSProperties;

  const nudge = (delta: number) => (event: React.MouseEvent) => {
    event.stopPropagation();
    step(delta);
  };

  return (
    <div
      className={`depth-carousel ${className}`}
      // Perspective on the OUTER element, and `overflow: hidden` on the stage
      // below. These two cannot share a box.
      style={{ perspective: `${perspective}px` }}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        ref={stageRef}
        className="depth-carousel__stage"
        style={{ backgroundColor: tint }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Hobby photos"
      >
        <div className="depth-carousel__track">
          {items.map((item, index) => (
            <div
              key={`${item.image}-${index}`}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              className="depth-carousel__card"
              style={cardStyle}
              aria-hidden={index !== active}
            >
              <img
                src={item.image}
                alt={item.alt}
                className="depth-carousel__image"
                draggable={false}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              className="depth-carousel__arrow depth-carousel__arrow--left"
              onClick={nudge(-1)}
              aria-label="Previous photo"
            >
              <span aria-hidden="true">&larr;</span>
            </button>
            <button
              type="button"
              className="depth-carousel__arrow depth-carousel__arrow--right"
              onClick={nudge(1)}
              aria-label="Next photo"
            >
              <span aria-hidden="true">&rarr;</span>
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="depth-carousel__dots">
          {items.map((item, index) => (
            <button
              key={`dot-${item.image}-${index}`}
              type="button"
              className="depth-carousel__dot"
              // Filled as well as wider, so the current position reads without
              // relying on colour alone.
              data-active={index === active ? "true" : "false"}
              onClick={() => goTo(index)}
              aria-label={`Show photo ${index + 1} of ${count}: ${item.alt}`}
              aria-current={index === active ? "true" : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
