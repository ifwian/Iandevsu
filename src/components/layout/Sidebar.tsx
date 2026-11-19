"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, MapPin, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import { SOCIAL_ITEMS } from "@/lib/socials";
import { PROFILE } from "@/content/profile";
import { useSidebarState } from "@/lib/useSidebarState";
import ThemeToggle from "./ThemeToggle";
import { RailTooltip, useRailTooltip } from "./RailTooltip";
import "./sidebar.css";

interface SidebarProps {
  /** Section that is highlighted until the scroll-spy reports a different one. */
  active?: string;
}

type TipProps = ReturnType<typeof useRailTooltip>["tipProps"];

const SECTION_IDS = NAV_ITEMS.map((item) => item.href);
const pad = (n: number) => String(n).padStart(2, "0");

/** Name + tagline; a single initial when the rail is collapsed. */
function Brand({ collapsed = false, withTagline = false, tipProps }: { collapsed?: boolean; withTagline?: boolean; tipProps?: TipProps }) {
  if (collapsed) {
    return (
      <a
        href="#home"
        aria-label={`${PROFILE.name}, back to top`}
        className="rail__name rail__name--mono"
        {...tipProps?.(PROFILE.name.toLowerCase())}
      >
        {PROFILE.name.trim().charAt(0).toLowerCase()}
      </a>
    );
  }
  return (
    <div className="rail__brand">
      <a href="#home" aria-label="Back to top" className="rail__name">
        {PROFILE.name}
      </a>
      {withTagline ? <p className="rail__tag">{PROFILE.tagline}</p> : null}
    </div>
  );
}

/**
 * The section list, shared by the rail (expanded: numbered; collapsed: icons +
 * tooltips) and the mobile menu. The label always stays in the DOM, so the
 * accessible name is the same in every state.
 */
function NavList({
  active,
  onNavigate,
  collapsed = false,
  tipProps,
}: {
  active: string;
  onNavigate: (href: string) => void;
  collapsed?: boolean;
  tipProps?: TipProps;
}) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-col">
      {NAV_ITEMS.map(({ href, label, Icon }, index) => (
        <a
          key={href}
          href={href}
          aria-current={active === href ? "location" : undefined}
          onClick={() => onNavigate(href)}
          className="rail__link"
          {...(collapsed ? tipProps?.(label) : {})}
        >
          {collapsed ? (
            <Icon size={18} strokeWidth={1.6} className="rail__link-icon" />
          ) : (
            <span aria-hidden="true" className="rail__link-num">
              {pad(index + 1)}
            </span>
          )}
          <span className="rail__text">{label}</span>
        </a>
      ))}
    </nav>
  );
}

function Socials({ tipProps }: { tipProps?: TipProps }) {
  return (
    <ul className="rail__socials">
      {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={tipProps ? undefined : label}
            className="rail__icon"
            {...tipProps?.(label)}
          >
            <Icon size={17} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function ResumeButton({ collapsed, tipProps }: { collapsed: boolean; tipProps?: TipProps }) {
  const resume = PROFILE.links.resume;
  if (!resume) return null; // no dead link until a URL is set in profile.ts
  return (
    <a
      href={resume}
      target="_blank"
      rel="noopener noreferrer"
      className="rail__resume"
      {...(collapsed ? tipProps?.("view resume") : {})}
    >
      <FileText size={collapsed ? 16 : 13} aria-hidden="true" />
      <span className="rail__text">view resume</span>
    </a>
  );
}

/**
 * Site chrome. From `lg` up: a fixed left rail that collapses to an icon rail
 * (state + persistence in useSidebarState, width in the `--sidebar-w` token, so
 * the content offset follows with no measuring). Below `lg`: a fixed top bar
 * with a menu (the 68px bar height is what `section[id]`'s scroll-margin in
 * theme.css assumes). Both read NAV_ITEMS; the highlighted item comes from an
 * IntersectionObserver over the sections.
 */
export default function Sidebar({ active = "#home" }: SidebarProps) {
  const [current, setCurrent] = useState<string>(active);
  const [menuOpen, setMenuOpen] = useState(false);
  const { collapsed, toggle } = useSidebarState();
  const { tip, tipProps } = useRailTooltip(collapsed);
  const topbarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = `#${(entry.target as HTMLElement).id}`;
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        const first = SECTION_IDS.find((id) => visible.has(id));
        if (first) setCurrent(first);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );

    for (const id of SECTION_IDS) {
      const el = document.querySelector(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // Mobile menu: Escape closes it and hands focus back to the button; so does
  // pressing outside the bar.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  const go = (href: string) => {
    setCurrent(href);
    setMenuOpen(false);
  };

  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <>
      {/* Desktop rail */}
      <aside id="site-rail" className={`rail${collapsed ? " rail--collapsed" : ""}`} aria-label="Site sidebar">
        <div className="rail__block rail__block--brand">
          <Brand collapsed={collapsed} withTagline tipProps={tipProps} />
          <button
            type="button"
            className="rail__toggle"
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            aria-controls="site-rail"
            aria-keyshortcuts="Control+B Meta+B"
            onClick={toggle}
            {...(collapsed ? tipProps(toggleLabel) : {})}
          >
            <ToggleIcon size={16} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>

        <div className="rail__block rail__block--tight">
          {PROFILE.availability ? (
            <p className="rail__meta" {...(collapsed ? tipProps(PROFILE.availability) : {})}>
              <span className="rail__dot" aria-hidden="true" />
              <span className="rail__text">{PROFILE.availability}</span>
            </p>
          ) : null}
          <p className="rail__meta" {...(collapsed ? tipProps(PROFILE.location.toLowerCase()) : {})}>
            <MapPin size={13} aria-hidden="true" />
            <span className="rail__text">{PROFILE.location.toLowerCase()}</span>
          </p>
        </div>

        <div className="rail__block rail__block--nav">
          <NavList active={current} onNavigate={go} collapsed={collapsed} tipProps={tipProps} />
        </div>

        {PROFILE.links.resume ? (
          <div className="rail__block">
            <ResumeButton collapsed={collapsed} tipProps={tipProps} />
          </div>
        ) : null}

        <div className="rail__block rail__block--last">
          <div className="rail__foot">
            <Socials tipProps={collapsed ? tipProps : undefined} />
            <ThemeToggle bare compact />
          </div>
        </div>
      </aside>
      <RailTooltip tip={tip} />

      {/* Mobile top bar */}
      <header className="topbar" ref={topbarRef}>
        <div className="topbar__row">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:text-[var(--ink)]"
            >
              {menuOpen ? <X size={16} strokeWidth={1.7} /> : <Menu size={16} strokeWidth={1.7} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div id="mobile-nav" className="topbar__menu">
            <NavList active={current} onNavigate={go} />
            <div className="rail__block" style={{ borderBottom: 0 }}>
              <Socials />
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
