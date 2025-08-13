"use client";
import { useState, useEffect } from "react";
import RoleUsersList from "@/components/role-users-list";

export default function RoleExplorer({ guildId, roles = [] }: { guildId: string; roles?: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userCounts, setUserCounts] = useState<{ [roleId: string]: number }>({});
  const filteredRoles = (roles || []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.roleId.includes(search)
  );

  // Fetch user count for a role when expanded
  useEffect(() => {
    if (!expanded) return;
    fetch(`/api/guilds/${guildId}/roles/${expanded}/user-count`)
      .then(res => res.json())
      .then(data => setUserCounts((prev) => ({ ...prev, [expanded]: data.count })));
  }, [expanded, guildId]);

  return (
    <div>
      <input
        className="mb-4 w-full rounded border px-3 py-2 text-sm"
        placeholder="Search roles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((r) => (
          <div
            key={r.roleId}
            className={`group rounded-2xl border bg-card shadow-sm transition hover:shadow-lg ${expanded === r.roleId ? 'ring-2 ring-primary/40' : ''}`}
          >
            <button
              className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/60 transition bg-transparent"
              onClick={() => setExpanded(expanded === r.roleId ? null : r.roleId)}
              aria-expanded={expanded === r.roleId}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className="inline-block h-5 w-5 rounded-full border-2 border-white shadow"
                  title={r.color ?? 'no color'}
                  style={{ backgroundColor: r.color || '#e5e7eb', borderColor: r.color || '#e5e7eb' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base truncate">{r.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {userCounts[r.roleId] !== undefined ? `· ${userCounts[r.roleId]} user${userCounts[r.roleId] !== 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{r.roleId}</div>
                </div>
                <span className={`ml-2 text-lg transition-transform ${expanded === r.roleId ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </button>
            {expanded === r.roleId && (
              <div className="p-2 pt-0">
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
