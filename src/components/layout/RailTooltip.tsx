import { useCallback, useEffect, useState } from "react";
import type { FocusEvent, PointerEvent } from "react";

interface TipState {
  label: string;
  top: number;
  left: number;
}

/**
 * One shared tooltip for the icon-only rail.
 *
 * The rail scrolls (`overflow-y: auto`), which clips anything absolutely
 * positioned outside it, so the tooltip is a single `position: fixed` element
 * placed from the hovered control's rect. Pointer hover (mouse and pen, not
 * touch) and keyboard focus (focus-visible only) show it; Escape, scroll,
 * and leaving the control hide it.
 */
export function useRailTooltip(enabled: boolean) {
  const [tip, setTip] = useState<TipState | null>(null);

  const hide = useCallback(() => setTip(null), []);

  const show = useCallback(
    (el: HTMLElement, label: string) => {
      if (!enabled) return;
      const rect = el.getBoundingClientRect();
      setTip({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) setTip(null);
  }, [enabled]);

  useEffect(() => {
    if (!tip) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTip(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, { capture: true });
    };
  }, [tip, hide]);

  /** Spread onto any control that should show `label` while the rail is collapsed. */
  const tipProps = useCallback(
    (label: string) => ({
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== "touch") show(event.currentTarget, label);
      },
      onPointerLeave: hide,
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(":focus-visible")) show(event.currentTarget, label);
      },
      onBlur: hide,
    }),
    [show, hide]
  );

  return { tip, tipProps };
}

export function RailTooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null;
  return (
    <div role="tooltip" className="rail-tip" style={{ top: tip.top, left: tip.left }}>
      {tip.label}
    </div>
  );
}
