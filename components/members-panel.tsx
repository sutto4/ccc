"use client";

import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logAction } from "@/lib/logger";
import { UserRoleModal } from "@/components/ui/user-role-modal";
import { useGuildMembersOptimized, type Row } from "@/hooks/use-guild-members-optimized";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

export default function MembersPanel({ guildId }: { guildId: string }) {
  const { data: session } = useSession();
  
  console.log('[MEMBERS-PANEL] Rendering with guildId:', guildId);
  
  // Use the optimized shared hook for all member management
  const {
    loading,
    loadingRoles,
    members,
    roles,
    error,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    hasMore,
    totalMembers,
    loadMembers,
    roleMap,
    DEFAULT_AVATAR
  } = useGuildMembersOptimized(guildId);
  
  // UI state
  const [modalUser, setModalUser] = useState<Row | null>(null);
  const [view, setView] = useState<'card' | 'table'>('table'); // Default to table view
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [customGroupsEnabled, setCustomGroupsEnabled] = useState(false);
  const { toast } = useToast();

  // Check if custom groups feature is enabled for this guild
  useEffect(() => {
    if (!guildId) return;
    
    const checkFeature = async () => {
      try {
        const response = await fetch(`/api/guilds/${guildId}/web-app-features`);
        if (response.ok) {
          const data = await response.json();
          const customGroupsFeature = data.features?.find((f: any) => f.key === 'custom_groups');
          setCustomGroupsEnabled(customGroupsFeature?.enabled || false);
        }
      } catch (error) {
        console.error('Failed to check custom groups feature:', error);
        setCustomGroupsEnabled(false);
      }
    };
    
    checkFeature();
  }, [guildId]);

  // Gather all unique custom groups
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => m.groups?.forEach(g => set.add(g)));
    return Array.from(set);
  }, [members]);

  console.log('[MEMBERS-PANEL] State:', { 
    loading, 
    loadingRoles, 
    membersCount: members.length, 
    rolesCount: roles.length, 
    totalMembers,
    error 
  });

  // Add role to user
  async function handleAddRole(userId: string, roleId: string) {
    try {
      const actor = (session?.user as any)?.id || "";
      const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || actor;
      const user = members.find(m => m.discordUserId === userId);
      const role = roles.find(r => r.roleId === roleId);

      const response = await fetch(`/api/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actor: actor
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add role (${response.status})`);
      }

      toast({
        title: "Role Added Successfully",
        description: `${user?.username || 'User'} has been assigned the "${role?.name || 'role'}".`,
      });

      loadMembers(false);

      await logAction({
        guildId,
        userId: actor,
        user: { id: actor, username: actorUsername },
        actionType: "role.add",
        actionData: { targetUserId: userId, targetUsername: user?.username, roleId, roleName: role?.name }
      });
    } catch (err: any) {
      toast({
        title: "Error Adding Role",
        description: err.message,
        variant: "destructive",
      });
    }
  }

  // Remove role from user
  async function handleRemoveRole(userId: string, roleId: string) {
    try {
      const actor = (session?.user as any)?.id || "";
      const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || actor;
      const user = members.find(m => m.discordUserId === userId);
      const role = roles.find(r => r.roleId === roleId);

      const response = await fetch(`/api/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to remove role (${response.status})`);
      }

      toast({
        title: "Role Removed Successfully",
        description: `${user?.username || 'User'} no longer has the "${role?.name || 'role'}" role.`,
      });

      loadMembers(false);

      await logAction({
        guildId,
        userId: actor,
        user: { id: actor, username: actorUsername },
        actionType: "role.remove",
        actionData: { targetUserId: userId, targetUsername: user?.username, roleId, roleName: role?.name }
      });
    } catch (err: any) {
      toast({
        title: "Error Removing Role",
        description: err.message,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading members: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Members</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {loadingRoles ? "Loading roles..." : `${totalMembers.toLocaleString()} members`}
        </div>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by username, Discord ID, or account ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Role:</span>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        {customGroupsEnabled && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Group:</span>
            <select 
              value={groupFilter} 
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="">All groups</option>
              {allGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Per page:</span>
          <select 
            value={pageSize.toString()} 
            onChange={(e) => setPageSize(parseInt(e.target.value))}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded font-medium border text-sm transition-colors ${view === 'card' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('card')}
          >
            Card
          </button>
          <button
            className={`px-3 py-1 rounded font-medium border text-sm transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('table')}
          >
            Table
          </button>
        </div>
      </div>

      {/* Members Display */}
      {view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {loadingRoles ? (
            <div className="col-span-full py-8 text-center">
              <div className="text-sm text-muted-foreground">Loading roles...</div>
            </div>
          ) : members.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              {totalMembers === 0 ? "No members found." : "No members match your filters."}
            </div>
          ) : (
            members.map((m) => (
              <div
                key={m.discordUserId}
                className="bg-card border rounded-xl p-4 flex flex-col items-center shadow-md relative hover:shadow-lg transition-shadow cursor-pointer hover:bg-primary/10"
                onClick={() => setModalUser(m)}
              >
                <img
                  src={m.avatarUrl || DEFAULT_AVATAR}
                  alt={m.username}
                  className="w-14 h-14 rounded-full border bg-muted object-cover mb-2"
                  referrerPolicy="no-referrer"
                />
                <div className="font-semibold text-center truncate w-full" title={m.username}>{m.username}</div>
                {customGroupsEnabled && (
                  <div className="font-mono text-xs text-muted-foreground truncate w-full text-center mb-1">{m.accountid ?? <span className='text-muted-foreground'>—</span>}</div>
                )}
                <div className="w-full mb-1">
                  <div className="text-xs font-semibold text-muted-foreground mb-0.5 text-center">Discord Roles</div>
                  <div className="flex flex-wrap items-center gap-1 justify-center">
                    {(m.roleIds && m.roleIds.length > 0
                      ? m.roleIds.slice(0, 3).map((rid) => {
                          const r = roleMap.get(rid);
                          const name = r?.name ?? "unknown";
                          const color = r?.color || null;
                          return (
                            <span
                              key={rid}
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                              style={{
                                backgroundColor: color ? `${color}20` : undefined,
                                borderColor: color || undefined,
                              }}
                              title={rid}
                            >
                              {name}
                            </span>
                          );
                        })
                      : <span className="text-xs text-muted-foreground">none</span>
                    )}
                    {m.roleIds && m.roleIds.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{m.roleIds.length - 3}</span>
                    )}
                  </div>
                </div>
                {customGroupsEnabled && (
                  <>
                    <div className="w-full flex items-center my-1">
                      <div className="flex-1 border-t border-muted" />
                      <span className="mx-2 text-xs text-muted-foreground">Custom Groups</span>
                      <div className="flex-1 border-t border-muted" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 justify-center w-full mb-1">
                      {(m.groups && m.groups.length > 0
                        ? m.groups.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-muted-foreground/20 max-w-[120px] truncate"
                            >
                              {g}
                            </span>
                          ))
                        : <span className="text-xs text-muted-foreground">none</span>
                      )}
                      {m.groups && m.groups.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{m.groups.length - 3}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full divide-y divide-border text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-semibold">User</th>
                {customGroupsEnabled && (
                  <th className="px-3 py-2 text-left font-semibold">Account ID</th>
                )}
                <th className="px-3 py-2 text-left font-semibold">Roles</th>
                {customGroupsEnabled && (
                  <th className="px-3 py-2 text-left font-semibold">Groups</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loadingRoles ? (
                <tr>
                  <td colSpan={customGroupsEnabled ? 4 : 2} className="py-8 text-center">
                    <div className="text-sm text-muted-foreground">Loading roles...</div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={customGroupsEnabled ? 4 : 2} className="py-8 text-center text-muted-foreground">
                    {totalMembers === 0 ? "No members found." : "No members on this page."}
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.discordUserId}
                    className="border-b last:border-0 cursor-pointer transition hover:bg-primary/10 hover:shadow-md"
                    onClick={() => setModalUser(m)}
                  >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={m.avatarUrl || DEFAULT_AVATAR}
                        alt={m.username}
                        className="w-6 h-6 rounded-full border bg-muted object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="font-medium truncate" title={m.username}>{m.username}</span>
                    </div>
                  </td>
                  {customGroupsEnabled && (
                    <td className="px-3 py-2 font-mono text-xs">
                      {m.accountid ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  )}
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {m.roleIds && m.roleIds.length > 0 ? m.roleIds.map((rid) => {
                          const r = roleMap.get(rid);
                          const name = r?.name ?? 'unknown';
                          const color = r?.color || null;
                          return (
                            <span
                              key={rid}
                              className="inline-flex items-center gap-1 rounded-full border px-1 py-0.5 text-[10px]"
                              style={{
                                backgroundColor: color ? `${color}20` : undefined,
                                borderColor: color || undefined,
                              }}
                              title={rid}
                            >
                              {name}
                            </span>
                          );
                        }) : <span className="text-xs text-muted-foreground">none</span>}
                      </div>
                    </td>
                    {customGroupsEnabled && (
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          {m.groups && m.groups.length > 0 ? m.groups.map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-muted-foreground/20 max-w-[120px] truncate"
                            >
                              {g}
                            </span>
                          )) : <span className="text-xs text-muted-foreground">none</span>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalMembers > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            <span>Page {page} • Showing {members.length} of {totalMembers.toLocaleString()} members</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>
            <span className="px-2 py-1">{page}</span>
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={!hasMore}
              className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Modal */}
      {modalUser && (
        <UserRoleModal
          open={!!modalUser}
          onClose={() => setModalUser(null)}
          user={modalUser}
          allRoles={roles}
          onAddRole={(roleId) => handleAddRole(modalUser.discordUserId, roleId)}
          onRemoveRole={(roleId) => handleRemoveRole(modalUser.discordUserId, roleId)}
        />
      )}
    </div>
  );
}
