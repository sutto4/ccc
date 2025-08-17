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
import { Shield, Server, Settings, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchFeatures, type FeaturesResponse } from "@/lib/api";
import { useSession, signOut } from "next-auth/react";

type Item = { href: string; label: string; icon: React.ComponentType<any> };

const TOP: Item[] = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/guilds", label: "My Servers", icon: Server },
];

export default function Sidebar() {
  const pathname = usePathname() || "";
  const { data: session } = useSession();
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);
  const [premiumStatus, setPremiumStatus] = useState<boolean>(false);

  // detect if we're inside a guild route
  const parts = pathname.split("/").filter(Boolean);
  const inGuild = parts[0] === "guilds" && parts[1];
  const guildId = inGuild ? parts[1] : null;

  // Check if user is admin
  const isAdmin = session?.role === "admin" || session?.role === "owner";
  
  // Debug logging
  console.log("Session:", session);
  console.log("User role:", session?.role);
  console.log("Is admin:", isAdmin);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!guildId) {
        setFeatures(null);
        setPremiumStatus(false);
        return;
      }
      try {
        const fx: FeaturesResponse = await fetchFeatures(guildId);
        if (!alive) return;
        setFeatures(fx?.features || {});
        // Check if user has premium access (any feature enabled means premium)
        setPremiumStatus(Object.values(fx?.features || {}).some(Boolean));
      } catch {
        if (!alive) return;
        setFeatures({});
        setPremiumStatus(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [guildId]);

  return (
    <div className="flex flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))] w-full h-full border-r border-[hsl(var(--sidebar-border))]">
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-[80px]">
        {TOP.map(({ href, label, icon: Icon }) => {
          // Only show Admin item for admin users
          if (href === "/admin" && !isAdmin) return null;
          
          // Use exact pathname matching for top-level links
          const isActive = pathname === href;
          
          return (
            <Link
              key={href}
              href={href}
              className={["group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition", isActive ? "bg-[hsl(var(--sidebar-accent))] text-white" : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))]"].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
        {/* Community section (collapsible) */}
        <CollapsibleSection title={<span className="font-bold">Community</span>} defaultOpen>
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/users` : "/guilds"}
            label="Users"
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/users`) : false}
            featureEnabled={true}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/roles` : "/guilds"}
            label="Roles"
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/roles`) : false}
            featureEnabled={true}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/members` : "/guilds"}
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
            href={guildId ? `/guilds/${guildId}/esx` : "/guilds"}
            label="ESX"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/esx`) : false}
            featureEnabled={!!(guildId && features?.esx)}
            guildSelected={!!guildId}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/qbcore` : "/guilds"}
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
            href={guildId ? `/guilds/${guildId}/embedded-messages` : "/guilds"}
            label="Embedded Messages"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/embedded-messages`) : false}
            featureEnabled={!!(guildId && (features?.embedded_messages || premiumStatus))}
            guildSelected={!!guildId}
            premiumRequired={true}
            hasPremium={premiumStatus}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/reaction-roles` : "/guilds"}
            label="Reaction Roles"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/reaction-roles`) : false}
            featureEnabled={!!(guildId && (features?.reaction_roles || premiumStatus))}
            guildSelected={!!guildId}
            premiumRequired={true}
            hasPremium={premiumStatus}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/custom-commands` : "/guilds"}
            label="Custom Commands"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/custom-commands`) : false}
            featureEnabled={!!(guildId && (features?.custom_commands || premiumStatus))}
            guildSelected={!!guildId}
            premiumRequired={true}
            hasPremium={premiumStatus}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/bot-customisation` : "/guilds"}
            label="Bot Customisation"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/bot-customisation`) : false}
            featureEnabled={!!(guildId && (features?.bot_customisation || premiumStatus))}
            guildSelected={!!guildId}
            premiumRequired={true}
            hasPremium={premiumStatus}
          />
        </CollapsibleSection>
        {/* Socials (premium, collapsible) */}
        <CollapsibleSection title={<span className="font-bold">Creator Alerts</span>} defaultOpen>
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/creator-alerts/twitch` : "/guilds"}
            label="Twitch"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/creator-alerts/twitch`) : false}
            featureEnabled={!!(guildId && (features?.creator_alerts || premiumStatus))}
            guildSelected={!!guildId}
            premiumRequired={true}
            hasPremium={premiumStatus}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/creator-alerts/youtube` : "/guilds"}
            label="Youtube"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/creator-alerts/youtube`) : false}
            featureEnabled={!!(guildId && (features?.creator_alerts || premiumStatus))}
            guildSelected={!!guildId}
            premiumRequired={true}
            hasPremium={premiumStatus}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/creator-alerts/x` : "/guilds"}
            label="X"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/creator-alerts/x`) : false}
            featureEnabled={!!(guildId && (features?.creator_alerts || premiumStatus))}
            guildSelected={!!guildId}
            premiumRequired={true}
            hasPremium={premiumStatus}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/creator-alerts/tiktok` : "/guilds"}
            label="Tiktok"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/creator-alerts/tiktok`) : false}
            featureEnabled={!!(guildId && (features?.creator_alerts || premiumStatus))}
            guildSelected={!!guildId}
            premiumRequired={true}
            hasPremium={premiumStatus}
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
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/guilds" })}>
              Logout
            </DropdownMenuItem>
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
  premiumRequired?: boolean; // true if premium access is required
  hasPremium?: boolean; // true if user has premium access
};

function NavLeaf({
  href,
  label,
  active,
  rightIcon,
  featureEnabled,
  guildSelected,
  onClick,
  premiumRequired,
  hasPremium,
}: NavLeafProps) {
  const base =
    "group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition select-none w-full relative";
  // Determine the state: no guild selected vs feature not available vs premium required
  const noGuildSelected = !guildSelected;
  const featureNotAvailable = guildSelected && !featureEnabled;
  const needsPremium = premiumRequired && !hasPremium;
  const isGreyed = noGuildSelected || featureNotAvailable || needsPremium;
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
    active && guildSelected && featureEnabled && (!premiumRequired || hasPremium)
      ? "bg-[hsl(var(--sidebar-accent))] text-white" 
      : isGreyed
        ? "text-[hsl(var(--sidebar-foreground-muted))] opacity-80 cursor-pointer hover:text-[hsl(var(--sidebar-foreground-muted))]"
        : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))] cursor-pointer",
  ].join(" ");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [showNoGuildMessage, setShowNoGuildMessage] = React.useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    if (noGuildSelected) {
      e.preventDefault();
      setShowNoGuildMessage(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowNoGuildMessage(false), 3000);
    } else if (featureNotAvailable) {
      e.preventDefault();
      setModalOpen(true);
    } else if (needsPremium) {
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
      <Link href={href} className={cls} onClick={handleClick} tabIndex={0} title={typeof label === "string" ? label : undefined}>
        {content}
      </Link>
      
      {/* No guild selected message */}
      {showNoGuildMessage && (
        <div className="fixed top-20 left-4 z-[100] bg-yellow-500 text-white px-4 py-2 rounded-md shadow-lg">
          Please select a server first
        </div>
      )}
      
      {/* Premium modal only for feature not available */}
      <PremiumModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
