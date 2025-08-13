"use client";
import { useState } from "react";
import RoleUsersList from "@/components/role-users-list";

export default function RoleExplorer({ guildId, roles }: { guildId: string; roles: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.roleId.includes(search)
  );
  return (
    <div>
      <input
        className="mb-4 w-full rounded border px-3 py-2 text-sm"
        placeholder="Search roles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredRoles.map((r) => (
          <div
            key={r.roleId}
            className="rounded-xl border p-3 bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]"
          >
            <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setExpanded(expanded === r.roleId ? null : r.roleId)}>
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">{r.roleId}</div>
              </div>
              <div
                className="h-3 w-3 rounded-full border"
                title={r.color ?? "no color"}
                style={{ backgroundColor: r.color || undefined, borderColor: r.color || undefined }}
              />
              <span className="ml-2 text-xs text-muted-foreground">{expanded === r.roleId ? "▲" : "▼"}</span>
            </div>
            {expanded === r.roleId && (
              <div className="mt-2">
                <RoleUsersList guildId={guildId} roleId={r.roleId} />
              </div>
            )}
          </div>
        ))}
        {filteredRoles.length === 0 && (
          <div className="text-sm text-muted-foreground col-span-full">No roles found.</div>
        )}
      </div>
    </div>
  );
}
