import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** default: solid ink. secondary: soft fill. outline: border only. */
  variant?: "default" | "secondary" | "outline";
}

/** A small label. Weight, fill and border carry the meaning, never colour. */
export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return <span className={cn("ui-badge", `ui-badge--${variant}`, className)} {...props} />;
}
