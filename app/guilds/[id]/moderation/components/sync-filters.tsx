"use client";

import { Badge } from "@/components/ui/badge";
import { Shield, Link, Home, Clock } from "lucide-react";

export type SyncFilterValue = "all" | "origin" | "synced" | "needs-review";

interface SyncFiltersProps {
  value: SyncFilterValue;
  onChange: (value: SyncFilterValue) => void;
  isPartOfGroup: boolean;
}

const filterConfig = {
  all: {
    label: "All",
    icon: Shield,
    description: "Show all cases"
  },
  origin: {
    label: "Origin Only",
    icon: Home,
    description: "Cases created in this guild"
  },
  synced: {
    label: "Synced Only",
    icon: Link,
    description: "Cases synced from other guilds"
  },
  "needs-review": {
    label: "Needs Review",
    icon: Clock,
    description: "Cases pending approval"
  }
};

export default function SyncFilters({ value, onChange, isPartOfGroup }: SyncFiltersProps) {
  if (!isPartOfGroup) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(filterConfig).map(([key, config]) => {
        const Icon = config.icon;
        const isActive = value === key;
        
        return (
          <Badge
            key={key}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer transition-colors hover:bg-gray-100 ${
              isActive 
                ? "bg-blue-100 text-blue-800 border-blue-200" 
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onChange(key as SyncFilterValue)}
            title={config.description}
          >
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        );
      })}
    </div>
  );
}
