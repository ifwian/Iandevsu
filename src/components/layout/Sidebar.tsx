"use client";

import { useEffect, useState } from "react";
import { NAV_ITEMS } from "@/lib/navigation";

interface SidebarNavProps {
  active: string;
  mobile?: boolean;
  onNavigate?: (id: string) => void;
}

// Default export for MainLayout's <Sidebar />
const SidebarNav = ({
  active = "#home",
  mobile = false,
  onNavigate,
}: SidebarNavProps) => {
  const [internalActive, setInternalActive] = useState<string>(active);

  useEffect(() => {
    setInternalActive(active || "#home");
  }, [active]);

  return (
    <nav
      aria-label="Primary navigation"
      className="flex flex-col border-b border-[var(--gray-200)] py-5"
    >
      {NAV_ITEMS.map((item, index) => {
        const isActive = internalActive === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            // "location" is the accurate value for in-page navigation and
            // styles the same as the reference's generic [aria-current].
            aria-current={isActive ? "location" : undefined}
            onClick={() => onNavigate?.(item.href)}
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
};

export default SidebarNav;