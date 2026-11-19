import { cn } from "@/lib/utils";

/** A loading placeholder. Hidden from assistive tech; the caller announces the wait. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ui-skeleton", className)} aria-hidden="true" />;
}
