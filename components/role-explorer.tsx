"use client";
import { useState, useEffect } from "react";

import RoleUsersList from "@/components/role-users-list";
import { UserChips } from "@/components/ui/user-chips";
import { RoleUserChipsOnDemand } from "@/components/ui/role-user-chips-on-demand";
import { RoleUserModal } from "@/components/ui/role-user-modal";
import { useGuildMembersKanban } from "@/hooks/use-guild-members";

export default function RoleExplorer({ guildId, roles = [] }: { guildId: string; roles?: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userCounts, setUserCounts] = useState<{ [roleId: string]: number }>({});
  const [view, setView] = useState<'card' | 'table'>('card');
  const [modalRole, setModalRole] = useState<any | null>(null);
  const [modalRoleUserIds, setModalRoleUserIds] = useState<string[]>([]);
  
  // Use the shared hook for member management
  const { members, loading, error } = useGuildMembersKanban(guildId);

  // Sort roles by position (descending, like Discord)
  const filteredRoles = (roles || [])
    .filter((r: any) =>
      r.name.toLowerCase().includes(search.toLowerCase()) || r.roleId.includes(search)
    )
    .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0));

  // Fetch user count for a role when expanded
  useEffect(() => {
    if (!expanded) return;
    fetch(`/api/guilds/${guildId}/roles/${expanded}/user-count`)
      .then(res => res.json())
      .then(data => setUserCounts((prev) => ({ ...prev, [expanded]: data.count })));
  }, [expanded, guildId]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          <button
            className={`px-3 py-1 rounded font-medium border text-sm transition-colors ${view === 'card' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('card')}
            type="button"
          >
            Card View
          </button>
          <button
            className={`px-3 py-1 rounded font-medium border text-sm transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('table')}
            type="button"
          >
            Table View
          </button>
        </div>
      </div>
      {view === 'card' ? (
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
                    <div className="text-xs text-muted-foreground font-mono truncate text-left pl-0 mt-0.5">{r.roleId}</div>
                  </div>
                  <span className={`ml-2 text-lg transition-transform ${expanded === r.roleId ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>
              {expanded === r.roleId && (
                <div className="p-2 pt-0">
                  <RoleUsersList guildId={guildId} roleId={r.roleId} roleName={r.name} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full divide-y divide-border text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Role</th>
                <th className="text-left py-2 px-4">Users</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((r) => (
                <tr key={r.roleId} className="border-b">
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: r.color || '#e5e7eb' }}
                      />
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.roleId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <RoleUserChipsOnDemand guildId={guildId} roleId={r.roleId} />
                  </td>
                  <td className="py-2 px-4">
                    <button
                      className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition"
                      onClick={() => {
                        setModalRole(r);
                        setModalRoleUserIds([]);
                      }}
                    >
                      Manage Users
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role User Management Modal */}
      {modalRole && (
        <RoleUserModal
          guildId={guildId}
          role={modalRole}
          selectedUserIds={modalRoleUserIds}
          onUserIdsChange={setModalRoleUserIds}
          onClose={() => {
            setModalRole(null);
            setModalRoleUserIds([]);
          }}
        />
      )}
    </div>
  );
}
