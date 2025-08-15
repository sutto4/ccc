"use client";

import { PropsWithChildren } from "react";
import Sidebar from "@/components/ui/sidebar";
import Topbar from "@/components/ui/topbar";

export default function ConsoleShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      {/* Sidebar - full height, behind everything */}
      <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] z-20">
        <Sidebar />
      </aside>

      {/* Top bar - full width, on top */}
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-[hsl(var(--header))] text-[hsl(var(--header-foreground))] border-b border-[hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--header))]/80 z-50">
        <Topbar />
      </header>

      {/* Main content - positioned to the right of sidebar, below top bar */}
      <main className="ml-[240px] pt-[72px] pl-4 pr-4 md:pr-6 pb-6 bg-background text-foreground overflow-x-hidden">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
