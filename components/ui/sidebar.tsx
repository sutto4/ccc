"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Server, Settings } from "lucide-react";
import Image from "next/image";

type Item = { href: string; label: string; icon: React.ComponentType<any> };

const NAV: Item[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/guilds", label: "Guilds", icon: Server },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="relative h-6 w-6 overflow-hidden rounded">
          <Image alt="DSM" src="/favicon.ico" fill />
        </div>
        <span className="font-semibold tracking-tight">Discord Server Manager</span>
      </div>

      {/* Nav */}
      <nav className="mt-2 flex-1 space-y-1 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={[
                "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]"
                  : "text-[hsl(var(--sidebar-foreground-muted))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))]",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Settings */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-2">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground-muted))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))]"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
