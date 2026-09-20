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
      <div className="w-0 lg:w-56 shrink-0 lg:shrink">
        <Sidebar />
      </div>

      {/* Main content wrapper */}
      <main id="main-content" className="flex-1 px-4 sm:px-5 py-8 sm:py-12">  
        <div className="w-full">
          {children}
        </div>
      </main>

      <ScrollTopButton />
      <ChatWithIan />
    </div>
  );
}