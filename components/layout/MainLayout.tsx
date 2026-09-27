"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import ScrollTopButton from "./ScrollTopButton";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      {/* No font utility on the wrapper on purpose. `font-geist-mono` was never
          a real class in this project, so it was silently doing nothing. Each
          section picks its own role (--font-mono / --font-display /
          --font-serif) and everything else inherits Geist from `body`. */}
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Sidebar wrapper */}
        <div className="w-0 shrink-0">
          <Sidebar />
        </div>

        {/* Main content wrapper. `sidebar-offset` replaces the old `lg:pl-80`;
            it reads --sidebar-w so it cannot drift from the sidebar width. */}
        <main
          id="main-content"
          className="sidebar-offset w-full px-5 pb-8 pt-20 sm:pt-24 lg:px-0 lg:py-12 lg:pr-8"
        >
          {/* The page-level measure, and the only one that applies to all three
              routes. Individual sections carry their own
              `w-full max-w-4xl mx-auto`, which cannot bind past this cap -- so
              this is what actually sets the column width on the home page.

              It is also what currently holds /chat-inbox at 4xl: that page asks
              for `max-w-[1600px]` and is clamped by this wrapper. Removing this
              cap as "redundant" would silently widen the inbox, so don't. */}
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>

        <ScrollTopButton />
      </div>
    </>
  );
}
