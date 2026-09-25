"use client";

import { useEffect, useState, type ComponentType } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import GithubIcon from "@/components/icons/GithubIcon";
import ChatWithIan from "@/components/chat/ChatWithIan";
import ThemeToggle from "./ThemeToggle";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "#home", label: "home" },
  { href: "#about", label: "about" },
  { href: "#projects", label: "projects" },
  { href: "#stack", label: "stack" },
  { href: "#education", label: "education" },
  { href: "#life", label: "life" },
  { href: "#github", label: "github" },
  { href: "#blog", label: "blog" },
];

interface SocialIconProps {
  size?: number;
  className?: string;
}

type SocialIcon = ComponentType<SocialIconProps>;

interface SocialItem {
  label: string;
  href: string;
  Icon: SocialIcon;
}

const SOCIAL_ITEMS: SocialItem[] = [
  { label: "github", href: "https://github.com/ifwian", Icon: GithubIcon },
  { label: "linkedin", href: "https://www.linkedin.com/in/ifwiannn/", Icon: LinkedinIcon },
  { label: "instagram", href: "https://www.instagram.com/ifwiannn/", Icon: InstagramIcon },
];

function LinkedinIcon({ size = 16, className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 8.5V18" />
      <path d="M6 5.5v.01" />
      <path d="M10 18v-5.25a3.25 3.25 0 0 1 6.5 0V18" />
      <path d="M10 12.5V18" />
    </svg>
  );
}

function InstagramIcon({ size = 16, className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface SidebarNavProps {
  active: string;
  mobile?: boolean;
  onNavigate?: () => void;
}

function SidebarNav({ active, mobile = false, onNavigate }: SidebarNavProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className={mobile ? "mt-5 flex flex-col gap-1" : "mt-5 flex flex-col"}
    >
      {NAV_ITEMS.map((item, index) => {
        const isActive = active === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={isActive ? "location" : undefined}
            onClick={onNavigate}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = isActive ? "var(--ink)" : "var(--gray-400)";
            }}
            className={`group flex items-center gap-3 py-2 text-sm leading-tight transition-colors ${
              mobile ? "rounded-md px-3" : ""
            }`}
            style={{
              color: isActive ? "var(--ink)" : "var(--gray-400)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span className="w-5 shrink-0 text-[10px] tracking-[0.08em] opacity-70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              aria-hidden="true"
              className="w-4 shrink-0 text-right text-sm"
              style={{ visibility: isActive ? "visible" : "hidden" }}
            >
              →
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
    <div>
      <a
        href="#home"
        className="block text-[17px] leading-tight lowercase"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        marianne napaño
      </a>
      <p
        className="mt-2 text-[10px] tracking-[0.18em]"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        BSCS · COMPUTER SCIENCE
      </p>

      <div className="mt-5 border-t border-[var(--gray-200)]" />

      <div
        className="flex items-center gap-2 py-3 text-[11px]"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        <MapPin size={14} strokeWidth={1.7} className="shrink-0" />
        <span>calamba · laguna · ph</span>
      </div>

      <div className="border-t border-[var(--gray-200)]" />
    </div>
  );
}

interface SidebarFooterProps {
  mobile?: boolean;
}

function SidebarFooter({ mobile = false }: SidebarFooterProps) {
  return (
    <div className={mobile ? "mt-6" : "shrink-0 pt-5"}>
      <div className="space-y-2">
        <ChatWithIan variant="sidebar" />
        <a
          href="/resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between border border-[var(--gray-300)] px-4 py-2.5 text-xs leading-none tracking-[0.08em] transition-colors hover:border-[var(--ink)]"
          style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}
        >
          <span>view resume</span>
          <ArrowUpRight size={14} strokeWidth={1.7} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--gray-200)] pt-4">
        <div className="flex shrink-0 items-center gap-2">
          {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:text-[var(--ink)]"
              style={{ color: "var(--gray-500)" }}
            >
              <Icon size={15} />
            </a>
          ))}
        </div>
        <ThemeToggle compact />
      </div>
    </div>
  );
}

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
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
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen w-80 flex-col overflow-hidden border-r px-6 py-6 ${className}`}
        style={{ borderColor: "var(--gray-200)", backgroundColor: "var(--bg)" }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <SidebarIdentity />
          <SidebarNav active={active} />
        </div>
        <SidebarFooter />
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
                <SidebarFooter mobile />
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
