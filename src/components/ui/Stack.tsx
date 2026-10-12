import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  type Transition,
} from "motion/react";
import styles from "./Stack.module.css";

/**
 * Stack -- React Bits' card stack, ported to TypeScript + CSS Modules.
 *
 * A pile of cards in which the last one in `stack` is on top and fully
 * readable. Sending a card to the back promotes the one behind it: it
 * straightens, grows, and becomes the interactive card. Three things drive
 * that -- clicking, dragging past `sensitivity`, or `autoplay`.
 *
 * The layout contract lives in `Stack.module.css` and is worth restating:
 * `.stackContainer` carries the `perspective` and its children are
 * `position: absolute`, so the container MUST have a resolved height. It
 * declares `height: 100%`, which resolves to `auto` against an
 * auto-height parent -- that is deliberate, because it lets a caller set
 * `aspect-ratio` on this element instead of hardcoding a pixel height, and
 * that is the only way this scales on a phone.
 *
 * Differences from the React Bits original, all of them things this project
 * requires of every component:
 *
 *   - The click target is a real `<button>`, and only the top card is one.
 *     Six stacked buttons would mean six tab stops describing the same thing.
 *   - `prefers-reduced-motion` turns off the drag, the fan, and the autoplay
 *     timer, leaving the stack reorderable by click alone. The spring is the
 *     whole effect; there is nothing left to soften.
 *   - A card dragged past `sensitivity` does not ALSO fire its click handler.
 *     React Bits lets both run, so one throw advanced the stack twice.
 *   - The random per-card tilt is seeded once per card instead of being
 *     redrawn on every render, so an unrelated re-render (a resize, a theme
 *     flip) does not reshuffle every card's angle.
 */

interface CardRotateProps {
  children: ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
  /** Click-only mode: no pointer drag, no drag tilt. */
  disableDrag: boolean;
  /** Fired on pointer-down on a real drag, used to arm the click guard. */
  onDragBegin: () => void;
  onDragMove: () => void;
}

function CardRotate({
  children,
  onSendToBack,
  sensitivity,
  disableDrag,
  onDragBegin,
  onDragMove,
}: CardRotateProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) {
      onSendToBack();
    } else {
      /* Spring home. The reset has to be explicit because the card is not
         animating toward a resting position -- it is only following the
         pointer, and releasing it below the threshold has to hand it back. */
      x.set(0);
      y.set(0);
    }
  }

  /* Not a `motion.div` when drag is off. Rendering the wrapper anyway would
     put a `cursor: grab` element on screen with nothing to grab. */
  if (disableDrag) {
    return <div className={styles.cardStatic}>{children}</div>;
  }

  return (
    <motion.div
      className={styles.cardRotate}
      /* `pan-y` rather than motion's default `none`: this is a scroll-snap
         page, and a vertical scroll that starts on a card has to keep
         scrolling the page. Only the horizontal axis is captured. */
      style={{ x, y, rotateX, rotateY, touchAction: "pan-y" }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      /* Without this the card keeps travelling after release, so a throw
         looks like it overshot the threshold and settled somewhere else. */
      dragMomentum={false}
      whileTap={{ cursor: "grabbing" }}
      onDragStart={onDragBegin}
      onDrag={onDragMove}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
}

interface StackCard {
  id: number;
  content: ReactNode;
}

interface StackProps {
  /** Add a per-card tilt of up to +/- 5 degrees on top of the fan. */
  randomRotation?: boolean;
  /** Drag distance, in pixels, past which a card is thrown to the back. */
  sensitivity?: number;
  cards?: ReactNode[];
  animationConfig?: { stiffness: number; damping: number };
  sendToBackOnClick?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  /**
   * Below `mobileBreakpoint`, drop the drag and let a tap do the work. On a
   * touch screen a 60px-elastic drag is indistinguishable from a scroll
   * attempt, and this is a scroll-snap page: the page wins, the card does
   * nothing, and it reads as a broken control.
   */
  mobileClickOnly?: boolean;
  mobileBreakpoint?: number;
  /** Accessible name for the group of cards. */
  label?: string;
  /**
   * Layout classes for the outermost box. Apply an aspect ratio here rather
   * than a height: `.stackContainer`'s `height: 100%` resolves to `auto`
   * here, and the ratio is then what sets the height.
   */
  className?: string;
}

/** `matchMedia` for the reduced-motion guard, read lazily so the first paint is already correct. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export default function Stack({
  randomRotation = false,
  sensitivity = 200,
  cards = [],
  animationConfig = { stiffness: 240, damping: 28 },
  sendToBackOnClick = false,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  mobileClickOnly = false,
  mobileBreakpoint = 768,
  label,
  className = "",
}: StackProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [mobileBreakpoint]);

  /* A hidden tab is not a still frame, it is an off-screen one. Reordering
     cards nobody can see is motion for nobody. */
  useEffect(() => {
    const sync = () => setIsPageVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const disableDrag = reduceMotion || (mobileClickOnly && isMobile);
  /* Clicking is the only way to move a card once drag is off, so it has to be
     on regardless of what `sendToBackOnClick` asked for. */
  const canClick = sendToBackOnClick || disableDrag;

  const [stack, setStack] = useState<StackCard[]>(() =>
    cards.map((content, index) => ({ id: index + 1, content })),
  );

  /* React Bits resets the stack on every change to the `cards` identity, which
     a caller that builds the array inline in JSX produces on every render --
     the stack would spring back to its opening order right after each click.
     Only a change in length is treated as "the caller swapped the cards". */
  useEffect(() => {
    setStack((prev) =>
      prev.length === cards.length
        ? prev
        : cards.map((content, index) => ({ id: index + 1, content })),
    );
  }, [cards]);

  const sendToBack = (id: number) => {
    setStack((prev) => {
      const next = [...prev];
      const index = next.findIndex((card) => card.id === id);
      if (index <= 0) return prev;
      const [card] = next.splice(index, 1);
      next.unshift(card);
      return next;
    });
  };

  /* Armed by any real drag and read by the card's click handler, because
     `pointerup` after a drag is followed by a `click` on the child button and
     that click would otherwise advance a second card. */
  const draggedRef = useRef(false);

  useEffect(() => {
    if (!autoplay || reduceMotion || isPaused || !isPageVisible || stack.length < 2) {
      return;
    }
    const id = window.setInterval(() => {
      setStack((prev) => {
        if (prev.length < 2) return prev;
        const next = [...prev];
        const [top] = next.splice(next.length - 1, 1);
        next.unshift(top);
        return next;
      });
    }, autoplayDelay);
    return () => window.clearInterval(id);
    /* `stack.length`, not `stack`: depending on the array itself tears the
       timer down and rebuilds it on every tick, so it never gets to fire. */
  }, [autoplay, autoplayDelay, stack.length, isPaused, isPageVisible, reduceMotion]);

  /* Seeded once per card id. Read during render rather than stored in state
     so it stays a plain number and never triggers a re-render of its own. */
  const tiltRef = useRef(new Map<number, number>());
  const tiltFor = (id: number): number => {
    const seeded = tiltRef.current.get(id);
    if (seeded !== undefined) return seeded;
    const tilt = randomRotation ? Math.random() * 10 - 5 : 0;
    tiltRef.current.set(id, tilt);
    return tilt;
  };

  const transition: Transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring", ...animationConfig };

  const topId = stack.length > 0 ? stack[stack.length - 1].id : null;

  return (
    <div
      className={`${styles.stackContainer} ${className}`.trim()}
      role="group"
      aria-label={label}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      onFocusCapture={() => pauseOnHover && setIsPaused(true)}
      onBlurCapture={() => pauseOnHover && setIsPaused(false)}
    >
      {stack.map((card, index) => {
        const isTop = card.id === topId;
        /* Tighter fan so cards stay inside their box:
           - rotate step 2° (was 4°) → max ~10° on the bottom card
           - scale step 0.025 (was 0.06) → less size difference
           - transform-origin 70% 70% (was 90% 90%) → rotation centre
             closer to the middle, so corners don't fly out as far. */
        const animation = {
          rotateZ: (stack.length - index - 1) * 2 + tiltFor(card.id),
          scale: 1 + index * 0.025 - stack.length * 0.025,
          transformOrigin: "70% 70%",
        };

        const handleClick = () => {
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          if (canClick) sendToBack(card.id);
        };

        return (
          <CardRotate
            key={card.id}
            onSendToBack={() => sendToBack(card.id)}
            sensitivity={sensitivity}
            disableDrag={disableDrag}
            onDragBegin={() => {
              draggedRef.current = false;
            }}
            onDragMove={() => {
              draggedRef.current = true;
            }}
          >
            {/* Only the front card is reachable. The five behind it are
                scenery: announcing all six would read six captions for one
                picture, and six tab stops for one control. */}
            {isTop ? (
              <motion.button
                type="button"
                className={styles.card}
                onClick={handleClick}
                animate={animation}
                initial={false}
                transition={transition}
              >
                {card.content}
              </motion.button>
            ) : (
              <motion.div
                className={styles.card}
                aria-hidden="true"
                animate={animation}
                initial={false}
                transition={transition}
              >
                {card.content}
              </motion.div>
            )}
          </CardRotate>
        );
      })}
    </div>
  );
}