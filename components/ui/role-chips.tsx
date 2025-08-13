import { useState } from "react";

export function RoleChips({ roleIds, roleMap, max = 3 }: { roleIds: string[]; roleMap: Map<string, any>; max?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!roleIds || roleIds.length === 0) return <span className="text-muted-foreground">none</span>;
  const visible = expanded ? roleIds : roleIds.slice(0, max);
  const hidden = roleIds.length - max;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((rid) => {
        const r = roleMap.get(rid);
        const name = r?.name ?? "unknown";
        const color = r?.color || null;
        return (
          <span
            key={rid}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ backgroundColor: color ? `${color}20` : undefined, borderColor: color || undefined }}
            title={rid}
          >
            {name}
          </span>
        );
      })}
      {!expanded && hidden > 0 && (
        <span
          className="ml-2 text-xs text-muted-foreground cursor-pointer border border-muted-foreground/20 rounded bg-muted px-2 py-0.5"
          onClick={() => setExpanded(true)}
        >
          +{hidden} more
        </span>
      )}
      {expanded && roleIds.length > max && (
        <span
          className="ml-2 text-xs text-muted-foreground cursor-pointer border border-muted-foreground/20 rounded bg-muted px-2 py-0.5"
          onClick={() => setExpanded(false)}
        >
          Show less
        </span>
      )}
    </div>
  );
}
