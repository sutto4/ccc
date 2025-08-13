"use client";

import { Search } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import InviteBotButton from "@/components/invite-bot-button";
import { Bot } from "lucide-react";
import UserMenu from "@/components/ui/user-menu";

export default function Topbar() {
  return (
    <div className="flex h-14 items-center justify-between gap-3 px-4">
      <div className="relative w-full max-w-lg">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search…"
          className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-8 py-2 text-sm outline-none ring-0 focus:border-[hsl(var(--primary))]"
        />
      </div>
      <div className="flex items-center gap-2">
        <InviteBotButton
          size="sm"
          variant="default"
          className="font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md hover:scale-105 hover:shadow-lg transition-transform duration-150 flex items-center gap-2"
        >
          <Bot className="h-4 w-4 mr-1" />
          <span>Invite Bot</span>
        </InviteBotButton>
        <ThemeToggle />
        <UserMenu />
      </div>
    </div>
  );
}
