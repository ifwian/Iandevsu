"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import ScrollTopButton from "./ScrollTopButton";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen font-geist-mono">
      {/* Sidebar wrapper */}
      <div className="w-0 shrink-0">
        <Sidebar />
      </div>

      {/* Main content wrapper */}
      <main id="main-content" className="w-full px-5 pb-8 pt-20 sm:pt-24 lg:px-0 lg:py-12 lg:pl-80 lg:pr-8">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      <ScrollTopButton />
    </div>
  );
}