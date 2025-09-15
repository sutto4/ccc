"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Shield, 
  Server, 
  Settings, 
  BarChart3, 
  Activity,
  Zap,
  Database,
  MonitorDot,
  ChevronDown,
  ChevronRight,
  Users,
  Globe
} from "lucide-react";
import { useState } from "react";

type NavItem = { 
  href: string; 
  label: string; 
  icon: React.ComponentType<any>;
  children?: NavItem[];
};

const ADMIN_ITEMS: NavItem[] = [
  { 
    href: "/admin", 
    label: "Overview", 
    icon: Shield 
  },
  {
    href: "/admin/platform",
    label: "Platform",
    icon: Settings,
    children: [
      { href: "/admin/platform/features", label: "Features", icon: Zap },
      { href: "/admin/platform/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/platform/quotas", label: "Service Quotas", icon: Activity },
      { href: "/admin/platform/monitoring", label: "Monitoring", icon: MonitorDot },
    ]
  },
  {
    href: "/admin/guilds",
    label: "Guild Management", 
    icon: Server,
    children: [
      { href: "/admin/guilds", label: "All Guilds", icon: Server },
      { href: "/admin/guilds/bulk", label: "Bulk Operations", icon: Database },
    ]
  }
];

export default function AdminSidebar() {
  const pathname = usePathname() || "";
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const isExpanded = (href: string) => {
    return expandedItems.includes(href) || pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const active = isActive(item.href);
    const expanded = isExpanded(item.href);
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <div key={item.href}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.href)}
            className={[
              "flex items-center justify-between w-full rounded-md px-3 py-2 text-sm transition",
              level > 0 ? "ml-4" : "",
              active
                ? "bg-[hsl(var(--sidebar-accent))] text-white"
                : "hover:bg-[hsl(var(--sidebar-hover))]",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <Link
            href={item.href}
            className={[
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
              level > 0 ? "ml-4" : "",
              active
                ? "bg-[hsl(var(--sidebar-accent))] text-white"
                : "hover:bg-[hsl(var(--sidebar-hover))]",
            ].join(" ")}
          >
            <item.icon className="h-4 w-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        )}
        
        {hasChildren && expanded && (
          <div className="ml-2 mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="h-full w-[240px] border-r bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="px-4 py-4 border-b">
        <div className="text-lg font-bold">ServerMate Admin</div>
        <div className="text-xs text-muted-foreground mt-1">Management Console</div>
      </div>
      
      <nav className="p-2 space-y-1">
        {ADMIN_ITEMS.map(item => renderNavItem(item))}

        <div className="mt-6 pt-3 border-t">
          <Link
            href="/guilds"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-[hsl(var(--sidebar-hover))] text-muted-foreground"
            title="Back to My Servers"
          >
            <Globe className="h-4 w-4" />
            <span>← Back to My Servers</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
