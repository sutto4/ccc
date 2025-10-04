"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSharedSession, signIn, signOut } from "@/components/providers";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

function initialsFrom(str?: string | null) {
  if (!str) return "U";
  const words = String(str).trim().split(/\s+/).slice(0, 2);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type UserMenuProps = {
  onGettingStartedClick?: () => void;
};

const UserMenu = React.memo(function UserMenu({ onGettingStartedClick }: UserMenuProps) {
  const { data: session, status } = useSharedSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  
  // Extract guild ID from pathname
  const pathParts = pathname.split('/').filter(Boolean);
  const isInGuild = pathParts[0] === "guilds" && pathParts[1];
  const guildId = isInGuild ? pathParts[1] : null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const name = (session?.user?.name || session?.user?.email || "") as string;
  const initials = useMemo(() => initialsFrom(name), [name]);

  if (status === "loading") {
    return (
      <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border opacity-60" disabled />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("discord")}
        className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] hover:bg-[hsl(var(--card-hover))] hover:border-[hsl(var(--border-hover))] transition-colors duration-200"
        aria-label="User menu"
      >
        <span className="text-xs font-semibold">{initials}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-lg border bg-[hsl(var(--popover))] p-1 shadow-md"
          role="menu"
        >
          <div className="px-3 py-2">
            <div className="text-sm font-medium truncate">{name || "User"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {(session.user as any)?.id ?? ""}
            </div>
          </div>
          <div className="my-1 h-px bg-[hsl(var(--border))]" />
          {guildId && (
            <button
              onClick={() => {
                console.log('[USER-MENU] Getting Started clicked');
                onGettingStartedClick?.();
                setOpen(false);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-blue-500/10 hover:text-blue-600 transition-colors duration-200"
              role="menuitem"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Getting Started
              </div>
            </button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/guilds" })}
            className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-red-500/10 hover:text-red-600 transition-colors duration-200"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
});

UserMenu.displayName = 'UserMenu';
export default UserMenu;
