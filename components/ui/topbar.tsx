"use client";

import { Search } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import InviteBotButton from "@/components/invite-bot-button";
import { Bot } from "lucide-react";
import UserMenu from "@/components/ui/user-menu";

export default function Topbar() {
  return (
    <div className="flex h-18 items-center justify-between gap-4 px-4">
      {/* Branding */}
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow" />
        <div className="font-extrabold tracking-tight text-xl">DuckCord Admin</div>
      </div>
      {/* Actions */}
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
