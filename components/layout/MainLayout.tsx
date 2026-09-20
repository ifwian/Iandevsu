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
    <div className="flex min-h-screen">
      {/* Sidebar wrapper */}
      <div className="w-56 shrink-0">
        <Sidebar />
      </div>

      {/* Main content wrapper */}
      <main id="main-content" className="flex-1 px-6 py-12">  
        <div className="w-full">
          {children}
        </div>
      </main>

      <ScrollTopButton />
      <ChatWithIan />
    </div>
  );
}
