"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Dialog } from "@headlessui/react";
import { fetchRoles, fetchMembersLegacy, addRole, removeRole } from "@/lib/api";
import { logAction } from "@/lib/logger";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useSession } from "next-auth/react";

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function RoleKanban({ guildId, customGroups = [] }: { guildId: string, customGroups?: any[] }) {

  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]); // Default to empty (Clear All)
  const [members, setMembers] = useState<any[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  
  // Pagination and infinite scroll state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // Start with 100 users per page
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Modal state for adding user
  const [addUserRoleId, setAddUserRoleId] = useState<string|null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addingUser, setAddingUser] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Infinite scroll refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  // Debounce user search for better performance
  const debouncedUserSearch = useDebounce(userSearch, 300);

  const { data: session } = useSession();

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

  // Load initial data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchRoles(guildId),
      fetchMembersLegacy(guildId)
    ]).then(([rolesData, membersData]) => {
      setRoles(rolesData);
      
      // If no roles are selected, only show first page (for performance)
      // If roles are selected, show all users for those roles
      if (selectedRoleIds.length === 0) {
        setMembers(membersData.slice(0, pageSize)); // Only load first page initially
        setHasMore(membersData.length > pageSize);
      } else {
        setMembers(membersData); // Load all users for selected roles
        setHasMore(false); // No pagination needed
      }
      
      setLoading(false);
    }).catch(error => {
      console.error('Failed to load data:', error);
      setLoading(false);
    });
  }, [guildId, pageSize, selectedRoleIds.length]);

  // Load more users when page changes
  useEffect(() => {
    if (page === 1) return; // Skip initial load

    // Prevent duplicate API calls
    if (loadingMore) return;

    setLoadingMore(true);
    console.log(`Fetching page ${page}, pageSize: ${pageSize}`);
    
    fetchMembersLegacy(guildId).then(membersData => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const newMembers = membersData.slice(startIndex, endIndex);
      
      console.log(`Page ${page}: loaded ${newMembers.length} users (${startIndex}-${endIndex} of ${membersData.length})`);
      
      setMembers(prev => [...prev, ...newMembers]);
      setHasMore(endIndex < membersData.length);
      setLoadingMore(false);
    }).catch(error => {
      console.error('Failed to load more members:', error);
      setLoadingMore(false);
      // Reset page on error to prevent stuck state
      setPage(prev => Math.max(1, prev - 1));
    });
  }, [page, guildId, pageSize]);

  // Reset pagination when filters change
  const handleRoleSelectionChange = useCallback((newRoleIds: string[]) => {
    setSelectedRoleIds(newRoleIds);
    setPage(1);
    setMembers([]); // Clear current members to reload
    setHasMore(false); // No more pagination needed for role-filtered view
    setLoadingMore(false); // Reset loading state
    
    // Immediately reload ALL users for the new role selection (not paginated)
    setLoading(true);
    fetchMembersLegacy(guildId).then(membersData => {
      // Load ALL users, not just the first page
      setMembers(membersData);
      setLoading(false);
    }).catch(error => {
      console.error('Failed to reload members after role change:', error);
      setLoading(false);
    });
  }, [guildId]);

  // Debounced page increment to prevent rapid API calls
  const debouncedPageIncrement = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    // Set loading state immediately to prevent multiple calls
    setLoadingMore(true);
    
    setPage(prev => {
      const nextPage = prev + 1;
      console.log(`Incrementing to page ${nextPage}`);
      return nextPage;
    });
  }, [loadingMore, hasMore]);

  // Infinite scroll observer with debouncing
  useEffect(() => {
    if (loading || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          // Use debounced increment to prevent rapid triggers
          debouncedPageIncrement();
        }
      },
      { threshold: 0.1, rootMargin: '100px' } // Add rootMargin to trigger earlier
    );

    if (lastElementRef.current) {
      observer.observe(lastElementRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, loadingMore, debouncedPageIncrement]);

  // Cleanup observer when loading state changes
  useEffect(() => {
    if (loadingMore && observerRef.current) {
      // Disconnect observer while loading to prevent multiple triggers
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, [loadingMore]);

  // Force dropdown background to match theme, even if theme changes while open
  useEffect(() => {
    if (!dropdownOpen || !dropdownRef.current) return;
    const el = dropdownRef.current;
    function setDropdownBg() {
      if (document.documentElement.classList.contains('dark')) {
        el.style.setProperty('background-color', '#18181b', 'important');
        el.style.setProperty('color', '#fff', 'important');
      } else {
        el.style.setProperty('background-color', '#fff', 'important');
        el.style.setProperty('color', '', 'important');
      }
    }
    setDropdownBg();
    // Listen for theme changes
    const observer = new MutationObserver(setDropdownBg);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [dropdownOpen]);

  // Memoized filtered members for better performance
  const filteredMembers = useMemo(() => {
    if (!debouncedUserSearch) return members;
    
    const searchLower = debouncedUserSearch.toLowerCase();
    return members.filter(m => 
      m.username.toLowerCase().includes(searchLower) ||
      (m.accountid && m.accountid.toLowerCase().includes(searchLower))
    );
  }, [members, debouncedUserSearch]);

  // Map roleId to members (only for selected roles)
  const roleMap: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    selectedRoleIds.forEach((roleId) => {
      map[roleId] = members.filter((m) => m.roleIds.includes(roleId));
    });
    return map;
  }, [members, selectedRoleIds]);

  // Users with no roles (only if no roles are selected, show a small sample)
  const noRole = useMemo(() => {
    if (selectedRoleIds.length === 0) {
      // If no roles selected, show a small sample of users with no roles
      return members.filter((m) => m.roleIds.length === 0).slice(0, 50);
    }
    return members.filter((m) => m.roleIds.length === 0);
  }, [members, selectedRoleIds]);

  // Users not in role (for add user modal) - paginated
  const usersNotInRole = useCallback((roleId: string) => {
    return members.filter((m) => !m.roleIds.includes(roleId));
  }, [members]);

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
      return noRole.map(u => ({ user: u, roleId: null }));
    }
    return (roleMap[col] || []).map(u => ({ user: u, roleId: col }));
  }, [noRole, roleMap]);

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId) return;
    
    // draggableId is now userId:roleId (or userId:null for noRole)
    const [userId, fromRoleIdRaw] = draggableId.split(":");
    const user = members.find((m: any) => m.discordUserId === userId);
    if (!user) return;
    
    const fromRole = fromRoleIdRaw === "null" ? null : fromRoleIdRaw;
    const toRole = destination.droppableId === "noRole" ? null : destination.droppableId;
    const validRoleIds = roles.map(r => r.roleId);
    
    if ((fromRole && !validRoleIds.includes(fromRole)) || (toRole && !validRoleIds.includes(toRole))) {
      alert('Unknown Role: One of the roles involved in this operation does not exist. The list will now refresh.');
      fetchRoles(guildId).then(setRoles);
      fetchMembersLegacy(guildId).then(setMembers);
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
            
            {/* Page size selector for better performance */}
            <select
              className="w-20 text-xs"
              value={pageSize.toString()}
              onChange={e => {
                const newSize = parseInt(e.target.value);
                setPageSize(newSize);
                setPage(1);
                
                // If no roles selected, reset pagination
                // If roles selected, keep showing all users
                if (selectedRoleIds.length === 0) {
                  setMembers([]);
                  setHasMore(true);
                }
              }}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
          
          <div className="relative w-full max-w-xs sm:max-w-xs md:max-w-xs lg:max-w-xs xl:max-w-xs" style={{maxWidth: 240}}>
            <input
              ref={inputRef}
              type="text"
              className="w-full px-2 py-1 border rounded text-sm"
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
                className="absolute left-0 top-full z-[100] bg-white dark:bg-neutral-900 border rounded shadow w-full max-h-48 overflow-y-auto mt-1"
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
                      className={`flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-accent ${selectedRoleIds.includes(role.roleId) ? 'bg-accent/50' : ''}`}
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
                      />
                      <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: role.color || '#e5e7eb', borderColor: role.color || '#e5e7eb' }} />
                      {role.name}
                    </div>
                  ))}
                {roles.filter(role =>
                  role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                  role.roleId.toLowerCase().includes(roleSearch.toLowerCase())
                ).length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">No roles found</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Performance info */}
        <div className="text-xs text-muted-foreground mb-2">
          {selectedRoleIds.length === 0 ? (
            `Showing ${members.length.toLocaleString()} users • Page size: ${pageSize} • No roles selected (showing users with no roles)`
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
                    {col !== "noRole" && (
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
      
      {/* Infinite scroll loader */}
      {hasMore && (
        <div ref={lastElementRef} className="h-8 flex items-center justify-center mt-4">
          <div className="text-xs text-muted-foreground">
            {loadingMore ? "Loading more users..." : "Scroll to load more users"}
          </div>
        </div>
      )}
      
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

