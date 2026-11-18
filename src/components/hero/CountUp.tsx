import { useEffect, useRef, useState } from "react";

/**
 * Counts the leading integer of a stat up from 0 ("12 Public" -> 0..12 Public,
 * "105+" -> 0..105+). Values that do not start with a number render as-is.
 * Under reduced motion, or without IntersectionObserver, the final value is
 * shown immediately. The final text is always what a screen reader gets.
 */
export default function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const match = /^(\d+)(.*)$/.exec(value);
  const hasNumber = match !== null;
  const target = match ? Number(match[1]) : 0;
  const suffix = match ? match[2] : "";
  const [shown, setShown] = useState(hasNumber ? 0 : target);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!hasNumber) return;
    const el = ref.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduced || typeof IntersectionObserver === "undefined") {
      setShown(target);
      return;
    }

    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [hasNumber, target, duration]);

  if (!hasNumber) return <>{value}</>;
  return (
    <span ref={ref} aria-label={value} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
    </span>
  );
}
