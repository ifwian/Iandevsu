"use client";

import { useEffect, useState } from "react";

/**
 * Live clock and session uptime, in the sidebar's lower group.
 *
 * Both read from `Date.now()` on every tick rather than incrementing a counter.
 * That is what keeps them correct across tab throttling, a laptop sleeping, and
 * the browser throttling a background interval to once a minute -- an
 * accumulating counter drifts by however long the tab was hidden, whereas
 * re-reading the wall clock cannot.
 */

const TICK_MS = 1000;

interface LiveStatusProps {
  /** Second line under the clock, e.g. "building v2 portfolio". */
  status?: string;
}

/** "Asia/Manila" -> "PHT". Any other zone keeps whatever short form Intl gives. */
function zoneAbbreviation(timeZone: string): string {
  if (timeZone === "Asia/Manila") return "PHT";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(new Date());
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

/** `10:43 PM`, from the visitor's own clock. */
function formatClock(at: number): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(at);
  /**
   * Some environments put a NARROW NO-BREAK SPACE (U+202F) before the meridiem.
   * Left alone it renders slightly tighter than the normal space used by the
   * rest of the sidebar's mono text, so the badge looks misaligned against its
   * neighbours. Normalising to U+0020 keeps the gap consistent.
   */
  return formatted.replace(/\u202f/g, " ").toUpperCase();
}

/** `00h 04m 12s` -- server-log rhythm, and it counts live. */
function formatUptime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export default function LiveStatus({ status }: LiveStatusProps) {
  const [now, setNow] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  /**
   * Resolved lazily rather than in the effect below. There is no SSR in this
   * project, so the first client render is the only render that matters, and
   * seeding it in an effect would paint a frame reading "local" before the real
   * abbreviation -- a visible flash on a badge that ticks every second.
   */
  const [zone] = useState(() => zoneAbbreviation(Intl.DateTimeFormat().resolvedOptions().timeZone));

  useEffect(() => {
    const begin = Date.now();
    setStartedAt(begin);
    setNow(begin);

    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    /**
     * `gap-2` between the three lines rather than `gap-1.5`. The clock, the
     * status and the uptime are separate pieces of information, and at 11px
     * mono a 6px gap made them read as one crowded paragraph instead of three
     * rows. `items-start` keeps every line on the same left edge, which is what
     * the rest of the sidebar does.
     */
    <div className="flex flex-col items-start gap-2 text-[11px] leading-[1.4]">
      <p
        className="flex items-center gap-1.5"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)", letterSpacing: "0.5px" }}
      >
        {/*
          The pulse is the same two-layer ping used by the hero's live stat, so
          "this thing is live" looks identical everywhere on the site. The green
          is --status-active, the token already used for that halo and for chat
          presence: no new colour, and it resolves per theme rather than being a
          fixed hex that would clash with the dark palette.
        */}
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: "var(--status-active)" }}
          />
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--status-active)" }}
          />
        </span>
        {/* `tabular-nums` matters more than usual here: without it the digits
            change width every second and the badge visibly jitters. */}
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {now === null ? "--:-- --" : formatClock(now)}
        </span>
        <span className="text-[var(--gray-400)]">{zone}</span>
        {/*
          Read once, in full, when a screen reader reaches this row. The visible
          text is left as-is: it is a real, useful string, and hiding it and
          duplicating it would be worse. Neither this row nor the uptime is a
          live region, so the ticking seconds are never announced -- a clock that
          updated every second through aria-live would make the page unusable.
        */}
        <span className="visually-hidden">local time, updated live</span>
      </p>

      {status ? (
        <p
          className="max-w-[30ch] truncate"
          style={{ color: "var(--gray-400)", fontFamily: "var(--font-mono)" }}
          title={status}
        >
          status: {status}
        </p>
      ) : null}

      {/* Hidden from assistive tech entirely. An uptime counter is ambience: it
          re-renders every second, carries no information a visitor can act on,
          and a screen-reader user meeting "uptime: 00h 04m 11s" learns nothing.
          The clock above is the part worth reading. */}
      <p
        aria-hidden="true"
        className="text-[var(--gray-400)]"
        style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
      >
        {now === null || startedAt === null
          ? "uptime --h --m --s"
          : `uptime: ${formatUptime(now - startedAt)}`}
      </p>
    </div>
  );
}
