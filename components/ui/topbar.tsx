"use client";

import { Search } from "lucide-react";
// import { ThemeToggle } from "@/components/theme-toggle";
import InviteBotButton from "@/components/invite-bot-button";
import { Bot } from "lucide-react";
import UserMenu from "@/components/ui/user-menu";
// import { useTheme } from "next-themes";

export default function Topbar() {
  // const { resolvedTheme } = useTheme()
  return (
    <div className="flex h-18 items-center justify-between gap-3 px-3 md:px-4">
      {/* Branding */}
      <div className="flex items-center gap-2 md:gap-3">
        <img
          src="/brand/sm-light.png"
          alt="ServerMate"
          className="h-12 md:h-18 w-auto object-contain"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            console.log('ServerMate logo failed to load from:', img.src, 'trying alternatives...');

            if (img.src.includes('/brand/sm-light.png')) {
              console.log('Trying: /sm-light.png');
              img.src = '/sm-light.png';
            } else if (img.src.includes('/sm-light.png')) {
              console.log('Trying: /brand/sm-dark.png');
              img.src = '/brand/sm-dark.png';
            } else if (img.src.includes('/brand/sm-dark.png')) {
              console.log('Trying: /sm-dark.png');
              img.src = '/sm-dark.png';
            } else if (img.src.includes('/sm-dark.png')) {
              console.log('Trying: /placeholder-logo.png');
              img.src = '/placeholder-logo.png';
            } else {
              console.log('All image paths failed, falling back to text logo');
              const parent = img.parentElement;
              if (parent) {
                parent.innerHTML = '<span class="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">ServerMate</span>';
              }
            }
          }}
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
        {/* Theme toggle temporarily disabled */}
        <UserMenu />
      </div>
    </div>
  );
}
