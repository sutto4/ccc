"use client";

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
import { Shield, Server, Settings, Crown, FileText, Folder } from "lucide-react";
import { useSidebarFeatures } from "@/hooks/use-features-query";
import { useSharedSession, signIn, signOut } from "@/components/providers";

// CollapsibleSection component
function CollapsibleSection({ title, defaultOpen = true, children }: { title: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-2">
      <button
        className="w-full text-left font-bold px-3 py-2 rounded-md flex items-center bg-transparent hover:bg-[hsl(var(--sidebar-hover))] text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex-1">{title}</span>
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

type Item = { href: string; label: string; icon: React.ComponentType<any> };

// Map display names to feature keys for consistent lookup across all functions
// Defined outside component to avoid recreation on every render
const displayNameToFeatureKey: Record<string, string> = {
  'AI Message Summarization': 'ai_summarization',
  'Ban Syncing': 'ban_sync',
  'Bot Customisation': 'bot_customisation',
  'Creator Alerts': 'creator_alerts',
  'Custom Commands': 'custom_commands',
  'Custom Dot Command Prefix': 'custom_prefix',
  'Custom Groups': 'custom_groups',
  'Embedded Messages': 'embedded_messages',
  'FDG Donator Sync': 'fdg_donator_sync',
  'Feedback Collection': 'feedback_system',
  'FiveM ESX Integration': 'fivem_esx',
  'FiveM QBcore Integration': 'fivem_qbcore',
  'Moderation Tools': 'moderation',
  'Reaction Roles': 'reaction_roles',
  'User Verification System': 'verification_system',
  'Utilities': 'utilities'
};

// Reverse mapping for display purposes
const featureKeyToDisplayName: Record<string, string> = {};
Object.entries(displayNameToFeatureKey).forEach(([display, key]) => {
  featureKeyToDisplayName[key] = display;
});

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

const TOP: Item[] = [
  { href: "/guilds", label: "My Servers", icon: Shield },
  { href: "/server-groups", label: "Server Groups", icon: Folder },
  { href: "/admin", label: "Admin", icon: Settings },
];

const NavLeaf: React.FC<NavLeafProps> = ({
  href,
  label,
  active,
  rightIcon,
  featureEnabled,
  guildSelected,
  onClick,
  premiumRequired,
  hasPremium,
}) => {
  const base =
    "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition select-none w-full relative text-left";
  // Determine the state: no guild selected vs feature not available vs premium required
  const noGuildSelected = !guildSelected;
  const featureNotAvailable = guildSelected && !featureEnabled;
  const needsPremium = premiumRequired && !hasPremium;

  // Free features should never be greyed out due to premium requirements
  // Only grey out if: no guild selected, feature not available, or premium required but not available
  const isGreyed = noGuildSelected || featureNotAvailable || (premiumRequired && !hasPremium);
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
      return;
    } else if (featureNotAvailable || (premiumRequired && !hasPremium)) {
      // Show premium modal for any feature that's not available or requires premium
      e.preventDefault();
      e.stopPropagation();
      setModalOpen(true);
      return;
    } else {
      // Feature is available and accessible - navigate to the href
      window.location.href = href;
    }
  };
  const content = (
    <>
      <span className="truncate flex-1">{label}</span>
      {icon && (
        <span className="ml-auto flex items-center min-w-[1.5em]">{icon}</span>
      )}
    </>
  );
  return (
    <>
      <button className={cls} onClick={handleClick} tabIndex={0} title={typeof label === "string" ? label : undefined}>
        {content}
      </button>

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
};

NavLeaf.displayName = 'NavLeaf';

const Sidebar = React.memo(function Sidebar() {
  const pathname = usePathname() || "";
  const { data: session, status } = useSharedSession();
  
  // detect if we're inside a guild route
  const parts = pathname.split("/").filter(Boolean);
  const inGuild = parts[0] === "guilds" && parts[1];
  const guildId = inGuild ? parts[1] : null;
  
  // Use React Query for features fetching
  const { features, loading } = useSidebarFeatures(guildId || '');

  // Check if user is admin
  const isAdmin = session?.role === "admin" || session?.role === "owner";

  // Features are now handled by React Query hook above

  // Show loading state while session is loading
  if (status === "loading") {
    return (
      <div className="flex flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))] w-full h-full border-r border-[hsl(var(--sidebar-border))]">
        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-[80px]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </nav>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!session) {
    return (
      <div className="flex flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))] w-full h-full border-r border-[hsl(var(--sidebar-border))]">
        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-[80px]">
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">Please sign in to access your servers</p>
            <button
              onClick={() => signIn("discord")}
              className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-md text-sm font-medium transition-colors"
            >
              Sign In with Discord
            </button>
          </div>
        </nav>
      </div>
    );
  }
  
  // Helper function to determine if a feature should show crown icon
  const shouldShowCrown = (featureKey: string) => {
    if (!features) return false;

    const packageKey = `${featureKey}_package` as keyof Features;
    const packageType = features[packageKey];
    return packageType === "premium";
  };

  // Helper function to check if a feature is accessible (free, premium enabled, or custom enabled)
  const isFeatureAccessible = (featureKey: string) => {
    if (!features) return false;

    // Check if the feature is enabled
    const isEnabled = features[featureKey as keyof Features] === true;

    // Check the package requirement
    const packageKey = `${featureKey}_package` as keyof Features;
    const packageType = features[packageKey];


    // Free features are always accessible if enabled
    if (packageType === "free" || packageType === undefined) {
      return isEnabled;
    }

    // Premium features require the feature to be enabled
    if (packageType === "premium") {
      return isEnabled;
    }

    // Custom features require the feature to be enabled
    if (packageType === "custom") {
      return isEnabled;
    }

    return false;
  };

  // Helper function to check if a feature should be visible in navigation
  const isFeatureVisible = (featureKey: string) => {
    if (!features) return false;

    const packageKey = `${featureKey}_package` as keyof Features;
    const packageType = features[packageKey];
    const isEnabled = features[featureKey as keyof Features] === true;

    // If no package type is defined, assume it's not configured and hide it
    if (!packageType) {
      return false;
    }

    // Custom features only appear if enabled
    if (packageType === "custom") {
      return isEnabled;
    }

    // Free and premium features are always visible (but may be greyed out)
    return true;
  };

  // Debug logging - REMOVED for security
  // console.log("Session:", session);
  // console.log("User role:", session?.role);
  // console.log("Is admin:", isAdmin);
  // console.log("Features:", features);

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
              className={["group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition text-left", isActive ? "bg-[hsl(var(--sidebar-accent))] text-white" : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))]"].join(" ")}
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
          {isFeatureVisible("custom_groups") && (
            <NavLeaf
              href={guildId ? `/guilds/${guildId}/members` : "/guilds"}
              label="Custom Groups"
              rightIcon={shouldShowCrown("custom_groups") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
              active={guildId ? pathname.startsWith(`/guilds/${guildId}/members`) : false}
              featureEnabled={!!(guildId && isFeatureAccessible("custom_groups"))}
              guildSelected={!!guildId}
              premiumRequired={shouldShowCrown("custom_groups")}
              hasPremium={true} // Always true since we're checking feature access individually
            />
          )}
        </CollapsibleSection>
        
        {/* FiveM Frameworks (only show section if any features are visible) */}
        {(isFeatureVisible("fivem_esx") || isFeatureVisible("fivem_qbcore")) && (
          <CollapsibleSection title={<span className="font-bold">FiveM</span>} defaultOpen>
            {isFeatureVisible("fivem_esx") && (
              <NavLeaf
                href={guildId ? `/guilds/${guildId}/esx` : "/guilds"}
                label="ESX"
                rightIcon={shouldShowCrown("fivem_esx") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
                active={guildId ? pathname.startsWith(`/guilds/${guildId}/esx`) : false}
                featureEnabled={!!(guildId && isFeatureAccessible("fivem_esx"))}
                guildSelected={!!guildId}
                premiumRequired={shouldShowCrown("fivem_esx")}
                hasPremium={true} // Always true since we're checking feature access individually
              />
            )}
            {isFeatureVisible("fivem_qbcore") && (
              <NavLeaf
                href={guildId ? `/guilds/${guildId}/qbcore` : "/guilds"}
                label="QBcore"
                rightIcon={shouldShowCrown("fivem_qbcore") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
                active={guildId ? pathname.startsWith(`/guilds/${guildId}/qbcore`) : false}
                featureEnabled={!!(guildId && isFeatureAccessible("fivem_qbcore"))}
                guildSelected={!!guildId}
                premiumRequired={shouldShowCrown("fivem_qbcore")}
                hasPremium={true} // Always true since we're checking feature access individually
              />
            )}
          </CollapsibleSection>
        )}
        
        {/* Tools section (only show if any features are visible) */}
        {(isFeatureVisible("ai_summarization") || isFeatureVisible("embedded_messages") || isFeatureVisible("reaction_roles") || isFeatureVisible("custom_commands") || isFeatureVisible("bot_customisation")) && (
          <CollapsibleSection title={<span className="font-bold">Tools</span>} defaultOpen>
            {/* AI Features */}
            {isFeatureVisible("ai_summarization") && (
              <NavLeaf
                href={guildId ? `/guilds/${guildId}/ai-features` : "/guilds"}
                label="AI Features"
                rightIcon={shouldShowCrown("ai_summarization") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
                active={guildId ? pathname.startsWith(`/guilds/${guildId}/ai-features`) : false}
                featureEnabled={!!(guildId && isFeatureAccessible("ai_summarization"))}
                guildSelected={!!guildId}
                premiumRequired={shouldShowCrown("ai_summarization")}
                hasPremium={true} // Always true since we're checking feature access individually
              />
            )}
            {/* Moderation - always visible for now */}
            <NavLeaf
              href={guildId ? `/guilds/${guildId}/moderation` : "/guilds"}
              label="Moderation"
              rightIcon={undefined}
              active={guildId ? pathname.startsWith(`/guilds/${guildId}/moderation`) : false}
              featureEnabled={!!guildId}
              guildSelected={!!guildId}
              premiumRequired={false}
              hasPremium={true}
            />
            {isFeatureVisible("embedded_messages") && (
            <NavLeaf
              href={guildId ? `/guilds/${guildId}/embedded-messages` : "/guilds"}
              label="Embedded Messages"
              rightIcon={shouldShowCrown("embedded_messages") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
              active={guildId ? pathname.startsWith(`/guilds/${guildId}/embedded-messages`) : false}
              featureEnabled={!!(guildId && isFeatureAccessible("embedded_messages"))}
              guildSelected={!!guildId}
              premiumRequired={false} // embedded_messages is free, so no premium required
              hasPremium={true}
            />
          )}
          {isFeatureVisible("reaction_roles") && (
            <NavLeaf
              href={guildId ? `/guilds/${guildId}/reaction-roles` : "/guilds"}
              label="Reaction Roles"
              rightIcon={shouldShowCrown("reaction_roles") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
              active={guildId ? pathname.startsWith(`/guilds/${guildId}/reaction-roles`) : false}
              featureEnabled={!!(guildId && isFeatureAccessible("reaction_roles"))}
              guildSelected={!!guildId}
              premiumRequired={shouldShowCrown("reaction_roles")} // Only require premium if it's actually premium
              hasPremium={true}
            />
          )}
          {isFeatureVisible("custom_commands") && (
            <NavLeaf
              href={guildId ? `/guilds/${guildId}/custom-commands` : "/guilds"}
              label="Custom Commands"
              rightIcon={shouldShowCrown("custom_commands") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
              active={guildId ? pathname.startsWith(`/guilds/${guildId}/custom-commands`) : false}
              featureEnabled={!!(guildId && isFeatureAccessible("custom_commands"))}
              guildSelected={!!guildId}
              premiumRequired={shouldShowCrown("custom_commands")}
              hasPremium={true} // Always true since we're checking feature access individually
            />
          )}
          {isFeatureVisible("bot_customisation") && (
            <NavLeaf
              href={guildId ? `/guilds/${guildId}/bot-customization` : "/guilds"}
              label="Bot Customization"
              rightIcon={shouldShowCrown("bot_customisation") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
              active={guildId ? pathname.startsWith(`/guilds/${guildId}/bot-customization`) : false}
              featureEnabled={!!(guildId && isFeatureAccessible("bot_customisation"))}
              guildSelected={!!guildId}
              premiumRequired={shouldShowCrown("bot_customisation")}
              hasPremium={true} // Always true since we're checking feature access individually
            />
          )}
          </CollapsibleSection>
        )}
        
        {/* Creator Alerts (only show if visible) */}
        {isFeatureVisible("creator_alerts") && (
          <CollapsibleSection title={<span className="font-bold">Creator Alerts</span>} defaultOpen>
          {isFeatureVisible("creator_alerts") && (
            <NavLeaf
              href={guildId ? `/guilds/${guildId}/creator-alerts` : "/guilds"}
              label="Manage Creator Alerts"
              rightIcon={shouldShowCrown("creator_alerts") ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : undefined}
              active={guildId ? pathname.startsWith(`/guilds/${guildId}/creator-alerts`) : false}
              featureEnabled={!!(guildId && isFeatureAccessible("creator_alerts"))}
              guildSelected={!!guildId}
              premiumRequired={shouldShowCrown("creator_alerts")}
              hasPremium={true} // Always true since we're checking feature access individually
            />
          )}
          </CollapsibleSection>
        )}

        {/* Development moved to Admin; hidden from guild users */}
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
            {guildId && (
              <>
                <Link href={`/guilds/${guildId}/settings`} passHref legacyBehavior>
                  <DropdownMenuItem asChild className="hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))] cursor-pointer">
                    <a>Server Settings</a>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem 
              onClick={() => signOut({ callbackUrl: "/guilds" })}
              className="hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))] cursor-pointer"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Discord Invite */}
      <div className="p-2">
        <a
          href="https://discord.gg/nrSjZByddw"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors w-full justify-center font-medium"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0786-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0786.0105c.1202.099.2462.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.0766.0766 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
          </svg>
          Join Our Discord
        </a>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;
