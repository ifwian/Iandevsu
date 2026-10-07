"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, MapPin, Search } from "lucide-react";
import { PROFILE } from "@/content/profile";
import { NAV_ITEMS } from "@/lib/navigation";
import ThemeToggle from "./ThemeToggle";

interface SidebarNavProps {
  active: string;
  mobile?: boolean;
  onNavigate?: () => void;
}

/**
 * The platform's modifier glyph, resolved once on mount.
 *
 * Rendered as ⌘ on Apple platforms and "ctrl" elsewhere, because showing "⌘K" to
 * someone on Windows or Linux describes a chord their keyboard does not have.
 * Starts as the neutral "K" so the first paint -- and any render before the
 * effect runs -- shows something true rather than the wrong modifier.
 */
function useModifierLabel(): string {
  const [label, setLabel] = useState("K");
  useEffect(() => {
    const isApple = /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
    setLabel(isApple ? "⌘K" : "ctrl k");
  }, []);
  return label;
}

/**
 * The single navigation affordance that replaced the long section list on the
 * desktop rail.
 *
 * Terminal-styled on purpose -- monospace, small, quiet -- to match the rest of
 * the sidebar's register rather than looking like a web button dropped into it.
 *
 * An inline text item, not a boxed button: no fill, no border, no radius. The
 * rail is hairline rules and 13px mono, and a bordered box here competed with
 * the one real chrome surface in the column (the chat panel's own edge). Icon
 * plus label sits in the same row shape as the numbered nav links -- same
 * `py-[0.45rem]`, same `text-[13px]`, same `leading-normal` -- so the three read
 * as one list of places rather than a link above two widgets.
 *
 * The hover is a colour change on the icon and label, and nothing else: no
 * border to move, no fill to appear. `.clinerules` is explicit that emphasis
 * here comes from inversion or typography and never from a new colour, so a
 * highlighted surface would be the wrong gesture at this size.
 */
function SidebarCommandButton({ onOpen }: { onOpen: () => void }) {
  const modifier = useModifierLabel();

  return (
    <div className="border-b border-[var(--gray-200)] py-5">
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-2 py-[0.45rem] text-left text-[13px] leading-normal transition-colors"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        <Search
          size={13}
          strokeWidth={1.8}
          aria-hidden="true"
          className="shrink-0 transition-colors group-hover:text-[var(--ink)]"
        />
        <span className="min-w-0 flex-1 truncate transition-colors group-hover:text-[var(--ink)]">
          jump to section
        </span>
        {/**
         * The shortcut is shown on the control, not only in a tooltip: it is the
         * only way a visitor learns the palette has a keyboard shortcut.
         *
         * `py-px` rather than `py-0.5` on purpose, unchanged from when the row
         * had a box: the tag is the tallest thing here, so at `py-0.5` it reached
         * 20px and dragged the row's line box out of step with the 13px label
         * beside it. At `py-px` it is 10px line + 2px padding + 2px border =
         * 14px, and `items-center` puts it level with the icon.
         */}
        <kbd
          className="shrink-0 rounded border border-[var(--gray-300)] px-1 py-px text-[10px] leading-none text-[var(--gray-400)] transition-colors duration-200 group-hover:border-[var(--gray-400)] group-hover:text-[var(--gray-500)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {modifier}
        </kbd>
      </button>
    </div>
  );
}

function SidebarNav({ active, mobile = false, onNavigate }: SidebarNavProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="flex flex-col border-b border-[var(--gray-200)] py-5"
    >
      {NAV_ITEMS.map((item, index) => {
        const isActive = active === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            // "location" is the accurate value for in-page navigation and
            // styles the same as the reference's generic [aria-current].
            aria-current={isActive ? "location" : undefined}
            onClick={onNavigate}
            className={`group relative flex items-baseline gap-[0.35rem] py-[0.45rem] text-[13px] leading-normal tracking-[0.2px] transition-colors ${
              mobile ? "rounded-md pr-3" : ""
            }`}
            style={{
              // Room for the arrow, which is taken out of flow below.
              paddingLeft: "1.1rem",
              color: isActive ? "var(--ink)" : "var(--gray-500)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {/* Absolutely positioned so it never shifts the label, and revealed
                on hover as well as on the active item. */}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-[0.45rem] text-sm transition-all duration-200 ${
                isActive ? "opacity-100" : "opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
              }`}
            >
              →
            </span>
            <span
              className="min-w-[1.5rem] text-[11px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function SidebarIdentity() {
  return (
    <>
      {/* Group 1: profile. No top padding, matching the reference's
          `.sidebar__group:first-child` rule -- the aside's own padding
          supplies that space. */}
      <div className="border-b border-[var(--gray-200)] pb-5">
        <a
          href="#home"
          className="block text-[1.05rem] leading-none lowercase"
          style={{ fontFamily: "var(--font-display)" }}
        >
          marianne napaño
        </a>
        <p
          className="mt-[0.6rem] pt-[0.2rem] text-[11px] uppercase leading-[1.4]"
          style={{ color: "var(--gray-500)", letterSpacing: "1px", fontFamily: "var(--font-mono)" }}
        >
          BSCS · COMPUTER SCIENCE
        </p>
      </div>

      {/* Group 2: location. */}
      <div
        className="flex items-center gap-[0.45rem] border-b border-[var(--gray-200)] py-5 text-[12px] leading-[1.5]"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        <MapPin size={14} strokeWidth={1.7} className="shrink-0" />
        <span>calamba · laguna · ph</span>
      </div>
    </>
  );
}

/**
 * The contact block. Replaces the social icon row the reference layout has
 * here; GitHub/LinkedIn/Instagram still live in the hero, so nothing became
 * unreachable. Sits directly below the last group, which is why it carries no
 * separator of its own.
 *
 * `items-start` rather than `items-center`, and the text is left-aligned: the
 * rest of the sidebar -- identity, location, the numbered nav -- all hangs off
 * the same left edge, and a centred footer was the one block breaking that
 * line. The toggle and the address are `inline-flex`, so they shrink to their
 * content and sit flush once the cross-axis is start-aligned.
 */
function SidebarContact() {
  return (
    <div className="flex flex-col items-start gap-3">
      {/* Full three-way control (system / light / dark, defaulting to system)
          rather than the single-button toggle, which is the design language's
          documented pattern. */}
      <ThemeToggle />

      <p
        className="max-w-[28ch] text-left text-[11px] leading-[1.5]"
        style={{
          color: "var(--gray-500)",
          letterSpacing: "1px",
          fontFamily: "var(--font-mono)",
        }}
      >
        Let&rsquo;s build something together. Get in touch at
      </p>

      {/* The address is the actionable element, so the rule is drawn faintly and
          strengthens on hover, per the link treatment in the design language. */}
      <a
        href={`mailto:${PROFILE.links.email}`}
        className="inline-flex items-center gap-2 text-[12px] underline decoration-dotted decoration-[var(--gray-300)] underline-offset-[3px] transition-colors hover:text-[var(--ink)] hover:decoration-[var(--ink)]"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        <Mail size={13} strokeWidth={1.7} className="shrink-0" />
        <span>{PROFILE.links.email}</span>
      </a>
    </div>
  );
}

function SidebarMobileFooter() {
  return (
    /* `pt-5` only: the drawer previously separated this block from the nav with
       a chat group above it, so the wrapper's own `mt-6` and the extra group
       padding were both spacing against something that is now gone. */
    <div className="pt-5">
      <SidebarContact />
    </div>
  );
}

interface SidebarProps {
  className?: string;
  /** Opens the ⌘K palette. Owned by MainLayout, which renders the modal. */
  onOpenPalette?: () => void;
}

export default function Sidebar({ className = "", onOpenPalette }: SidebarProps) {
  const [active, setActive] = useState<string>("#home");
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.querySelector(item.href)).filter(
      (el): el is Element => Boolean(el)
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Only set overflow hidden on the drawer container, not the entire body,
    // to prevent chat modal and other elements from becoming un-interactable.
    const drawer = document.querySelector('aside');
    if (drawer) {
      drawer.style.overflow = open ? "auto" : "";
    }
    return () => {
      if (drawer) {
        drawer.style.overflow = "";
      }
    };
  }, [open]);

  return (
    <>
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col overflow-hidden border-r px-7 pb-6 pt-7 ${className}`}
        style={{
          width: "var(--sidebar-w)",
          borderColor: "var(--gray-200)",
          backgroundColor: "var(--bg)",
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <SidebarIdentity />
          {/*
            The numbered section list is gone from the rail -- it duplicated the
            palette and made the sidebar the longest thing on the page. The
            palette is the way in now. The list is still rendered in the mobile
            drawer below, where it is the only navigation a touch user has: a
            hamburger that opened a drawer containing one button which opened a
            modal would be strictly worse than not having a drawer.
          */}
          <SidebarCommandButton onOpen={() => onOpenPalette?.()} />
        </div>
        {/* `mt-auto` pins the contact block to the bottom of the flex column,
            mirroring the reference's `.sidebar__foot`. */}
        <div className="mt-auto shrink-0 pt-5">
          <SidebarContact />
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-50 lg:hidden">
        <header
          className="flex items-center justify-between border-b border-[var(--gray-200)] px-5 py-4 backdrop-blur"
          style={{ backgroundColor: "color-mix(in srgb, var(--bg) 90%, transparent)" }}
        >
          <a
            href="#home"
            className="text-sm lowercase"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            marianne napaño
          </a>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <div className="relative">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setOpen(!open)}
                aria-label="Toggle navigation menu"
                aria-expanded={open}
                aria-controls="mobile-nav-menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gray-200)]"
              >
                <span className="flex flex-col items-center justify-center gap-[5px]">
                  <span
                    className={`h-[1.5px] w-5 rounded transition-all duration-300 ${
                      open ? "translate-y-[3.5px] rotate-45" : ""
                    }`}
                    style={{ backgroundColor: "var(--ink)" }}
                  />
                  <span
                    className={`h-[1.5px] w-5 rounded transition-all duration-300 ${
                      open ? "opacity-0" : ""
                    }`}
                    style={{ backgroundColor: "var(--ink)" }}
                  />
                  <span
                    className={`h-[1.5px] w-5 rounded transition-all duration-300 ${
                      open ? "-translate-y-[3.5px] -rotate-45" : ""
                    }`}
                    style={{ backgroundColor: "var(--ink)" }}
                  />
                </span>
              </button>

              <div
                 className={`absolute right-0 top-full mt-2 max-h-[calc(100vh-5rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-[var(--gray-200)] p-5 shadow-lg transition-all duration-200 ${
                  open
                    ? "pointer-events-auto origin-top-right scale-100 opacity-100"
                    : "pointer-events-none origin-top-right scale-95 opacity-0"
                }`}
                style={{ backgroundColor: "var(--bg)" }}
                id="mobile-nav-menu"
                role="dialog"
                aria-label="Navigation menu"
                inert={!open}
              >
                <SidebarIdentity />
                <SidebarNav
                  active={active}
                  mobile
                  onNavigate={() => setOpen(false)}
                />
                <SidebarMobileFooter />
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
