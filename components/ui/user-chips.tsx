import { Member } from "@/lib/api";

import { useState } from "react";

export function UserChips({ users, max = 3 }: { users: Member[]; max?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!users || users.length === 0) return null;
  const visible = expanded ? users : users.slice(0, max);
  const hidden = users.length - max;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((u) => (
        <span
          key={u.discordUserId}
          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-muted-foreground/20 max-w-[120px] truncate"
          title={u.username}
        >
          <img
            src={u.avatarUrl || "/placeholder-user.jpg"}
            alt={u.username}
            className="w-4 h-4 rounded-full border bg-muted object-cover"
          />
          <span className="truncate">{u.username}</span>
        </span>
      ))}
      {!expanded && hidden > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground border border-muted-foreground/20 cursor-pointer"
          title={users.slice(max).map(u => u.username).join(', ')}
          onClick={() => setExpanded(true)}
        >
          +{hidden} more
        </span>
      )}
      {expanded && users.length > max && (
        <span
          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground border border-muted-foreground/20 cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          Show less
        </span>
      )}
    </div>
  );
}
