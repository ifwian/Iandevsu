import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * A confirm dialog, in shadcn/ui's AlertDialog shape and without Radix.
 *
 * The list of things a modal has to do is short but none of it is optional: it
 * traps Tab inside itself, closes on Escape, returns focus to whatever opened
 * it, locks the page behind it, and announces as `alertdialog` rather than
 * `dialog` because it interrupts with a question. All of that lives here so the
 * page that uses it only has to say what the question is.
 */
interface AlertDialogState {
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  titleId: string;
  descriptionId: string;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}

const AlertDialogContext = createContext<AlertDialogState | null>(null);

function useAlertState(component: string): AlertDialogState {
  const state = useContext(AlertDialogContext);
  if (!state) throw new Error(`${component} must be rendered inside <AlertDialog>`);
  return state;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** While true the dialog cannot be dismissed: an in-flight request owns it. */
  busy?: boolean;
  children: ReactNode;
}

export function AlertDialog({ open, onOpenChange, busy = false, children }: AlertDialogProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const baseId = useId();
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Capture the opener and freeze the document for as long as the dialog is up.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      restoreRef.current?.focus();
      restoreRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // A busy dialog is a dialog whose write is in flight; dismissing it
        // would hide the outcome of an action already taken.
        if (busy) event.preventDefault();
        else {
          event.preventDefault();
          close();
        }
        return;
      }
      if (event.key !== "Tab") return;

      const items = Array.from(contentRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = contentRef.current?.contains(active) ?? false;

      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, close, open]);

  // Cancel takes focus, not the confirming button: the safe option is the one a
  // stray Enter should land on.
  useEffect(() => {
    if (!open) return;
    const target =
      contentRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      contentRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <AlertDialogContext.Provider
      value={{ onOpenChange, busy, titleId: `${baseId}-title`, descriptionId: `${baseId}-description`, contentRef }}
    >
      <div
        className="ui-dialog-backdrop"
        onClick={(event) => {
          if (busy) return;
          if (event.target === event.currentTarget) close();
        }}
      />
      {children}
    </AlertDialogContext.Provider>,
    document.body
  );
}

export function AlertDialogContent({ children, className }: { children: ReactNode; className?: string }) {
  const { contentRef, titleId, descriptionId } = useAlertState("AlertDialogContent");
  return (
    <div
      ref={contentRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn("ui-dialog", className)}
    >
      {children}
    </div>
  );
}

export function AlertDialogTitle({ children }: { children: ReactNode }) {
  const { titleId } = useAlertState("AlertDialogTitle");
  return (
    <h2 id={titleId} className="ui-dialog-title">
      {children}
    </h2>
  );
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
  const { descriptionId } = useAlertState("AlertDialogDescription");
  return (
    <p id={descriptionId} className="ui-dialog-description">
      {children}
    </p>
  );
}

export function AlertDialogFooter({ children }: { children: ReactNode }) {
  return <div className="ui-dialog-footer">{children}</div>;
}

/** Cancels and closes. Always rendered first, so it is what Tab reaches first. */
export function AlertDialogCancel({
  children = "cancel",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange, busy } = useAlertState("AlertDialogCancel");
  return (
    <Button
      variant="outline"
      data-autofocus
      {...props}
      disabled={busy || props.disabled}
      onClick={(event) => {
        props.onClick?.(event);
        onOpenChange(false);
      }}
    >
      {children}
    </Button>
  );
}

/**
 * The confirming button. Closes on click unless the handler calls
 * `preventDefault`, which is what a caller wants when the write can fail and
 * the dialog should stay up with the error.
 */
export function AlertDialogAction({
  children = "confirm",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange, busy } = useAlertState("AlertDialogAction");
  return (
    <Button
      {...props}
      disabled={busy || props.disabled}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) onOpenChange(false);
      }}
    >
      {children}
    </Button>
  );
}
