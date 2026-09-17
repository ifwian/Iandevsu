"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import ScrollTopButton from "./ScrollTopButton";
import ChatWithIan from "../chat/ChatWithIan";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Wrap Sidebar in a wrapper div instead of passing className directly */}
      <div className="w-56 shrink-0">
        <Sidebar />
      </div>

      <main id="main-content" className="flex-1 flex flex-col items-center px-6 py-12">
        <div className="w-full flex-1 flex flex-col items-center">
          {children}
        </div>
        <Footer />
      </main>

      <ScrollTopButton />
      <ChatWithIan />
    </div>
  );
}