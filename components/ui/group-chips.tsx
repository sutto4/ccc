import { useState } from "react";

export function GroupChips({ groups, max = 3 }: { groups: string[]; max?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!groups || groups.length === 0) return <span className="text-muted-foreground">none</span>;
  const visible = expanded ? groups : groups.slice(0, max);
  const hidden = groups.length - max;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((g) => (
        <span
          key={g}
          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-muted-foreground/20 max-w-[120px] truncate"
        >
          {g}
        </span>
      ))}
      {!expanded && hidden > 0 && (
        <span
          className="ml-2 text-xs text-muted-foreground cursor-pointer border border-muted-foreground/20 rounded bg-muted px-2 py-0.5"
          onClick={() => setExpanded(true)}
        >
          +{hidden} more
        </span>
      )}
      {expanded && groups.length > max && (
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
