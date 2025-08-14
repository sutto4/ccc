"use client";
// CollapsibleSection component
function CollapsibleSection({ title, defaultOpen = true, children }: { title: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-2">
      <button
        className="w-full text-left font-bold px-3 py-2 rounded-md flex items-center justify-between bg-transparent hover:bg-[hsl(var(--sidebar-hover))]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="ml-2">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="pl-2">
          {children}
        </div>
      )}
    </div>
  );
}
import * as React from "react";
import PremiumModal from "@/components/premium-modal";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { Home, Server, Settings, Shield, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchFeatures, type FeaturesResponse } from "@/lib/api";

type Item = { href: string; label: string; icon: React.ComponentType<any> };

const TOP: Item[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/guilds", label: "My Servers", icon: Server },
];

export default function Sidebar() {
  const pathname = usePathname() || "";
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);

  // detect if we're inside a guild route
  const parts = pathname.split("/").filter(Boolean);
  const inGuild = parts[0] === "guilds" && parts[1];
  const guildId = inGuild ? parts[1] : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!guildId) {
        setFeatures(null);
        return;
      }
      try {
        const fx: FeaturesResponse = await fetchFeatures(guildId);
        if (!alive) return;
        setFeatures(fx?.features || {});
      } catch {
        if (!alive) return;
        setFeatures({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [guildId]);

  return (
    <div className="fixed left-0 top-0 h-screen flex flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))] w-[240px] min-w-[240px] max-w-[240px] border-r border-[hsl(var(--sidebar-border))] z-30">
      <nav className="flex-1 overflow-y-auto p-2">
        {TOP.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={["group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition", pathname === href ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]" : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-accent-foreground))]"].join(" ")}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
        {/* Community section (collapsible) */}
        <CollapsibleSection title={<span className="font-bold">Community</span>} defaultOpen>
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/users` : "#"}
            label="Users"
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/users`) : false}
            featureEnabled={true}
            guildSelected={true}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/roles` : "#"}
            label="Roles"
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/roles`) : false}
            featureEnabled={true}
            guildSelected={true}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/members` : "#"}
            label="Custom Groups"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/members`) : false}
            featureEnabled={!!(guildId && features?.custom_groups)}
            guildSelected={!!guildId}
          />
        </CollapsibleSection>
        {/* FiveM Frameworks (premium, collapsible) */}
        <CollapsibleSection title={<span className="font-bold">FiveM</span>} defaultOpen>
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/esx` : "#"}
            label="ESX"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/esx`) : false}
            featureEnabled={!!(guildId && features?.esx)}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/qbcore` : "#"}
            label="QBcore"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/qbcore`) : false}
            featureEnabled={!!(guildId && features?.qbcore)}
            guildSelected={!!guildId}
          />
        </CollapsibleSection>
        {/* Dummy nav items (collapsible) */}
        <CollapsibleSection title={<span className="font-bold">Tools</span>} defaultOpen>
          <NavLeaf
            href="#"
            label="Embeded Messages"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            featureEnabled={!!(guildId && features?.embeded_messages)}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/reaction-roles` : "#"}
            label="Reaction Roles"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            featureEnabled={!!(guildId && features?.reaction_roles)}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href="#"
            label="Custom Commands"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            featureEnabled={!!(guildId && features?.custom_commands)}
            guildSelected={!!guildId}
          />
        </CollapsibleSection>
        {/* Socials (premium, collapsible) */}
        <CollapsibleSection title={<span className="font-bold">Creator Alerts</span>} defaultOpen>
          <NavLeaf
            href="#"
            label="Twitch"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            featureEnabled={!!(guildId && features?.creator_alerts)}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href="#"
            label="Youtube"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            featureEnabled={!!(guildId && features?.creator_alerts)}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href="#"
            label="X"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            featureEnabled={!!(guildId && features?.creator_alerts)}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href="#"
            label="Tiktok"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            featureEnabled={!!(guildId && features?.creator_alerts)}
            guildSelected={!!guildId}
          />
        </CollapsibleSection>
      </nav>
      {/* Footer / Settings */}
  <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground-muted))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))] w-full">
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[100] bg-popover border shadow-lg">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <Link href={guildId ? `/guilds/${guildId}/settings/logs` : "/guilds"} passHref legacyBehavior>
              <DropdownMenuItem asChild>
                <a>View Logs</a>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type NavLeafProps = {
  href: string;
  label: React.ReactNode;
  active?: boolean;
  rightIcon?: React.ReactNode;
  featureEnabled?: boolean; // true if guild has feature
  guildSelected?: boolean; // true if a guild is selected
  onClick?: () => void;
};

function NavLeaf({
  href,
  label,
  active,
  rightIcon,
  featureEnabled,
  guildSelected,
  onClick,
}: NavLeafProps) {
  const base =
    "group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition select-none w-full relative";
  // Determine if feature is available
  const isAvailable = guildSelected ? featureEnabled : false;
  const isGreyed = !isAvailable;
  // Muted color for greyed out
  const mutedColor = "#A1A1AA";
  let icon = rightIcon;
  if (rightIcon && React.isValidElement(rightIcon)) {
    const iconEl = rightIcon as React.ReactElement<any>;
    icon = React.cloneElement(iconEl, {
      className: iconEl.props.className || "h-3.5 w-3.5",
      color: isGreyed ? mutedColor : iconEl.props.color,
    });
  }
  const cls = [
    base,
    active && isAvailable ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]" : "",
    isGreyed
      ? "text-[hsl(var(--sidebar-foreground-muted))] opacity-80 cursor-pointer hover:text-[hsl(var(--sidebar-foreground-muted))]"
      : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))] cursor-pointer",
  ].join(" ");
  const [modalOpen, setModalOpen] = React.useState(false);
  const handleClick = (e: React.MouseEvent) => {
    if (isGreyed) {
      e.preventDefault();
      setModalOpen(true);
    } else if (onClick) {
      onClick();
    }
  };
  const content = (
    <>
      <span className="truncate flex-1">{label}</span>
      {icon && (
        <span className="absolute right-3 flex items-center justify-end min-w-[1.5em]">{icon}</span>
      )}
    </>
  );
  return (
    <>
      <a href={href} className={cls} onClick={handleClick} tabIndex={0} title={typeof label === "string" ? label : undefined}>
        {content}
      </a>
      <PremiumModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
