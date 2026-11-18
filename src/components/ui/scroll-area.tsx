import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * The scrolling region.
 *
 * The real shadcn ScrollArea is a Radix Scrollbar reimplementation; this is an
 * overflow container with a themed scrollbar (ui.css), which is what the site
 * needs -- one place that owns `overscroll-behavior: contain` and
 * `scrollbar-gutter: stable`, so no panel has to remember either.
 */
export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ScrollArea({ className, ...props }, ref) {
    return <div ref={ref} className={cn("ui-scroll", className)} {...props} />;
  }
);
