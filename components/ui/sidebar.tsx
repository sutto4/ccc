"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Server, Settings, Shield, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchFeatures, type FeaturesResponse } from "@/lib/api";

type Item = { href: string; label: string; icon: React.ComponentType<any> };

const TOP: Item[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/guilds", label: "Guilds", icon: Server },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [customGroupsEnabled, setCustomGroupsEnabled] = useState<boolean | null>(null);

  // detect if we're inside a guild route
  const parts = pathname.split("/").filter(Boolean);
  const inGuild = parts[0] === "guilds" && parts[1];
  const guildId = inGuild ? parts[1] : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!guildId) {
        setCustomGroupsEnabled(null);
        return;
      }
      try {
        const fx: FeaturesResponse = await fetchFeatures(guildId);
        if (!alive) return;
        setCustomGroupsEnabled(Boolean(fx?.features?.custom_groups));
      } catch {
        if (!alive) return;
        setCustomGroupsEnabled(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [guildId]);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center px-4">
        <span className="font-semibold tracking-tight">Discord Server Manager</span>
      </div>

      {/* Top-level nav */}
      <nav className="mt-2 px-2">
        {TOP.map(({ href, label, icon: Icon }) => {
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

      {/* Contextual subnav for a specific guild */}
      {inGuild && guildId && (
        <div className="mt-4 px-2">
          <div className="px-3 pb-1 text-xs uppercase tracking-wide text-[hsl(var(--sidebar-foreground-muted))]">
            Guild
          </div>
          <div className="space-y-1">
            {/* Users */}
            <NavLeaf
              href={`/guilds/${guildId}/users`}
              label="Users"
              active={pathname.startsWith(`/guilds/${guildId}/users`)}
            />
            {/* Roles */}
            <NavLeaf
              href={`/guilds/${guildId}/roles`}
              label="Roles"
              active={pathname.startsWith(`/guilds/${guildId}/roles`)}
            />
            {/* Custom Groups (premium indicator on the right) */}
            <NavLeaf
              href={`/guilds/${guildId}/members`}
              label="Custom Groups"
              active={pathname.startsWith(`/guilds/${guildId}/members`)}
              rightIcon={<Crown className="h-3.5 w-3.5" />}
              disabled={customGroupsEnabled === false}
              title={customGroupsEnabled === false ? "Premium feature" : "Custom Groups"}
            />
          </div>
        </div>
      )}

      {/* Footer / Settings */}
      <div className="mt-auto border-t border-[hsl(var(--sidebar-border))] p-2">
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

function NavLeaf({
  href,
  label,
  active,
  rightIcon,
  disabled,
  title,
}: {
  href: string;
  label: string;
  active?: boolean;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  const base =
    "group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition";
  const cls = active
    ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]"
    : "text-[hsl(var(--sidebar-foreground-muted))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))]";
  const content = (
    <div className="flex w-full items-center justify-between">
      <div className="truncate">{label}</div>
      {rightIcon && (
        <span
          className={[
            "ml-2 inline-flex items-center",
            active ? "" : "text-[hsl(var(--sidebar-foreground-muted))]",
          ].join(" ")}
        >
          {rightIcon}
        </span>
      )}
    </div>
  );

  if (disabled) {
    return (
      <div
        className={`${base} ${cls} opacity-60 cursor-not-allowed`}
        title={title || label}
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={`${base} ${cls}`} title={title || label}>
      {content}
    </Link>
  );
}
