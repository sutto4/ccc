"use client";

import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import InviteBotButton from "@/components/invite-bot-button";
import { Bot } from "lucide-react";
import UserMenu from "@/components/ui/user-menu";
import { useState } from "react";
import { useTheme } from "next-themes";

export default function Topbar() {
  const [broken, setBroken] = useState(false)
  const { resolvedTheme } = useTheme()
  return (
    <div className="flex h-18 items-center justify-between gap-3 px-3 md:px-4">
      {/* Branding */}
      <div className="flex items-center gap-2 md:gap-3">
        <img
          key={resolvedTheme}
          src={broken
            ? "/placeholder-logo.svg"
            : resolvedTheme === "dark"
              ? "/brand/serverhub-dark.png"
              : "/brand/serverhub-light.png"}
          alt="ServerHub"
          className="h-12 md:h-14 w-auto object-contain"
          onError={() => setBroken(true)}
        />
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
