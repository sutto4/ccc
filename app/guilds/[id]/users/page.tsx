"use client";

import { useParams } from "next/navigation";
import { Dialog } from "@headlessui/react";
import Section from "@/components/ui/section";
import { addRole, removeRole } from "@/lib/api";
import { logAction } from "@/lib/logger";
import { Select } from "@/components/ui/select";
import { useGuildMembers, type Row } from "@/hooks/use-guild-members";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";

export default function UsersPage() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  const { canUseApp, loading: permissionsLoading, error: permissionsError } = usePermissions(guildId);
  
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
  const [selectedUser, setSelectedUser] = useState<Row | null>(null);
  const [modalRole, setModalRole] = useState<string>("");
  const [searchRole, setSearchRole] = useState("");

  // Role management functions
  const handleAddRole = async (userId: string, roleId: string) => {
    try {
      // Check permissions first
      if (!canUseApp) {
        alert('You do not have permission to manage roles in this server.');
        return;
      }

      const token = (session as any)?.accessToken as string;
      if (!token) return;
      
      console.log(`[USERS] Attempting to add role ${roleId} to user ${userId}`);
      await addRole(guildId, userId, roleId, (session as any)?.user?.id || 'unknown', token);
      console.log(`[USERS] Successfully added role ${roleId} to user ${userId}`);

      // Reload current page to reflect changes
      loadMembers(false);
      
      // Log the action
      const role = roles.find(r => r.roleId === roleId);
      logAction({
        guildId,
        userId: (session as any)?.user?.id || 'unknown',
        actionType: "role.add",
        user: { id: (session as any)?.user?.id || 'unknown', username: (session as any)?.user?.name || 'unknown' },
        actionData: {
          targetUser: userId,
          targetUsername: members.find(m => m.discordUserId === userId)?.username || 'unknown',
          role: roleId,
          roleName: role?.name || roleId,
          source: "users-page"
        }
      });
    } catch (error) {
      console.error('[USERS] Failed to add role:', error);
      console.error('[USERS] Error details:', {
        message: (error as any)?.message,
        status: (error as any)?.status,
        response: (error as any)?.response,
        stack: (error as any)?.stack
      });
      alert('Failed to add role: ' + ((error as any)?.message || 'Unknown error'));
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      // Check permissions first
      if (!canUseApp) {
        alert('You do not have permission to manage roles in this server.');
        return;
      }

      const token = (session as any)?.accessToken as string;
      if (!token) return;
      
      await removeRole(guildId, userId, roleId, (session as any)?.user?.id || 'unknown', token);
      
      // Reload current page to reflect changes
      loadMembers(false);
      
      // Log the action
      const role = roles.find(r => r.roleId === roleId);
      logAction({
        guildId,
        userId: (session as any)?.user?.id || 'unknown',
        actionType: "role.remove",
        user: { id: (session as any)?.user?.id || 'unknown', username: (session as any)?.user?.name || 'unknown' },
        actionData: {
          targetUser: userId,
          targetUsername: members.find(m => m.discordUserId === userId)?.username || 'unknown',
          role: roleId,
          roleName: role?.name || roleId,
          source: "users-page"
        }
      });
    } catch (error) {
      console.error('Failed to remove role:', error);
      alert('Failed to remove role: ' + (error as any)?.message || 'Unknown error');
    }
  };

  // Check permissions loading state
  if (permissionsLoading) {
    return (
      <Section title="Users">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </Section>
    );
  }

  // Check permissions error
  if (permissionsError) {
    return (
      <Section title="Users">
        <div className="p-8 text-center">
          <div className="text-red-600 mb-2">Permission Check Failed</div>
          <p className="text-sm text-muted-foreground">{permissionsError}</p>
        </div>
      </Section>
    );
  }

  // Check if user has access
  if (!canUseApp) {
    return (
      <Section title="Users">
        <div className="p-8 text-center">
          <div className="text-red-600 mb-2">⚠️ Access Denied</div>
          <p className="text-sm text-muted-foreground">
            You don't have permission to manage users in this server. Contact a server administrator.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Users"
      right={
        <div className="text-sm text-muted-foreground">
          {loadingRoles ? "Loading roles..." : loading ? "Loading users..." : `${totalMembers.toLocaleString()} users`}
        </div>
      }
    >
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by username, Discord ID, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Role filter:</span>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Page size:</span>
          <Select
            value={pageSize.toString()}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </Select>
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full divide-y divide-border text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-4">User</th>
              <th className="text-left py-2 px-6">Roles</th>
              <th className="text-left py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingRoles ? (
              <tr>
                <td colSpan={3} className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">Loading roles...</div>
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={3} className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-muted-foreground">
                  {totalMembers === 0 ? "No users found." : "No users in this page."}
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr
                  key={m.discordUserId}
                  className="border-b hover:bg-muted/50 hover:shadow-sm hover:scale-[1.01] transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    setSelectedUser(m);
                    setModalRole("");
                    setSearchRole("");
                  }}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={m.avatarUrl || DEFAULT_AVATAR}
                        alt={m.username}
                        className="w-8 h-8 rounded-full border bg-muted object-cover"
                      />
                      <div>
                        <div className="font-semibold text-sm">{m.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.discordUserId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex flex-wrap gap-1">
                      {m.roleIds.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      ) : (
                        m.roleIds.map((roleId) => {
                          const role = roleMap.get(roleId);
                          return role ? (
                            <span
                              key={roleId}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: role.color ? `${role.color}20` : '#f3f4f6',
                                color: role.color || '#6b7280',
                                border: `1px solid ${role.color || '#d1d5db'}`
                              }}
                            >
                              {role.name}
                            </span>
                          ) : (
                            <span
                              key={roleId}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                            >
                              {roleId}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination controls */}
      {!loading && totalMembers > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            <span>Page {page} • Showing {members.length} of {totalMembers.toLocaleString()} users</span>
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
              onClick={loadMore}
              disabled={!hasMore}
              className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* Role management modal */}
      {selectedUser && (
        <Dialog open={true} onClose={() => { setSelectedUser(null); setModalRole(""); setSearchRole(""); }} className="fixed z-[200] inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm" aria-hidden="true" onClick={() => { setSelectedUser(null); setModalRole(""); setSearchRole(""); }} />
          <div className="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-auto z-10 border bg-white/70 text-black backdrop-blur-lg border-white/60">
            <Dialog.Title className="text-lg font-semibold mb-2">Manage Roles for {selectedUser.username}</Dialog.Title>
            <div className="mb-2 text-xs text-muted-foreground">Discord ID: {selectedUser.discordUserId}</div>
            
            {/* Current Roles */}
            <div className="mb-4">
              <div className="font-semibold text-sm mb-2">Current Roles</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUser.roleIds.length > 0 ? selectedUser.roleIds.map((rid) => {
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
                      <button
                        onClick={async () => {
                          await handleRemoveRole(selectedUser.discordUserId, rid);
                        }}
                        className="ml-1 rounded-full border px-1 hover:bg-muted"
                        aria-label={`Remove ${name}`}
                        title="Remove role"
                      >
                        ×
                      </button>
                    </span>
                  );
                }) : <span className="text-xs text-muted-foreground">No roles assigned</span>}
              </div>
            </div>
            
            {/* Add Role */}
            <div>
              <div className="font-semibold text-sm mb-2">Add Role</div>
              <input
                type="text"
                className="w-full px-2 py-1 border rounded text-sm mb-2 bg-white/60 text-black placeholder:text-gray-400"
                placeholder="Search roles..."
                value={searchRole}
                onChange={e => setSearchRole(e.target.value)}
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto mb-3">
                {roles.filter(r =>
                  !selectedUser.roleIds.includes(r.roleId) &&
                  (searchRole === '' || r.name.toLowerCase().includes(searchRole.toLowerCase()) || r.roleId.toLowerCase().includes(searchRole.toLowerCase()))
                ).map(r => (
                  <div
                    key={r.roleId}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${modalRole === r.roleId ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setModalRole(r.roleId)}
                  >
                    <span className="truncate text-xs font-medium text-black">{r.name}</span>
                    <span className="ml-auto text-xs text-gray-500">{r.roleId}</span>
                  </div>
                ))}
                {roles.filter(r =>
                  !selectedUser.roleIds.includes(r.roleId) &&
                  (searchRole === '' || r.name.toLowerCase().includes(searchRole.toLowerCase()) || r.roleId.toLowerCase().includes(searchRole.toLowerCase()))
                ).length === 0 && (
                  <div className="text-xs text-gray-400 px-2 py-2">No roles available</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded bg-blue-600 text-white py-1 font-semibold text-xs shadow hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={!modalRole}
                  onClick={async () => {
                    await handleAddRole(selectedUser.discordUserId, modalRole);
                    setModalRole("");
                  }}
                >
                  Add Role
                </button>
                <button
                  className="flex-1 rounded border py-1 text-xs font-semibold hover:bg-gray-100 text-gray-700 border-gray-300 transition"
                  onClick={() => { setSelectedUser(null); setModalRole(""); setSearchRole(""); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </Section>
  );
}
