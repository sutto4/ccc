"use client";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { addRole, removeRole } from "@/lib/api";
import { logAction } from "@/lib/logger";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useSharedSession } from "@/components/providers";
import { useMembersKanbanQuery, useRolesQuery } from "@/hooks/use-members-query";
import { usePermissions } from "@/hooks/use-permissions-query";
import { useToast } from "@/hooks/use-toast";

export default function RoleKanban({ guildId, customGroups = [] }: { guildId: string, customGroups?: any[] }) {

  // Use React Query hooks for data fetching
  const [roleSearch, setRoleSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  
  const membersQuery = useMembersKanbanQuery(guildId);
  const rolesQuery = useRolesQuery(guildId);
  
  const loading = membersQuery.isLoading;
  const loadingRoles = rolesQuery.isLoading;
  const members = membersQuery.data || [];
  const roles = rolesQuery.data || [];
  const error = membersQuery.error || rolesQuery.error;
  
  const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";
  
  // Create role map for quick lookups
  const roleMap = new Map(roles.map(role => [role.id, role]));
  
  // Filter members based on search
  const filteredMembers = members.filter(member => 
    member.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    member.discordUserId.includes(userSearch)
  );
  
  // Group members by roles
  const roleMapMembers = useMemo(() => {
    const grouped: { [roleId: string]: any[] } = {};
    roles.forEach(role => {
      grouped[role.id] = filteredMembers.filter(member => 
        member.roleIds && member.roleIds.includes(role.id)
      );
    });
    return grouped;
  }, [filteredMembers, roles]);
  
  // Members without roles
  const noRole = filteredMembers.filter(member => 
    !member.roleIds || member.roleIds.length === 0
  );
  
  // Users not in any role (for adding to roles)
  const usersNotInRole = filteredMembers.filter(member => 
    !member.roleIds || member.roleIds.length === 0
  );
  
  // Load members function for compatibility
  const loadMembers = () => {
    membersQuery.refetch();
  };

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]); // Default to empty (Clear All)
  
  // Modal state for adding user
  const [addUserRoleId, setAddUserRoleId] = useState<string|null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addingUser, setAddingUser] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userSearchPage, setUserSearchPage] = useState(1);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchHasMore, setUserSearchHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSharedSession();
  const { canUseApp, isOwner, loading: permissionsLoading } = usePermissions(guildId);
  const { toast } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Efficient user search with debouncing and pagination
  const searchUsers = useCallback(async (searchTerm: string, page: number = 1) => {
    if (!searchTerm.trim()) {
      setUserSearchResults([]);
      setUserSearchHasMore(false);
      return;
    }

    setUserSearchLoading(true);
    try {
      // Search in current members first (fast local search)
      const localResults = members.filter(u => 
        !u.roleIds.includes(addUserRoleId || "") &&
        (u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
         u.discordUserId.includes(searchTerm) ||
         (u.accountid && u.accountid.toLowerCase().includes(searchTerm.toLowerCase())))
      ).slice(0, 50); // Limit local results

      setUserSearchResults(localResults);
      setUserSearchHasMore(localResults.length === 50);
      
      // If we need more results or local search is insufficient, fetch from API
      if (localResults.length < 20 && searchTerm.length > 2) {
        // TODO: Implement API search endpoint for large servers
        // For now, we'll use local search with pagination
        setUserSearchHasMore(false);
      }
    } catch (error) {
      console.error('[ROLE-KANBAN] Error searching users:', error);
      setUserSearchResults([]);
      setUserSearchHasMore(false);
    } finally {
      setUserSearchLoading(false);
    }
  }, [members, addUserRoleId]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearch.trim()) {
        setUserSearchPage(1);
        searchUsers(userSearch, 1);
      } else {
        setUserSearchResults([]);
        setUserSearchHasMore(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearch, searchUsers]);

  // Reset pagination when filters change
  const handleRoleSelectionChange = useCallback((newRoleIds: string[]) => {
    setSelectedRoleIds(newRoleIds);
    // Reload all members for the new role selection
    loadMembers();
  }, [loadMembers]);

  // Map roleId to members (only for selected roles)
  const selectedRoleMap: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    selectedRoleIds.forEach((roleId) => {
      map[roleId] = members.filter((m) => m.roleIds.includes(roleId));
    });
    return map;
  }, [members, selectedRoleIds]);

  // Users with no roles (only if no roles are selected, show a small sample)
  const selectedNoRole = useMemo(() => {
    if (selectedRoleIds.length === 0) {
      // If no roles selected, show a small sample of users with no roles
      return noRole.slice(0, 50);
    }
    return noRole;
  }, [noRole, selectedRoleIds]);

  // For DnD: columns = ["noRole", ...selectedRoleIds], sorted by role hierarchy
  const columns = useMemo(() => {
    if (selectedRoleIds.length === 0) {
      return ["noRole"]; // Only show noRole column if no roles selected
    }

    const roleIdToPosition: Record<string, number> = {};
    roles.forEach(r => { roleIdToPosition[r.roleId] = r.position ?? 0; });
    
    // Sort descending: highest position (top of Discord hierarchy) is leftmost
    const sortedRoleIds = [...selectedRoleIds]
      .filter(id => roles.some(r => r.roleId === id))
      .sort((a, b) => (roleIdToPosition[a] ?? 0) - (roleIdToPosition[b] ?? 0));
    
    return ["noRole", ...sortedRoleIds];
  }, [selectedRoleIds, roles]);

  // For DnD, each user-role instance must be unique
  const getColumnUserInstances = useCallback((col: string) => {
    if (col === "noRole") {
      return selectedNoRole.map(u => ({ user: u, roleId: null }));
    }
    return (selectedRoleMap[col] || []).map(u => ({ user: u, roleId: col }));
  }, [selectedNoRole, selectedRoleMap]);

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId) return;

    // Check permissions before allowing role changes
    if (!canUseApp) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to modify roles in this server.",
        variant: "destructive",
      });
      return;
    }

    // draggableId is now userId:roleId (or userId:null for noRole)
    const [userId, fromRoleIdRaw] = draggableId.split(":");
    const user = members.find((m: any) => m.discordUserId === userId);
    if (!user) return;

    const fromRole = fromRoleIdRaw === "null" ? null : fromRoleIdRaw;
    const toRole = destination.droppableId === "noRole" ? null : destination.droppableId;
    const validRoleIds = roles.map(r => r.roleId);

    if ((fromRole && !validRoleIds.includes(fromRole)) || (toRole && !validRoleIds.includes(toRole))) {
      toast({
        title: "Unknown Role",
        description: "One of the roles involved in this operation does not exist. The list will now refresh.",
        variant: "destructive",
      });
      loadMembers();
      return;
    }

    const actor = (session?.user as any)?.id || undefined;
    const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || undefined;
    
    let updatedUser = { ...user };
    let changed = false;
    
    // Optimistically update UI first
    if (fromRole && user.roleIds.includes(fromRole)) {
      updatedUser = {
        ...updatedUser,
        roleIds: updatedUser.roleIds.filter((rid: string) => rid !== fromRole)
      };
      changed = true;
    }
    if (toRole && !user.roleIds.includes(toRole)) {
      updatedUser = {
        ...updatedUser,
        roleIds: [...updatedUser.roleIds, toRole]
      };
      changed = true;
    }
    
    if (changed) {
      setMembers(prev => prev.map(m => m.discordUserId === updatedUser.discordUserId ? updatedUser : m));
    }
    
    // Now perform API calls and logging in background
    try {
      if (fromRole && actor && user.roleIds.includes(fromRole)) {
        await removeRole(guildId, user.discordUserId, fromRole, actor);
        const roleObj = roles.find(r => r.roleId === fromRole);
        logAction({
          guildId,
          userId: actor,
          actionType: "role.remove",
          user: { id: actor, username: actorUsername },
          actionData: {
            targetUser: user.discordUserId,
            targetUsername: user.username,
            role: fromRole,
            roleName: roleObj?.name || fromRole,
            source: "kanban-dnd"
          }
        });
      }
      if (toRole && actor && !user.roleIds.includes(toRole)) {
        await addRole(guildId, user.discordUserId, toRole, actor);
        const roleObj = roles.find(r => r.roleId === toRole);
        logAction({
          guildId,
          userId: actor,
          actionType: "role.add",
          user: { id: actor, username: actorUsername },
          actionData: {
            targetUser: user.discordUserId,
            targetUsername: user.username,
            role: toRole,
            roleName: roleObj?.name || toRole,
            source: "kanban-dnd"
          }
        });
      }

      // Show success toast
      toast({
        title: "Roles Updated Successfully",
        description: "User roles have been updated.",
        variant: "success",
      });

      // Reload data to ensure UI is in sync with server state
      loadMembers();
    } catch (error) {
      // Revert optimistic update on error
      if (changed) {
        setMembers(prev => prev.map(m => m.discordUserId === user.discordUserId ? user : m));
      }

      // Ensure error is properly handled and doesn't bubble up
      const errorMessage = (error as any)?.message || (error as any)?.toString() || 'Unknown error';

      // For expected errors (hierarchy/permission issues), only log minimal info
      if (errorMessage.includes('hierarchy') || errorMessage.includes('permission') || errorMessage.includes('higher') || errorMessage.includes('cannot assign roles') || errorMessage.includes('uneditable_role')) {
        console.log('[ROLE-KANBAN] Role assignment blocked (expected):', errorMessage);
        
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
        console.error('[ROLE-KANBAN] Unexpected error updating role:', {
          message: errorMessage,
          stack: (error as any)?.stack,
          error: error
        });
        toast({
          title: "Failed to Update Role",
          description: errorMessage,
          variant: "destructive",
        });
        return; // Prevent any further error propagation
      }
    }
  }, [guildId, members, roles, session]);

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have permissions
  if (!canUseApp) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ Access Denied</div>
          <p className="text-sm text-muted-foreground">
            You don't have permission to manage roles in this server.
            {!isOwner && " Contact a server administrator to grant you access."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Role selection UI: searchable multi-select */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-2 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium mr-2">Visible Roles:</span>
            <button
              className="px-2 py-1 rounded bg-muted text-xs border hover:bg-accent"
              onClick={() => handleRoleSelectionChange(roles.map(r => r.roleId))}
            >Add All</button>
            <button
              className="px-2 py-1 rounded bg-muted text-xs border hover:bg-accent"
              onClick={() => handleRoleSelectionChange([])}
            >Clear All</button>
          </div>
          
          <div className="relative w-full max-w-xs sm:max-w-xs md:max-w-xs lg:max-w-xs xl:max-w-xs" style={{maxWidth: 240}}>
            <input
              ref={inputRef}
              type="text"
              className="w-full px-2 py-1 border border-border rounded text-sm bg-background text-foreground placeholder:text-muted-foreground"
              placeholder="Search roles..."
              value={roleSearch}
              onChange={e => {
                setRoleSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                setDropdownOpen(true);
                inputRef.current?.select();
              }}
              autoComplete="off"
            />
            {roleSearch && (
              <button
                className="absolute right-2 top-1 text-xs text-muted-foreground"
                onClick={() => setRoleSearch("")}
                tabIndex={-1}
              >✕</button>
            )}
            {dropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-full z-[100] bg-card border border-border rounded shadow-lg w-full max-h-48 overflow-y-auto mt-1"
                style={{ minWidth: 200 }}
              >
                {roles
                  .filter(role =>
                    role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                    role.roleId.toLowerCase().includes(roleSearch.toLowerCase())
                  )
                  .map(role => (
                    <div
                      key={role.roleId}
                      className={`flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors ${selectedRoleIds.includes(role.roleId) ? 'bg-accent/50 text-accent-foreground' : 'text-foreground'}`}
                      onClick={() => {
                        const newRoleIds = selectedRoleIds.includes(role.roleId)
                          ? selectedRoleIds.filter(id => id !== role.roleId)
                          : [...selectedRoleIds, role.roleId];
                        handleRoleSelectionChange(newRoleIds);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.roleId)}
                        readOnly
                        className="text-primary"
                      />
                      <span 
                        className="inline-block h-3 w-3 rounded-full border" 
                        style={{ 
                          backgroundColor: role.color ? `${role.color}20` : 'var(--muted)',
                          borderColor: role.color || 'var(--border)'
                        }} 
                      />
                      <span className="truncate">{role.name}</span>
                    </div>
                  ))}
                {roles.filter(role =>
                  role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                  role.roleId.toLowerCase().includes(roleSearch.toLowerCase())
                ).length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground border-t border-border pt-2">No roles found</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Performance info */}
        <div className="text-xs text-muted-foreground mb-2">
          {selectedRoleIds.length === 0 ? (
            `Showing ${members.length.toLocaleString()} users • No roles selected (showing users with no roles)`
          ) : (
            `Showing ${members.length.toLocaleString()} users • ${selectedRoleIds.length} roles selected (all users loaded)`
          )}
        </div>
      </div>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="overflow-x-auto relative" style={{ maxHeight: 600, overflowY: 'auto' }}>
          {/* Sticky header row for all columns */}
          <div className="flex gap-4 min-w-max sticky top-0 z-20" style={{ backdropFilter: 'blur(2px)' }}>
            {columns.map((col) => (
              <div
                key={col}
                className="w-64 font-semibold rounded-md px-2 py-1 bg-accent border border-border text-center"
                style={{ marginBottom: 8, background: 'var(--accent, #f3f4f6)' }}
              >
                {col === "noRole" ? 
                  `No Role (${noRole.length})` : 
                  `${roles.find((r) => r.roleId === col)?.name} (${roleMap[col]?.length || 0})`
                }
              </div>
            ))}
          </div>
          <div className="flex gap-4 min-w-max">
            {columns.map((col) => (
              <Droppable droppableId={col} key={col}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`w-64 bg-muted/40 rounded-xl flex-shrink-0 transition-shadow flex flex-col ${snapshot.isDraggingOver ? 'ring-2 ring-primary/40' : ''}`}
                    style={{ maxHeight: 600 }}
                  >
                    {/* Add user button pinned to top (not for 'noRole' column) */}
                    {col !== "noRole" && canUseApp && (
                      <button
                        className="mt-3 mx-3 rounded bg-primary text-primary-foreground py-1 text-xs font-semibold shadow hover:bg-primary/90 transition"
                        onClick={() => {
                          setAddUserRoleId(col);
                          setUserSearch("");
                          setSelectedUserId("");
                        }}
                      >
                        ＋ Add user
                      </button>
                    )}
                    
                    <div className="space-y-2 min-h-[40px] px-3 pb-3" style={{ flex: 1 }}>
                      {getColumnUserInstances(col).map(({ user, roleId }, idx) => (
                        <Draggable draggableId={`${user.discordUserId}:${roleId ?? "null"}`} index={idx} key={`${user.discordUserId}:${roleId ?? "null"}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-card rounded-lg p-2 flex items-center gap-2 shadow-sm transition ${snapshot.isDragging ? 'ring-2 ring-primary/60' : ''}`}
                            >
                              <span
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing mr-2 flex items-center justify-center text-gray-400 hover:text-primary"
                                title="Drag user"
                                style={{ fontSize: 16 }}
                              >
                                <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><circle cx="4" cy="5" r="1.2" fill="currentColor"/><circle cx="4" cy="8" r="1.2" fill="currentColor"/><circle cx="4" cy="11" r="1.2" fill="currentColor"/><circle cx="8" cy="5" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="11" r="1.2" fill="currentColor"/></svg>
                              </span>
                              <img src={user.avatarUrl} alt={user.username} className="w-7 h-7 rounded-full border bg-muted object-cover" />
                              <span className="truncate text-xs font-medium">{user.username}</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {getColumnUserInstances(col).length === 0 && <div className="text-xs text-muted-foreground">None</div>}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>
       
       {/* Show loading state when changing roles */}
       {loading && (
         <div className="h-8 flex items-center justify-center mt-4">
           <div className="text-xs text-muted-foreground">Loading users for selected roles...</div>
         </div>
       )}
      
      {/* Modal for adding user to role */}
      <Dialog 
        open={!!addUserRoleId} 
        onClose={() => {
          setAddUserRoleId(null);
          setUserSearch("");
          setSelectedUserId("");
          setUserSearchResults([]);
          setUserSearchPage(1);
        }} 
        className="fixed z-[200] inset-0 flex items-center justify-center"
      >
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" onClick={() => setAddUserRoleId(null)} />
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
          <Dialog.Title className="text-lg font-bold text-gray-900 mb-3">Add user to role</Dialog.Title>
          
          {/* Search Input */}
          <div className="mb-3">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/80 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 shadow-sm"
              placeholder="Search users by name, Discord ID, or account ID..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          {/* User List */}
          <div className="max-h-40 overflow-y-auto bg-gray-50/50 rounded-lg border border-gray-100 mb-3">
            {userSearchLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="ml-2 text-xs text-gray-500">Searching...</span>
              </div>
            ) : userSearchResults.length > 0 ? (
              userSearchResults.map(u => (
                <div
                  key={u.discordUserId}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 ${
                    selectedUserId === u.discordUserId
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-white/60'
                  }`}
                  onClick={() => setSelectedUserId(u.discordUserId)}
                >
                  <img src={u.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"} alt={u.username} className="w-6 h-6 rounded-full border border-white shadow-sm object-cover" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate" title={u.username}>{u.username}</span>
                    {u.accountid && <span className="block text-xs text-gray-500 truncate">{u.accountid}</span>}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {u.discordUserId}
                  </div>
                  {selectedUserId === u.discordUserId && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 px-3 py-4 text-center">
                {userSearch ? 'No users found matching your search' : 'Start typing to search users...'}
              </div>
            )}
            
            {/* Load More Button */}
            {userSearchHasMore && userSearchResults.length > 0 && (
              <div className="border-t border-gray-100 p-2">
                <button
                  className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-1.5 rounded-md transition-colors duration-200"
                  onClick={() => {
                    setUserSearchPage(prev => prev + 1);
                    searchUsers(userSearch, userSearchPage + 1);
                  }}
                  disabled={userSearchLoading}
                >
                  {userSearchLoading ? 'Loading...' : 'Load More Users'}
                </button>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedUserId || addingUser}
              onClick={async () => {
                if (!addUserRoleId || !selectedUserId) return;
                setAddingUser(true);
                try {
                  const actor = (session?.user as any)?.id || undefined;
                  const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || undefined;
                  console.log(`[ROLE-KANBAN] Attempting to add role ${addUserRoleId} to user ${selectedUserId} by actor ${actor}`);
                  await addRole(guildId, selectedUserId, addUserRoleId, actor);
                  console.log(`[ROLE-KANBAN] Successfully added role ${addUserRoleId} to user ${selectedUserId}`);
                  setMembers(prev => prev.map(m => m.discordUserId === selectedUserId ? { ...m, roleIds: [...m.roleIds, addUserRoleId] } : m));

                  // Logging
                  const userObj = members.find(m => m.discordUserId === selectedUserId);
                  const roleObj = roles.find(r => r.roleId === addUserRoleId);
                  logAction({
                    guildId,
                    userId: actor,
                    actionType: "role.add",
                    user: { id: actor, username: actorUsername },
                    actionData: {
                      targetUser: selectedUserId,
                      targetUsername: userObj?.username,
                      role: addUserRoleId,
                      roleName: roleObj?.name || addUserRoleId,
                      source: "kanban-modal"
                    }
                  });

                  // Show success toast
                  toast({
                    title: "User Added Successfully",
                    description: `${userObj?.username || 'User'} has been added to ${roleObj?.name || 'the role'}.`,
                    variant: "success",
                  });

                  // Reload data to ensure UI is in sync
                  loadMembers();
                  setAddUserRoleId(null);
                } catch (e: any) {
                  const errorMessage = e?.message || e?.toString() || 'Unknown error';

                  // For expected errors (hierarchy/permission issues), only log minimal info
                  if (errorMessage.includes('hierarchy') || errorMessage.includes('permission') || errorMessage.includes('higher') || errorMessage.includes('cannot assign roles') || errorMessage.includes('uneditable_role')) {
                    console.log('[ROLE-KANBAN] Role assignment blocked (expected):', errorMessage);
                    
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
                    console.error('[ROLE-KANBAN] Unexpected error adding user to role:', {
                      message: errorMessage,
                      stack: e?.stack,
                      error: e
                    });
                    toast({
                      title: "Failed to Add User",
                      description: errorMessage,
                      variant: "destructive",
                    });
                    return; // Prevent any further error propagation
                  }
                } finally {
                  setAddingUser(false);
                }
              }}
            >Add</button>
            <button
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300"
              onClick={() => setAddUserRoleId(null)}
              disabled={addingUser}
            >Cancel</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

