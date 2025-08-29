"use client";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { addRole, removeRole } from "@/lib/api";
import { logAction } from "@/lib/logger";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useSharedSession } from "@/components/providers";
import { useGuildMembersKanban } from "@/hooks/use-guild-members";

export default function RoleKanban({ guildId, customGroups = [] }: { guildId: string, customGroups?: any[] }) {

  // Use the shared hook for all member management
  const {
    loading,
    loadingRoles,
    members,
    roles,
    error,
    search: roleSearch,
    setSearch: setRoleSearch,
    debouncedSearch: debouncedUserSearch,
    roleMap,
    filteredMembers,
    roleMapMembers,
    noRole,
    usersNotInRole,
    loadMembers,
    DEFAULT_AVATAR
  } = useGuildMembersKanban(guildId);

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]); // Default to empty (Clear All)
  
  // Modal state for adding user
  const [addUserRoleId, setAddUserRoleId] = useState<string|null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addingUser, setAddingUser] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSharedSession();
  const { canUseApp, isOwner, loading: permissionsLoading } = usePermissions(guildId);

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
      alert('You do not have permission to modify roles in this server.');
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
      alert('Unknown Role: One of the roles involved in this operation does not exist. The list will now refresh.');
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
    if (fromRole && actor && user.roleIds.includes(fromRole)) {
      removeRole(guildId, user.discordUserId, fromRole, actor);
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
      addRole(guildId, user.discordUserId, toRole, actor);
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
      <Dialog open={!!addUserRoleId} onClose={() => setAddUserRoleId(null)} className="fixed z-[200] inset-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm" aria-hidden="true" onClick={() => setAddUserRoleId(null)} />
        <div
          className="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-auto z-10 border bg-white/70 text-black backdrop-blur-lg border-white/60"
        >
          <Dialog.Title className="text-lg font-semibold mb-2">Add user to role</Dialog.Title>
          <input
            type="text"
            className="w-full px-2 py-1 border rounded text-sm mb-2 bg-white/60 text-black placeholder:text-gray-400"
            placeholder="Search users by name or Discord ID..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto mb-3">
            {filteredMembers.filter(u => !u.roleIds.includes(addUserRoleId || "")).map(u => (
              <div
                key={u.discordUserId}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${selectedUserId === u.discordUserId ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => setSelectedUserId(u.discordUserId)}
              >
                <img src={u.avatarUrl} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                <span className="truncate text-xs font-medium text-black">{u.username}</span>
                {u.accountid && <span className="ml-auto text-xs text-gray-500">{u.accountid}</span>}
                <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
              </div>
            ))}
            {filteredMembers.filter(u => !u.roleIds.includes(addUserRoleId || "")).length === 0 && (
              <div className="text-xs text-gray-400 px-2 py-2">No users found</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded bg-blue-600 text-white py-1 font-semibold text-xs shadow hover:bg-blue-700 transition disabled:opacity-50"
              disabled={!selectedUserId || addingUser}
              onClick={async () => {
                if (!addUserRoleId || !selectedUserId) return;
                setAddingUser(true);
                try {
                  const actor = (session?.user as any)?.id || undefined;
                  const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || undefined;
                  await addRole(guildId, selectedUserId, addUserRoleId, actor);
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
                  setAddUserRoleId(null);
                } catch (e: any) {
                  alert('Failed to add user: ' + (e?.message || String(e)));
                } finally {
                  setAddingUser(false);
                }
              }}
            >Add</button>
            <button
              className="flex-1 rounded border py-1 text-xs font-semibold hover:bg-gray-100 text-gray-700 border-gray-300 transition"
              onClick={() => setAddUserRoleId(null)}
              disabled={addingUser}
            >Cancel</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

