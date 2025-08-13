"use client";
import { PropsWithChildren } from "react";
import Sidebar from "@/components/ui/sidebar";
import Topbar from "@/components/ui/topbar";

export default function ConsoleShell({ children }: PropsWithChildren) {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] grid-rows-[56px_1fr]">
      <aside className="row-span-2 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))]">
        <Sidebar />
      </aside>
      <header className="sticky top-0 z-40 bg-[hsl(var(--header))] text-[hsl(var(--header-foreground))] border-b border-[hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--header))]/80">
        <Topbar />
      </header>
      <main className="p-4 md:p-6 bg-background text-foreground overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
