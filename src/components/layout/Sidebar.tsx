"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, FileText, Mail, MapPin } from "lucide-react";
import { PROFILE } from "@/content/profile";
import { NAV_ITEMS } from "@/lib/navigation";
import { SOCIAL_ITEMS } from "@/lib/socials";
import ThemeToggle from "./ThemeToggle";

interface SidebarNavProps {
  active: string;
  mobile?: boolean;
  onNavigate?: () => void;
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

      {/* Group 3: availability. A third bordered group rather than a second line
          inside the location block, so it reads as its own fact: where she is,
          and what she is open to, are two different answers.

          The dot is the only coloured thing in the rail and it is `--ink`, not a
          green: the site's one sanctioned accent is reserved for the chat's
          conversation statuses, and reusing it here would make a static line
          look like a live state it is not. Meaning does not depend on it -- the
          words say it outright.

          `.clinerules` treats colour as the wrong instrument for emphasis, so
          the dot is a mark and the emphasis is the `open to` label, which is
          what a visitor reads. */}
      <div
        className="flex items-center gap-[0.45rem] border-b border-[var(--gray-200)] py-5 text-[12px] leading-[1.5]"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: "var(--ink)" }}
        />
        <span>
          open to <span style={{ color: "var(--ink)" }}>opportunities</span>
        </span>
      </div>
    </>
  );
}

/**
 * The primary action, above the footer's divider.
 *
 * A pill rather than the mailto link, because it is the rail's one call to
 * action and the mailto below it is a fallback for when a visitor has no mail
 * client. Renders only when `PROFILE.links.resume` is filled in -- see the note
 * there -- so the rail never shows a button that goes nowhere.
 *
 * `.terminal-pill` rather than a bespoke box: the hero's chips and the social
 * row's hover already speak that vocabulary, and a second pill shape in the
 * rail would read as a different kind of control.
 */
function SidebarResumeAction() {
  const resume = PROFILE.links.resume;
  if (!resume) return null;

  return (
    <a
      href={resume}
      target="_blank"
      rel="noopener noreferrer"
      className="terminal-pill group w-full justify-center"
    >
      <FileText size={13} aria-hidden="true" />
      <span>view resume</span>
      <ArrowUpRight
        size={11}
        strokeWidth={1.7}
        aria-hidden="true"
        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </a>
  );
}

/**
 * The social row and the theme toggle, in one line at the bottom of the rail.
 *
 * The three marks come from `lib/socials`, which the hero also reads, so the two
 * surfaces cannot end up pointing at different accounts.
 *
 * Each link is icon-only and carries its name in `aria-label`, which is what the
 * markup needs here: a `title` would be the only thing naming these on hover and
 * it is unavailable to touch and to a screen reader in the same way. The row is
 * `justify-between` with the toggle last, so the toggle lands in the corner and
 * the marks space evenly along the rail's width rather than huddling at the
 * left edge.
 */
function SidebarSocialRow() {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--gray-500)] transition-colors duration-200 hover:bg-[var(--gray-100)] hover:text-[var(--ink)]"
          >
            <Icon size={15} />
          </a>
        ))}
      </div>
      {/* `compact` because the full three-way control is a labelled segmented
          row that would wrap a 16rem rail on its own; here it has the icons to
          sit beside. */}
      <ThemeToggle compact />
    </div>
  );
}

/**
 * The contact block, pinned to the bottom of the rail.
 *
 * `items-start` rather than `items-center`, and the text is left-aligned: the
 * rest of the sidebar -- identity, location, availability, the numbered nav --
 * all hangs off the same left edge, and a centred footer was the one block
 * breaking that line.
 */
function SidebarContact() {
  return (
    <div className="flex flex-col items-start gap-3">
      <SidebarResumeAction />

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

      {/* The social row is last, below a divider of its own: it is a set of
          utility links rather than part of the contact sentence above it, and a
          hairline is what says so without adding a label. */}
      <div className="w-full border-t border-[var(--gray-200)] pt-3">
        <SidebarSocialRow />
      </div>
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
}

export default function Sidebar({ className = "" }: SidebarProps) {
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
            The numbered list is the rail's only navigation. The "jump to
            section" button that used to sit below it is gone: it opened the
            command palette, which is reachable from anywhere on ⌘K / ctrl K
            because `MainLayout` binds that chord on the document rather than on
            this control. Two affordances for eight sections was one too many,
            and the button was the redundant one -- the list shows every section
            without a modal, and it marks where you already are.

            The cost is discoverability: nothing on the page now advertises the
            palette, so it is a shortcut for people who already know it exists.

            The list's own `border-b` is the divider to the footer, and the
            footer's `pt-5` below is the gap under it, so the rail still breaks
            into three groups -- identity, navigation, contact -- with nothing
            stranded between them.

            `min-h-0` on the wrapper above is what keeps this honest: the rail is
            a flex column, and a flex item's default `min-height: auto` would
            refuse to shrink below the list's height, pushing the footer off the
            bottom of a short viewport instead of letting this area scroll.
          */}
          <SidebarNav active={active} />
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