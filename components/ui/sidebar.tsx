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
    <div className="flex h-full flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))] w-[240px] min-w-[240px] max-w-[240px] border-r border-[hsl(var(--sidebar-border))]">
      <nav className="flex-1 overflow-y-auto p-2">
        {TOP.map(({ href, label, icon: Icon }) => (
          <NavLeaf
            key={href}
            href={href}
            label={<span className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="truncate">{label}</span></span>}
            active={pathname === href}
          />
        ))}
        {/* Community section (collapsible) */}
        <CollapsibleSection title={<span className="font-bold">Community</span>} defaultOpen>
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/users` : "#"}
            label="Users"
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/users`) : false}
            disabled={!guildId}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/roles` : "#"}
            label="Roles"
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/roles`) : false}
            disabled={!guildId}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/members` : "#"}
            label="Custom Groups"
            rightIcon={<Crown className="h-3.5 w-3.5" />}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/members`) : false}
            disabled={!guildId || customGroupsEnabled === false}
            title={!guildId ? "Select a server first" : (customGroupsEnabled === false ? "Premium feature (not usable)" : "Custom Groups")}
          />
        </CollapsibleSection>
        {/* FiveM Frameworks (premium, collapsible) */}
        <CollapsibleSection title={<span className="font-bold">FiveM <Crown className="h-3.5 w-3.5 text-yellow-400 inline ml-1" /></span>} defaultOpen>
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/esx` : "#"}
            label={<span className="flex items-center gap-2">ESX <span className="inline ml-2" style={{width: '16px', height: '16px'}}><svg width="16" height="16" viewBox="0 0 32 32" style={{filter: 'grayscale(1)'}}><circle cx="16" cy="16" r="16" fill="#4A90E2"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="Arial" fontWeight="bold">E</text></svg></span></span>}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/esx`) : false}
            disabled={!guildId}
            title={!guildId ? "Select a server first" : "ESX Framework"}
          />
          <NavLeaf
            href={guildId ? `/guilds/${guildId}/qbcore` : "#"}
            label={<span className="flex items-center gap-2">QBcore <span className="inline ml-2" style={{width: '16px', height: '16px'}}><svg width="16" height="16" viewBox="0 0 32 32" style={{filter: 'grayscale(1)'}}><rect width="32" height="32" rx="8" fill="#7ED957"/><text x="16" y="22" textAnchor="middle" fontSize="16" fill="#222" fontFamily="Arial" fontWeight="bold">Q</text></svg></span></span>}
            active={guildId ? pathname.startsWith(`/guilds/${guildId}/qbcore`) : false}
            disabled={!guildId}
            title={!guildId ? "Select a server first" : "QBcore Framework"}
          />
        </CollapsibleSection>
        {/* Dummy nav items (collapsible) */}
        <CollapsibleSection title={<span className="font-bold">Tools</span>} defaultOpen>
          <NavLeaf
            href="#"
            label="Embeded Messages"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            title="Premium feature"
          />
          <NavLeaf
            href="#"
            label="Reaction Roles"
            rightIcon={<Crown className="h-3.5 w-3.5 text-yellow-400" />}
            title="Premium feature"
          />
          <NavLeaf
            href="#"
            label="Custom Commands"
            rightIcon={<Shield className="h-3.5 w-3.5 text-green-500" />}
            title="Free feature"
          />
        </CollapsibleSection>
        {/* Socials (premium, collapsible) */}
        <CollapsibleSection title={<span className="font-bold">Creator Alerts <Crown className="h-3.5 w-3.5 text-yellow-400 inline ml-1" /></span>} defaultOpen>
          <NavLeaf
            href="#"
            label={<span className="flex items-center justify-between w-full"><span>Twitch</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline ml-2" style={{filter: 'grayscale(1)'}}><path d="M4.5 2.5L2.5 4.5V11.5L4.5 13.5H11.5L13.5 11.5V4.5L11.5 2.5H4.5Z" stroke="#9146FF" strokeWidth="1.5"/><path d="M5.5 6.5V9.5" stroke="#9146FF" strokeWidth="1.5"/><path d="M8 6.5V9.5" stroke="#9146FF" strokeWidth="1.5"/><path d="M10.5 6.5V9.5" stroke="#9146FF" strokeWidth="1.5"/></svg></span>}
            title="Twitch"
          />
          <NavLeaf
            href="#"
            label={<span className="flex items-center justify-between w-full"><span>Youtube</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline ml-2" style={{filter: 'grayscale(1)'}}><rect width="16" height="16" rx="3" fill="#FF0000"/><polygon points="6,5 11,8 6,11" fill="white"/></svg></span>}
            title="Youtube"
          />
          <NavLeaf
            href="#"
            label={<span className="flex items-center justify-between w-full"><span>X</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline ml-2" style={{filter: 'grayscale(1)'}}><rect width="16" height="16" rx="3" fill="#000"/><text x="8" y="11" textAnchor="middle" fontSize="8" fill="white">X</text></svg></span>}
            title="X"
          />
          <NavLeaf
            href="#"
            label={<span className="flex items-center justify-between w-full"><span>Tiktok</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline ml-2" style={{filter: 'grayscale(1)'}}><circle cx="8" cy="8" r="8" fill="#010101"/><text x="8" y="11" textAnchor="middle" fontSize="8" fill="#fff">TikTok</text></svg></span>}
            title="Tiktok"
          />
        </CollapsibleSection>
      </nav>
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
  label: React.ReactNode;
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
          className={["ml-2 inline-flex items-center", active ? "" : "text-[hsl(var(--sidebar-foreground-muted))]"].join(" ")}
        >
          {rightIcon}
        </span>
      )}
    </div>
  );

  // Only use string for title prop
  const titleString = title || (typeof label === "string" ? label : "");

  const [modalOpen, setModalOpen] = React.useState(false);
  // Show modal for any premium-locked feature, not for "Select a server first"
  const isPremium = titleString?.toLowerCase().includes("premium");
  const isSelectServer = titleString?.toLowerCase().includes("select a server");
  if (disabled) {
    if (isPremium) {
      return (
        <>
          <div
            className={`${base} ${cls} opacity-60 cursor-pointer hover:opacity-80`}
            title={titleString}
            aria-disabled="true"
            onClick={() => setModalOpen(true)}
          >
            {content}
          </div>
          <PremiumModal open={modalOpen} onOpenChange={setModalOpen} />
        </>
      );
    } else if (isSelectServer) {
      return (
        <div
          className={`${base} ${cls} opacity-60 cursor-default pointer-events-none`}
          title={titleString}
          aria-disabled="true"
        >
          {content}
        </div>
      );
    } else {
      return (
        <div
          className={`${base} ${cls} opacity-60 cursor-default pointer-events-none`}
          title={titleString}
          aria-disabled="true"
        >
          {content}
        </div>
      );
    }
  }

  return (
    <Link href={href} className={`${base} ${cls}`} title={titleString}>
      {content}
    </Link>
  );
}
