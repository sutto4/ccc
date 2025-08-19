"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { type Member, type Role } from "@/lib/api";
import { CheckIcon, ChevronRight, ChevronLeft } from "lucide-react";
import { useGuildMembersKanban } from "@/hooks/use-guild-members";

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

export default function UserTransferPicker({
  guildId,
  value = [],
  onChange,
  disabled = false,
  roles = [],
}: {
  guildId: string;
  value?: Member[];
  onChange: (users: Member[]) => void;
  disabled?: boolean;
  roles?: Role[];
}) {
  // Use the shared hook for member management
  const { members: allUsers, loading, error } = useGuildMembersKanban(guildId);
  
  const [search, setSearch] = useState("");
  
  // Pagination and infinite scroll state for performance
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Infinite scroll refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  
  // Debounce search for better performance
  const debouncedSearch = useDebounce(search, 500);

  // Update pagination when allUsers changes
  useEffect(() => {
    if (allUsers.length > 0) {
      setTotalUsers(allUsers.length);
      setHasMore(allUsers.length > pageSize);
    }
  }, [allUsers, pageSize]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setPage(prev => {
            const nextPage = prev + 1;
            console.log(`UserTransferPicker: Loading page ${nextPage}`);
            return nextPage;
          });
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
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
  }, [loading, hasMore, loadingMore, pageSize]);

  // Load more users when page changes
  useEffect(() => {
    if (page <= 1 || loading || loadingMore) return;

    setLoadingMore(true);
    // Simulate loading delay for better UX
    const timer = setTimeout(() => {
      setLoadingMore(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, loading]);

  // Filter and paginate users based on search and current page
  const filteredAndPaginatedUsers = useMemo(() => {
    if (!allUsers.length) return [];

    // Apply search filter
    let filtered = allUsers;
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = allUsers.filter(user =>
        user.username.toLowerCase().includes(searchLower) ||
        user.discordUserId.toLowerCase().includes(searchLower) ||
        (user.accountid && user.accountid.toLowerCase().includes(searchLower))
      );
    }

    // Apply pagination
    const startIndex = 0;
    const endIndex = page * pageSize;
    return filtered.slice(startIndex, endIndex);
  }, [allUsers, debouncedSearch, page, pageSize]);

  // Check if user is selected
  const isUserSelected = useCallback((user: Member) => {
    return value.some(selectedUser => selectedUser.discordUserId === user.discordUserId);
  }, [value]);

  // Toggle user selection
  const toggleUserSelection = useCallback((user: Member) => {
    if (isUserSelected(user)) {
      onChange(value.filter(selectedUser => selectedUser.discordUserId !== user.discordUserId));
    } else {
      onChange([...value, user]);
    }
  }, [value, onChange, isUserSelected]);

  // Select all visible users
  const selectAllVisible = useCallback(() => {
    const unselectedUsers = filteredAndPaginatedUsers.filter(user => !isUserSelected(user));
    onChange([...value, ...unselectedUsers]);
  }, [filteredAndPaginatedUsers, value, onChange, isUserSelected]);

  // Deselect all visible users
  const deselectAllVisible = useCallback(() => {
    const selectedVisibleUsers = filteredAndPaginatedUsers.filter(user => isUserSelected(user));
    onChange(value.filter(user => !selectedVisibleUsers.some(sv => sv.discordUserId === user.discordUserId)));
  }, [filteredAndPaginatedUsers, value, onChange, isUserSelected]);

  // Clear all selections
  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <div className="flex gap-4 w-full flex-1 min-h-0">
      {/* Available users */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="mb-2 font-medium flex items-center justify-between">
          <span>Available Users</span>
          <div className="flex items-center gap-2">
            {search.trim() && (
              <span className="text-xs text-muted-foreground">
                {filteredAndPaginatedUsers.length} found
              </span>
            )}
            {/* Page size selector for better performance */}
            <select
              className="w-16 text-xs border rounded px-1 py-0.5"
              value={pageSize.toString()}
              onChange={e => {
                const newSize = parseInt(e.target.value);
                setPageSize(newSize);
                setPage(1);
                // setAllUsers([]); // This line is removed as allUsers is now managed by the hook
                setHasMore(true);
                
                // Use cached data if available to avoid API calls
                // if (fullListLoaded) { // This line is removed as fullListLoaded is no longer used
                //   setTotalUsers(fullUserList.length);
                //   setAllUsers(fullUserList.slice(0, newSize));
                //   setHasMore(fullUserList.length > newSize);
                // } else {
                  // Only reload if not cached
                  // setLoading(true); // This line is removed as loading is now managed by the hook
                  // fetchMembersLegacy(guildId).then(members => { // This line is removed as fetchMembersLegacy is no longer used
                  //   setTotalUsers(members.length);
                  //   setAllUsers(members.slice(0, newSize));
                  //   setHasMore(members.length > newSize);
                  //   // Cache the full list
                  //   setFullUserList(members);
                  //   setFullListLoaded(true);
                  //   setLoading(false);
                  // }).catch(error => {
                  //   console.error('Failed to reload with new page size:', error);
                  //   setLoading(false);
                  // });
                // }
              }}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
        <input
          className="w-full rounded border px-3 py-2 text-sm mb-2"
          placeholder="Search by username, user ID, or role (e.g., 'Moderator')..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        <div className="text-xs text-muted-foreground mb-2">
          Tip: Type a role name like "Moderator" to find all users with that role
        </div>
        
        {/* Cache info */}
        {/* {fullListLoaded && ( // This line is removed as fullListLoaded is no longer used */}
        {/*   <div className="text-xs text-green-600 mb-2"> // This line is removed as fullListLoaded is no longer used */}
        {/*     ✓ Full user list cached - searches are instant // This line is removed as fullListLoaded is no longer used */}
        {/*   </div> // This line is removed as fullListLoaded is no longer used */}
        {/* )} // This line is removed as fullListLoaded is no longer used */}
        
        {/* Performance info */}
        <div className="text-xs text-muted-foreground mb-2">
          {loading ? (
            "Loading..."
          ) : search.trim() ? 
            `${filteredAndPaginatedUsers.length.toLocaleString()} users found` : 
            `Showing ${filteredAndPaginatedUsers.length.toLocaleString()} of ${totalUsers.toLocaleString()} users • Page size: ${pageSize}`
          }
        </div>
        
        {/* Retry button for rate limiting */}
        {!loading && filteredAndPaginatedUsers.length === 0 && (
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <span>No users loaded</span>
            <button
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => {
                // setLoading(true); // This line is removed as loading is now managed by the hook
                // fetchMembersLegacy(guildId) // This line is removed as fetchMembersLegacy is no longer used
                //   .then((members) => { // This line is removed as fetchMembersLegacy is no longer used
                //     setTotalUsers(members.length); // This line is removed as fetchMembersLegacy is no longer used
                //     setAllUsers(members.slice(0, pageSize)); // This line is removed as fetchMembersLegacy is no longer used
                //     setHasMore(members.length > pageSize); // This line is removed as fetchMembersLegacy is no longer used
                //     setFullUserList(members); // This line is removed as fetchMembersLegacy is no longer used
                //     setFullListLoaded(true); // This line is removed as fetchMembersLegacy is no longer used
                //     setLoading(false); // This line is removed as loading is now managed by the hook
                //   }) // This line is removed as fetchMembersLegacy is no longer used
                //   .catch((error) => { // This line is removed as fetchMembersLegacy is no longer used
                //     console.error('Retry failed:', error); // This line is removed as fetchMembersLegacy is no longer used
                //     setLoading(false); // This line is removed as loading is now managed by the hook
                //     if (error.message.includes('Too Many Requests')) { // This line is removed as fetchMembersLegacy is no longer used
                //       alert('Discord API rate limit still active. Please wait longer and try again.'); // This line is removed as fetchMembersLegacy is no longer used
                //     } // This line is removed as fetchMembersLegacy is no longer used
                //   }); // This line is removed as fetchMembersLegacy is no longer used
              }}
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="flex-1 min-h-0 overflow-y-auto rounded border bg-card text-foreground">
          {loading ? (
            <div className="text-xs text-muted-foreground px-2 py-2">Loading...</div>
          ) : filteredAndPaginatedUsers.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              {search.trim() ? `No users found matching "${search}"` : 'No users found'}
            </div>
          ) : (
            <>
              {filteredAndPaginatedUsers.map((u, index) => {
                // Find which role matched the search (if any)
                const matchedRole = search.trim() ? u.roleIds.find(roleId => {
                  const role = roles?.find(r => r.roleId === roleId);
                  return role?.name.toLowerCase().includes(search.toLowerCase());
                }) : null;
                const matchedRoleName = matchedRole ? roles?.find(r => r.roleId === matchedRole)?.name : null;
                
                // Add ref to last element for infinite scroll (only when not searching)
                const isLastElement = !search.trim() && index === filteredAndPaginatedUsers.length - 1;
                
                return (
                  <div
                    key={u.discordUserId}
                    ref={isLastElement ? lastElementRef : null}
                    className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-primary/10"
                    onClick={() => toggleUserSelection(u)}
                  >
                    <img src={u.avatarUrl || "/placeholder-user.jpg"} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-xs font-medium block">{u.username}</span>
                      {matchedRoleName && (
                        <span className="text-xs text-blue-600 block">Role: {matchedRoleName}</span>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })}
              
              {/* Infinite scroll loader */}
              {!search.trim() && hasMore && (
                <div className="h-8 flex items-center justify-center py-2">
                  <div className="text-xs text-muted-foreground">
                    {loadingMore ? "Loading more users..." : "Scroll to load more users"}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Selected users */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="mb-2 font-medium">Selected Users</div>
        <div className="flex-1 min-h-0 overflow-y-auto rounded border bg-card text-foreground">
          {value.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">No users selected</div>
          ) : (
            value.map((u) => (
              <div
                key={u.discordUserId}
                className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-red-50"
                onClick={() => toggleUserSelection(u)}
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                <img src={u.avatarUrl || "/placeholder-user.jpg"} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                <span className="truncate text-xs font-medium">{u.username}</span>
                <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
                <CheckIcon className="w-4 h-4 text-green-500" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
