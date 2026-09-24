"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import ScrollTopButton from "./ScrollTopButton";
import ChatWithIan from "../chat/ChatWithIan";

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
      <main id="main-content" className="w-full lg:pl-56 px-5 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      <ScrollTopButton />
      <ChatWithIan />
    </div>
  );
}