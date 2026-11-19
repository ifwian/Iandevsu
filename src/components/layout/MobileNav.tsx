"use client";

import { Camera, FolderGit2, GraduationCap, Home, Layers } from "lucide-react";
import { anchorClick } from "@/lib/anchorNav";
import "./mobile-nav.css";

/* The five sections worth a thumb-reach shortcut. The blog is the last thing on
   the page and stays reachable by scrolling; the desktop rail lists all six. */
const ITEMS = [
  { href: "#home", label: "Home", Icon: Home },
  { href: "#projects", label: "Projects", Icon: FolderGit2 },
  { href: "#stack", label: "Tech stack", Icon: Layers },
  { href: "#education", label: "Education", Icon: GraduationCap },
  { href: "#life", label: "Outside the IDE", Icon: Camera },
] as const;

/**
 * Floating pill navigation for screens below `lg`. It replaces the top bar and
 * its dropdown menu: nothing opens, nothing covers the page, and the active
 * section is the inverted chip. Hidden from 1024px up, where the rail takes over.
 */
export default function MobileNav({ active, onNavigate }: { active: string; onNavigate: (href: string) => void }) {
  return (
    <nav className="mnav" aria-label="Primary navigation" data-dos-avoid>
      <ul className="mnav__list">
        {ITEMS.map(({ href, label, Icon }) => (
          <li key={href}>
            <a
              href={href}
              className="mnav__link"
              aria-label={label}
              aria-current={active === href ? "location" : undefined}
              data-active={active === href ? "true" : undefined}
              onClick={(e) => {
                anchorClick(e, href);
                onNavigate(href);
              }}
            >
              <Icon size={18} strokeWidth={1.6} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
