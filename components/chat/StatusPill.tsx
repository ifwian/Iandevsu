import { statusPresentation } from "@/lib/chatFormat";

interface StatusPillProps {
  status: string;
  /** `dot` is the compact list-row form; `pill` spells the state out. */
  variant?: "dot" | "pill";
  className?: string;
  /**
   * Suppresses the screen-reader label on the dot variant, for the one place
   * the state is *already* spelled out right next to it. A status filter chip
   * announcing "active -- Status: active" is worse than no label at all.
   */
  hideLabel?: boolean;
}

/**
 * Conversation state indicator.
 *
 * Two forms on purpose. The visitor list renders the dot, because there the
 * status is a *sorting* signal and 50 spelled-out labels would drown the names
 * they sit next to. The thread header uses the pill, where the exact state is
 * the thing being read.
 *
 * The dot variant carries the word in a visually-hidden span and in `title`, so
 * the state is available to a screen reader and on hover -- color alone is never
 * the only carrier of meaning.
 */
export default function StatusPill({
  status,
  variant = "pill",
  className = "",
  hideLabel = false,
}: StatusPillProps) {
  const { label, color } = statusPresentation(status);

  if (variant === "dot") {
    return (
      <span
        className={`inline-flex flex-shrink-0 items-center gap-1.5 ${className}`}
        title={hideLabel ? undefined : `Status: ${label}`}
      >
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {!hideLabel && <span className="visually-hidden">{`Status: ${label}`}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${className}`}
      style={{ borderColor: color, color }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
