"use client";

import { Badge } from "@/components/ui/badge";
import { Shield, Link, Home } from "lucide-react";

interface SyncBadgeProps {
  variant: "origin" | "synced" | "local";
}

const badgeConfig = {
  origin: {
    label: "Origin",
    icon: Home,
    variant: "primary" as const,
    className: "bg-blue-100 text-blue-800 border-blue-200"
  },
  synced: {
    label: "Synced",
    icon: Link,
    variant: "secondary" as const,
    className: "bg-green-100 text-green-800 border-green-200"
  },
  local: {
    label: "Local Only",
    icon: Shield,
    variant: "outline" as const,
    className: "bg-gray-100 text-gray-800 border-gray-200"
  }
};

export default function SyncBadge({ variant }: SyncBadgeProps) {
  const config = badgeConfig[variant];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`flex items-center space-x-1 ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
}
