"use client";

import { useParams } from "next/navigation";
import { Dialog } from "@headlessui/react";
import Section from "@/components/ui/section";
import { addRole, removeRole } from "@/lib/api";
import { logAction } from "@/lib/logger";
import { Select } from "@/components/ui/select";
import { useMembersWithRolesOptimized, type MemberRow } from "@/hooks/use-members-query-optimized";
import { type Role } from "@/lib/api";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions-query";
import { useToast } from "@/hooks/use-toast";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

export default function UsersPage() {
  return (
    <AuthErrorBoundary>
      <UsersPageContent />
    </AuthErrorBoundary>
  );
}

function UsersPageContent() {
  
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  const { canUseApp, loading: permissionsLoading, error: permissionsError } = usePermissions(guildId);
  const { toast } = useToast();
  
  // Use optimized React Query hooks for data fetching
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  
  const membersQuery = useMembersWithRolesOptimized(guildId, { search, roleFilter, page, pageSize });
  
  const loading = membersQuery.isLoading;
  const loadingRoles = membersQuery.rolesLoading;
  const members: MemberRow[] = membersQuery.data?.members || [];
  const roles: Role[] = membersQuery.roles || [];
  const error = membersQuery.error || membersQuery.rolesError;
  const hasMore = membersQuery.data?.hasMore || false;
  const totalMembers = membersQuery.data?.totalCount || 0;
  
  // Create role map for quick lookups
  const roleMap = new Map(roles.map((role: any) => [role.roleId, role]));
  
  const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";
  
  // Load more function for pagination
  const loadMore = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };
  
  // Load members function (for compatibility)
  const loadMembers = () => {
    membersQuery.refetch();
  };
  
  // UI state
  const [selectedUser, setSelectedUser] = useState<MemberRow | null>(null);
  const [modalRole, setModalRole] = useState<string>("");
  const [searchRole, setSearchRole] = useState("");

  // Role management functions
  const handleAddRole = async (userId: string, roleId: string) => {
    try {
      // Check permissions first
      if (!canUseApp) {
        toast({
          title: "Permission Denied",
          description: "You do not have permission to manage roles in this server.",
          variant: "destructive",
        });
        return;
      }

      console.log(`[USERS] Attempting to add role ${roleId} to user ${userId}`);

      // Use fetch directly to the API endpoint which handles authentication server-side
      const response = await fetch(`/api/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actor: (session as any)?.user?.id || 'unknown'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add role (${response.status})`);
      }

      const result = await response.json();
      console.log(`[USERS] Successfully added role ${roleId} to user ${userId}`);

      // Show success toast
      toast({
        title: "Role Added Successfully",
        description: `${members.find(m => m.discordUserId === userId)?.username || 'User'} has been assigned the role.`,
        variant: "success",
      });

      // Update selectedUser if it's the same user to reflect role changes in modal
      if (selectedUser && selectedUser.discordUserId === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          roleIds: [...prev.roleIds, roleId]
        } : null);
      }
      
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
      // Ensure error is properly handled and doesn't bubble up
      const errorMessage = (error as any)?.message || (error as any)?.toString() || 'Unknown error';

      // For expected errors (hierarchy/permission issues), only log minimal info
      if (errorMessage.includes('hierarchy') || errorMessage.includes('permission') || errorMessage.includes('higher') || errorMessage.includes('cannot assign roles') || errorMessage.includes('uneditable_role')) {
        console.log('[USERS] Role assignment blocked (expected):', errorMessage);
        
        // Provide friendly error messages for common issues
        let friendlyMessage = errorMessage;
        if (errorMessage.toLowerCase().includes('hierarchy') || errorMessage.toLowerCase().includes('higher') || errorMessage.toLowerCase().includes('position')) {
          friendlyMessage = "❌ Bot's role is not high enough in the server hierarchy to assign this role. Move the bot's role above the target role in Server Settings > Roles.";
        } else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('manage_roles')) {
          friendlyMessage = "❌ Bot lacks 'Manage Roles' permission. Grant this permission in Server Settings > Roles.";
        } else if (errorMessage.toLowerCase().includes('cannot assign roles')) {
          friendlyMessage = "❌ Bot cannot assign this role due to permission restrictions.";
        } else if (errorMessage.toLowerCase().includes('uneditable_role')) {
          friendlyMessage = "❌ This role cannot be assigned/removed. It may be a managed role (from a bot or integration) or have special restrictions.";
        }
        
        toast({
          title: "Role Assignment Blocked",
          description: friendlyMessage,
          variant: "destructive",
        });
        return; // Prevent any further error propagation
      } else {
        // For unexpected errors, log full details for debugging
        console.error('[USERS] Unexpected error adding role:', {
          message: errorMessage,
          stack: (error as any)?.stack,
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
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      // Check permissions first
      if (!canUseApp) {
        toast({
          title: "Permission Denied",
          description: "You do not have permission to manage roles in this server.",
          variant: "destructive",
        });
        return;
      }

      // Use fetch directly to the API endpoint which handles authentication server-side
      const response = await fetch(`/api/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actor: (session as any)?.user?.id || 'unknown'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to remove role (${response.status})`);
      }

      const result = await response.json();

      // Show success toast
      toast({
        title: "Role Removed Successfully",
        description: `${members.find(m => m.discordUserId === userId)?.username || 'User'} has been removed from the role.`,
        variant: "success",
      });

      // Update selectedUser if it's the same user to reflect role changes in modal
      if (selectedUser && selectedUser.discordUserId === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          roleIds: prev.roleIds.filter(id => id !== roleId)
        } : null);
      }
      
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
      // Ensure error is properly handled and doesn't bubble up
      const errorMessage = (error as any)?.message || (error as any)?.toString() || 'Unknown error';

      // For expected errors (hierarchy/permission issues), only log minimal info
      if (errorMessage.includes('hierarchy') || errorMessage.includes('permission') || errorMessage.includes('higher') || errorMessage.includes('cannot assign roles') || errorMessage.includes('uneditable_role')) {
        console.log('[USERS] Role removal blocked (expected):', errorMessage);
        
        // Provide friendly error messages for common issues
        let friendlyMessage = errorMessage;
        if (errorMessage.toLowerCase().includes('hierarchy') || errorMessage.toLowerCase().includes('higher') || errorMessage.toLowerCase().includes('position')) {
          friendlyMessage = "❌ Bot's role is not high enough in the server hierarchy to remove this role. Move the bot's role above the target role in Server Settings > Roles.";
        } else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('manage_roles')) {
          friendlyMessage = "❌ Bot lacks 'Manage Roles' permission. Grant this permission in Server Settings > Roles.";
        } else if (errorMessage.toLowerCase().includes('cannot assign roles')) {
          friendlyMessage = "❌ Bot cannot remove this role due to permission restrictions.";
        } else if (errorMessage.toLowerCase().includes('uneditable_role')) {
          friendlyMessage = "❌ This role cannot be assigned/removed. It may be a managed role (from a bot or integration) or have special restrictions.";
        }
        
        toast({
          title: "Role Removal Blocked",
          description: friendlyMessage,
          variant: "destructive",
        });
        return; // Prevent any further error propagation
      } else {
        // For unexpected errors, log full details for debugging
        console.error('[USERS] Unexpected error removing role:', {
          message: errorMessage,
          stack: (error as any)?.stack,
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
          <p className="text-sm text-muted-foreground mb-4">
            You don't have permission to manage users in this server. Contact a server administrator.
          </p>
          <p className="text-sm text-muted-foreground">
            If you're an administrator, you can configure role permissions in the{' '}
            <a 
              href={`/guilds/${guildId}/settings`} 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              server settings
            </a>
            .
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
      {error && <div className="mb-3 text-sm text-red-600">{String(error)}</div>}

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
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" onClick={() => { setSelectedUser(null); setModalRole(""); setSearchRole(""); }} />
          <div 
            className="relative rounded-xl shadow-xl p-4 w-full max-w-md mx-auto z-10 border border-white/20"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#111827',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)'
            }}
          >
            {/* Header */}
            <div className="mb-4">
              <Dialog.Title className="text-lg font-bold text-gray-900 mb-1">Manage Roles for {selectedUser.username}</Dialog.Title>
              <p className="text-xs text-gray-600 font-mono">Discord ID: {selectedUser.discordUserId}</p>
            </div>
            
            {/* Current Roles Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Roles</h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedUser.roleIds.length > 0 ? selectedUser.roleIds.map((rid) => {
                  const r = roleMap.get(rid);
                  const name = r?.name ?? "unknown";
                  const color = r?.color || null;
                  return (
                    <span
                      key={rid}
                      className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-1 text-xs font-medium text-gray-700 border border-gray-200 transition-all duration-200 group"
                      style={{
                        backgroundColor: color ? `${color}20` : undefined,
                        borderColor: color || undefined,
                      }}
                      title={rid}
                    >
                      <span className="truncate max-w-[100px]" title={name}>{name}</span>
                      <button
                        onClick={async () => {
                          await handleRemoveRole(selectedUser.discordUserId, rid);
                        }}
                        className="ml-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-0.5 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                        aria-label={`Remove ${name}`}
                        title="Remove role"
                      >
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  );
                }) : <span className="text-xs text-gray-500 italic">No roles assigned</span>}
              </div>
            </div>
            
            {/* Add Role Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Add Role</h3>
              <div className="mb-3">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/80 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 shadow-sm"
                  placeholder="Search roles..."
                  value={searchRole}
                  onChange={e => setSearchRole(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-32 overflow-y-auto bg-gray-50/50 rounded-lg border border-gray-100 mb-3">
                {roles.filter(r =>
                  !selectedUser.roleIds.includes(r.roleId) &&
                  (searchRole === '' || r.name.toLowerCase().includes(searchRole.toLowerCase()) || r.roleId.toLowerCase().includes(searchRole.toLowerCase()))
                ).map(r => (
                  <div
                    key={r.roleId}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 ${
                      modalRole === r.roleId ? 'bg-blue-50 border-blue-200' : 'hover:bg-white/60'
                    }`}
                    onClick={() => setModalRole(r.roleId)}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate" title={r.name}>{r.name}</span>
                      <span className="block text-xs text-gray-500 font-mono">{r.roleId}</span>
                    </div>
                    {modalRole === r.roleId && (
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
                {roles.filter(r =>
                  !selectedUser.roleIds.includes(r.roleId) &&
                  (searchRole === '' || r.name.toLowerCase().includes(searchRole.toLowerCase()) || r.roleId.toLowerCase().includes(searchRole.toLowerCase()))
                ).length === 0 && (
                  <div className="text-xs text-gray-500 px-3 py-4 text-center">
                    {searchRole ? 'No roles found matching your search' : 'No roles available to add'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!modalRole}
                onClick={async () => {
                  await handleAddRole(selectedUser.discordUserId, modalRole);
                  setModalRole("");
                }}
              >
                Add Role
              </button>
              <button
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300"
                onClick={() => { setSelectedUser(null); setModalRole(""); setSearchRole(""); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Section>
  );

}
