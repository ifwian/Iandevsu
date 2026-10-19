import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `default` is the ink fill: exactly one per view, on whatever the view is for. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A leading icon. Pre-sized by the caller; this only spaces it. */
  icon?: ReactNode;
}

/**
 * The button's classes without the button.
 *
 * For the one case a real `<button>` cannot cover: a router `<Link>` that has to
 * look like one. Equivalent to shadcn's `buttonVariants` -- there is no Slot
 * here to clone onto an arbitrary child.
 */
export function buttonClass(
  variant: ButtonVariant = "default",
  size: ButtonSize = "md",
  className?: string
): string {
  return cn("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className);
}

/** A button. Styles in ui.css; every variant is a fill, a border or neither. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", icon, className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});
