"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { logAction } from "@/lib/logger";
import { useParams } from "next/navigation";
import Section from "@/components/ui/section";
import { addRole, removeRole, type Role } from "@/lib/api";
import { UserRoleModal } from "@/components/ui/user-role-modal";
import { useGuildMembers, type Row } from "@/hooks/use-guild-members";
import { useToast } from "@/hooks/use-toast";

export default function MembersPage() {
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  
  // Use the shared hook for all member management
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
    loadMore,
    roleMap,
    DEFAULT_AVATAR
  } = useGuildMembers(guildId);
  
  // UI state
  const [modalUser, setModalUser] = useState<Row | null>(null);
  const [view, setView] = useState<'card' | 'table'>('card');
  const [groupSearch, setGroupSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const { toast } = useToast();

  // Gather all unique custom groups
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => m.groups?.forEach(g => set.add(g)));
    return Array.from(set);
  }, [members]);

  // Add role to user
  async function handleAddRole(userId: string, roleId: string) {
    try {
      const actor = (session?.user as any)?.id || "";
      const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || actor;
      const user = members.find(m => m.discordUserId === userId);
      const role = roles.find(r => r.roleId === roleId);

      // Call API to persist - this will throw an error for hierarchy violations
      await addRole(guildId, userId, roleId, actor, (session as any)?.accessToken);

      // Show success toast
      toast({
        title: "Role Added Successfully",
        description: `${user?.username || 'User'} has been assigned the "${role?.name || 'role'}".`,
        variant: "success",
      });

      // Reload current page to reflect changes
      loadMembers(false);

      // Logging
      await logAction({
        guildId,
        userId: actor,
        user: { id: actor, username: actorUsername },
        actionType: "role.add",
        actionData: {
          targetUserId: userId,
          targetUsername: user?.username,
          roleId,
          roleName: role?.name,
        },
      });
    } catch (error: any) {
      // Ensure error is properly handled and doesn't bubble up
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      // For expected errors (hierarchy/permission issues), only log minimal info
      if (errorMessage.includes('hierarchy') || errorMessage.includes('permission') || errorMessage.includes('higher') || errorMessage.includes('cannot assign roles')) {
        console.log('[MEMBERS] Role assignment blocked (expected):', errorMessage);
        toast({
          title: "Role Assignment Blocked",
          description: errorMessage,
          variant: "destructive",
        });
        return; // Prevent any further error propagation
      } else {
        // For unexpected errors, log full details for debugging
        console.error('[MEMBERS] Unexpected error adding role:', {
          message: errorMessage,
          stack: error?.stack,
          error: error
        });
        toast({
          title: "Failed to Add Role",
          description: errorMessage,
          variant: "destructive",
        });
        return; // Prevent any further error propagation
      }
    }
  }
  // Remove role from user
  async function handleRemoveRole(userId: string, roleId: string) {
    try {
      const actor = (session?.user as any)?.id || "";
      const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || actor;
      const user = members.find(m => m.discordUserId === userId);
      const role = roles.find(r => r.roleId === roleId);

      // Call API to persist
      await removeRole(guildId, userId, roleId, actor, (session as any)?.accessToken);

      // Show success toast
      toast({
        title: "Role Removed Successfully",
        description: `${user?.username || 'User'} has been removed from the "${role?.name || 'role'}".`,
        variant: "success",
      });

      // Reload current page to reflect changes
      loadMembers(false);

      // Logging
      await logAction({
        guildId,
        userId: actor,
        user: { id: actor, username: actorUsername },
        actionType: "role.remove",
        actionData: {
          targetUserId: userId,
          targetUsername: user?.username,
          roleId,
          roleName: role?.name,
        },
      });
    } catch (error: any) {
      // Ensure error is properly handled and doesn't bubble up
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      // For expected errors (hierarchy/permission issues), only log minimal info
      if (errorMessage.includes('hierarchy') || errorMessage.includes('permission') || errorMessage.includes('higher') || errorMessage.includes('cannot assign roles')) {
        console.log('[MEMBERS] Role removal blocked (expected):', errorMessage);
        toast({
          title: "Role Removal Blocked",
          description: errorMessage,
          variant: "destructive",
        });
        return; // Prevent any further error propagation
      } else {
        // For unexpected errors, log full details for debugging
        console.error('[MEMBERS] Unexpected error removing role:', {
          message: errorMessage,
          stack: error?.stack,
          error: error
        });
        toast({
          title: "Failed to Remove Role",
          description: errorMessage,
          variant: "destructive",
        });
        return; // Prevent any further error propagation
      }
    }
  }

  return (
    <Section 
      title="Custom Groups"
      right={
        <div className="text-sm text-muted-foreground">
          {loadingRoles ? "Loading roles..." : loading ? "Loading members..." : `${totalMembers.toLocaleString()} members`}
        </div>
      }
    >
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by username, Discord ID, or account ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Role filter:</span>
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Group filter:</span>
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Page size:</span>
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
            Card View
          </button>
          <button
            className={`px-3 py-1 rounded font-medium border text-sm transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('table')}
          >
            Table View
          </button>
        </div>
      </div>
      {view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {loadingRoles ? (
            <div className="col-span-full py-8 text-center">
              <div className="text-sm text-muted-foreground">Loading roles...</div>
            </div>
          ) : loading ? (
            <div className="col-span-full py-8 text-center">
              <div className="text-sm text-muted-foreground">Loading members...</div>
            </div>
          ) : members.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              {totalMembers === 0 ? "No members found." : "No members on this page."}
            </div>
          ) : (
            members.map((m) => (
            // ...existing card view code...
            <div
              key={m.discordUserId}
              className="bg-card border rounded-xl p-4 flex flex-col items-center shadow-md relative hover:shadow-lg transition-shadow cursor-pointer hover:bg-primary/10"
              onClick={() => setModalUser(m)}
            >
              <img
                src={m.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt={m.username}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full border bg-muted object-cover mb-2"
                referrerPolicy="no-referrer"
              />
              <div className="font-semibold text-center truncate w-full" title={m.username}>{m.username}</div>
              <div className="font-mono text-xs text-muted-foreground truncate w-full text-center mb-1" title={m.accountid ?? undefined}>{m.accountid ?? <span className='text-muted-foreground'>—</span>}</div>
              <div className="w-full mb-1">
                <div className="text-xs font-semibold text-muted-foreground mb-0.5 text-center">Discord Roles</div>
                <div className="flex flex-wrap items-center gap-1 justify-center">
                  {(m.roleIds.length > 0
                    ? (m.rolesExpanded ? m.roleIds : m.roleIds.slice(0, 3)).map((rid) => {
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
                  {m.roleIds.length > 3 && (
                    <button
                      className="ml-2 text-xs underline text-muted-foreground hover:text-foreground"
                      onClick={e => {
                                              e.stopPropagation();
                      // Toggle role expansion for this specific member
                      const updatedMembers = members.map(mem => 
                        mem.discordUserId === m.discordUserId 
                          ? { ...mem, rolesExpanded: !mem.rolesExpanded } 
                          : mem
                      );
                      // This is just UI state, we can't update the hook's state directly
                      // For now, we'll just reload - in a real app, this should be local UI state
                      loadMembers(false);
                    }}
                    >
                      {m.rolesExpanded ? 'Show less' : `+${m.roleIds.length - 3} more`}
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full flex items-center my-1">
                <div className="flex-1 border-t border-muted" />
                <span className="mx-2 text-xs text-muted-foreground">Custom Groups</span>
                <div className="flex-1 border-t border-muted" />
              </div>
              <div className="flex flex-wrap items-center gap-1 justify-center w-full mb-1">
                {((m.groups!.length > 0)
                  ? m.groups!.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-muted-foreground/20 max-w-[120px] truncate"
                      >
                        {g}
                      </span>
                    ))
                  : <span className="text-xs text-muted-foreground">none</span>
                )}
                {m.groups!.length > 3 && (
                  <button
                    className="ml-2 text-xs underline text-muted-foreground hover:text-foreground"
                    onClick={e => {
                      e.stopPropagation();
                      // Toggle group expansion - just reload for now
                      loadMembers(false);
                    }}
                  >
                    {`+${m.groups!.length - 3} more`}
                  </button>
                )}
              </div>
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
                <th className="px-3 py-2 text-left font-semibold">Account ID</th>
                <th className="px-3 py-2 text-left font-semibold">Roles</th>
                <th className="px-3 py-2 text-left font-semibold">Groups</th>
              </tr>
            </thead>
            <tbody>
              {loadingRoles ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center">
                    <div className="text-sm text-muted-foreground">Loading roles...</div>
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center">
                    <div className="text-sm text-muted-foreground">Loading members...</div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
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
                        src={m.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                        alt={m.username}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full border bg-muted object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="font-medium truncate" title={m.username}>{m.username}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {m.accountid ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {m.roleIds.map((rid) => {
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
                      })}
                    </div>
                  </td>
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
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination controls */}
      {!loading && totalMembers > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
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
    </Section>
  );
}
