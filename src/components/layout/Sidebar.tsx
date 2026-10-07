"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, Search } from "lucide-react";
import { PROFILE } from "@/content/profile";
import { NAV_ITEMS } from "@/lib/navigation";
import ChatWithIan from "@/components/chat/ChatWithIan";
import LiveStatus from "./LiveStatus";
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
 * Terminal-styled on purpose -- bracketed label, monospace, a `>` prompt glyph --
 * to match the rest of the sidebar's register rather than looking like a web
 * button dropped into it.
 *
 * The hover is a border and text colour change, not a fill. `.clinerules` is
 * explicit that emphasis here comes from inversion or typography and never from
 * a new colour, and a filled button would also be the loudest thing in a rail
 * that is otherwise hairline rules and 11px mono.
 */
function SidebarCommandButton({ onOpen }: { onOpen: () => void }) {
  const modifier = useModifierLabel();

  return (
    <div className="border-b border-[var(--gray-200)] py-5">
      <button
        type="button"
        onClick={onOpen}
        /**
         * Deliberately the same box as the "chat with Ian" button below it, so
         * the two read as one control family: same `rounded-lg`, same
         * `px-3 py-2.5`, same `text-xs`, same 14px icon, same `--gray-50` fill.
         *
         * `leading-none` is what actually pins the height. Without it the label
         * sits in a ~1.5 line box and the button comes out a few pixels taller
         * than its neighbour -- the earlier version of this looked misaligned
         * precisely because it was missing this one class.
         */
        className="group flex w-full items-center gap-2 rounded-lg border border-[var(--gray-300)] px-3 py-2.5 text-left text-xs leading-none transition-colors duration-200 hover:border-[var(--ink)]"
        style={{ backgroundColor: "var(--gray-50)", color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        <Search
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
          className="shrink-0 transition-colors duration-200 group-hover:text-[var(--ink)]"
        />
        <span className="min-w-0 flex-1 truncate transition-colors duration-200 group-hover:text-[var(--ink)]">
          jump to section
        </span>
        {/**
         * The shortcut is shown on the control, not only in a tooltip: it is the
         * only way a visitor learns the palette has a keyboard shortcut.
         *
         * `py-px` rather than `py-0.5` on purpose. This tag is the tallest thing
         * in the row, so its height is what sets the button's height: 10px line
         * + 2px padding + 2px border = 14px, exactly the icon beside it. At
         * `py-0.5` it reached 20px and pushed the button back out of alignment
         * with the chat button, which is what this whole control was resized to
         * match.
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

/** The chat trigger, grouped like every other section. */
function SidebarActions({ className = "" }: { className?: string }) {
  return (
    <div className={`border-b border-[var(--gray-200)] py-5 ${className}`.trim()}>
      <ChatWithIan variant="sidebar" />
    </div>
  );
}

function SidebarMobileFooter() {
  return (
    <div className="mt-6">
      <SidebarActions className="border-b-0 pb-0" />
      {/* Same clock and status line as the desktop rail, so the drawer is not a
          stripped-down version of the sidebar it stands in for. */}
      <div className="pt-5">
        <LiveStatus status="building v2 portfolio" />
      </div>
      <div className="pt-5">
        <SidebarContact />
      </div>
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
          {/* The status readout is a group like every other block in the rail --
              same divider, same `py-5` -- rather than three loose lines sitting
              in the gap between two bordered sections. Without its own border
              and padding it read as overflow from the button above it. */}
          <div className="border-b border-[var(--gray-200)] py-5">
            <LiveStatus status="building v2 portfolio" />
          </div>
          <SidebarActions />
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
                type="button"
                onClick={() => setOpen(!open)}
                aria-label="Toggle navigation menu"
                aria-expanded={open}
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
                role="dialog"
                aria-label="Navigation menu"
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
