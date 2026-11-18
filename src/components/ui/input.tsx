import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** A single-line field. See ui.css for the focus ring and the disabled state. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn("ui-input", className)} {...props} />;
  }
);
