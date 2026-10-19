import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * A multi-line field.
 *
 * `resize: none` (in ui.css) is deliberate: the composer grows itself to fit its
 * content, so a drag handle would only ever fight the auto-grow. Callers that
 * need a fixed box set a height.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn("ui-textarea", className)} {...props} />;
  }
);
