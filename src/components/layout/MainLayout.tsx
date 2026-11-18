"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import ScrollTopButton from "./ScrollTopButton";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />

      <main
        id="main-content"
        data-dos-container
        tabIndex={-1}
        className="sidebar-offset w-full px-5 pb-8 pt-20 sm:pt-24 lg:px-0 lg:py-12 lg:pr-8"
      >
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>

      <ScrollTopButton />
    </div>
  );
}