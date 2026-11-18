import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * A dropdown menu with shadcn/ui's composition API and no Radix underneath.
 *
 * Three things it has to get right without the library, because they are the
 * reasons this is not just an absolutely positioned div:
 *
 * 1. It renders through a portal. Every menu in this app hangs off a row inside
 *    a scrolling list inside an `overflow: hidden` card, so a nested absolute
 *    menu would be clipped at the pane edge.
 * 2. It positions itself from the trigger's rect and flips above the trigger
 *    when there is no room below, then re-measures on scroll and resize.
 * 3. It is reachable by keyboard: ArrowDown/ArrowUp open it, arrows and
 *    Home/End move between items, Escape closes and returns focus to the
 *    trigger, and a click anywhere else closes it without stealing focus.
 */
interface MenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Closes and moves focus back to the trigger when focus is inside the menu. */
  close: () => void;
  triggerId: string;
  contentId: string;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}

const MenuContext = createContext<MenuState | null>(null);

function useMenuState(component: string): MenuState {
  const state = useContext(MenuContext);
  if (!state) throw new Error(`${component} must be rendered inside <DropdownMenu>`);
  return state;
}

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();

  const close = useCallback(() => {
    const content = contentRef.current;
    if (content && content.contains(document.activeElement)) triggerRef.current?.focus();
    setOpen(false);
  }, []);

  return (
    <MenuContext.Provider
      value={{
        open,
        setOpen,
        close,
        triggerId: `${baseId}-trigger`,
        contentId: `${baseId}-content`,
        triggerRef,
        contentRef,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  /** Exactly one element. It receives the button semantics and the ref. */
  children: ReactElement;
}

/**
 * Wraps the one child rather than rendering its own button, so the trigger can
 * be an icon button, a text button or a whole row without a second wrapper
 * element between the menu and its anchor.
 */
export function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerId, contentId, triggerRef } = useMenuState("DropdownMenuTrigger");
  const child = children as ReactElement<Record<string, unknown>>;
  const childProps = child.props;
  const childRef = (child as unknown as { ref?: Ref<HTMLElement> }).ref;

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    (childProps.onClick as ((event: ReactMouseEvent<HTMLElement>) => void) | undefined)?.(event);
    if (!event.defaultPrevented) setOpen(!open);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    (childProps.onKeyDown as ((event: ReactKeyboardEvent<HTMLElement>) => void) | undefined)?.(event);
    if (event.defaultPrevented) return;
    // Opening on ArrowDown is what makes the menu reachable without a pointer;
    // Enter and Space already arrive as clicks on a button.
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  return cloneElement(child, {
    id: triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? contentId : undefined,
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof childRef === "function") childRef(node);
      else if (childRef) (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    onClick: handleClick,
    onKeyDown: handleKeyDown,
  });
}

interface DropdownMenuContentProps {
  children: ReactNode;
  /** Which trigger edge the menu lines up with. */
  align?: "start" | "end";
  className?: string;
}

export function DropdownMenuContent({ children, align = "end", className }: DropdownMenuContentProps) {
  const { open, close, setOpen, triggerId, contentId, triggerRef, contentRef } = useMenuState(
    "DropdownMenuContent"
  );
  // Null until measured: the menu is rendered invisible for one frame rather
  // than flashing at the top-left corner of the viewport.
  const [position, setPosition] = useState<CSSProperties | null>(null);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!trigger || !content) return;
    const rect = trigger.getBoundingClientRect();
    const { width, height } = content.getBoundingClientRect();
    const gap = 6;
    const margin = 8;

    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - margin) {
      const above = rect.top - gap - height;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - margin - height);
    }

    const preferred = align === "end" ? rect.right - width : rect.left;
    const left = Math.min(Math.max(margin, preferred), Math.max(margin, window.innerWidth - margin - width));

    setPosition({ top, left });
  }, [align, contentRef, triggerRef]);

  useLayoutEffect(() => {
    if (open) measure();
  }, [measure, open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    // Capture phase: an ancestor scrolling the menu out from under itself still
    // fires here, where a bubble-phase listener on window would not.
    const onReflow = () => measure();

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [close, contentRef, measure, open, setOpen, triggerRef]);

  // The first item takes focus on open, which is also what makes the menu's
  // hover state visible for a keyboard user from the first keypress.
  useEffect(() => {
    if (!open) return;
    const first = contentRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
  }, [contentRef, open]);

  const onContentKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const items = Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []
    );
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Home") return items[0].focus();
    if (event.key === "End") return items[items.length - 1].focus();
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = current === -1 ? (step === 1 ? 0 : items.length - 1) : (current + step + items.length) % items.length;
    items[next].focus();
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={(node) => {
        contentRef.current = node;
      }}
      id={contentId}
      role="menu"
      aria-labelledby={triggerId}
      data-align={align}
      className={cn("ui-menu", className)}
      style={position ?? { top: 0, left: 0, visibility: "hidden" }}
      onKeyDown={onContentKeyDown}
    >
      {children}
    </div>,
    document.body
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  /** `quiet` is for the destructive or secondary end of the list. */
  tone?: "default" | "quiet";
  icon?: ReactNode;
  disabled?: boolean;
}

export function DropdownMenuItem({
  children,
  onSelect,
  tone = "default",
  icon,
  disabled = false,
}: DropdownMenuItemProps) {
  const { close } = useMenuState("DropdownMenuItem");
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      data-tone={tone}
      className="ui-menu-item"
      onClick={() => {
        // Close first: `onSelect` may open a dialog, and the menu must not still
        // be on screen behind it.
        close();
        onSelect?.();
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="ui-menu-separator" role="none" />;
}
