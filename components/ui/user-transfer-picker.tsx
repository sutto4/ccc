"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { fetchMembersLegacy, type Member, type Role } from "@/lib/api";
import { CheckIcon, ChevronRight, ChevronLeft } from "lucide-react";

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
  const [allUsers, setAllUsers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Pagination and infinite scroll state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // Start with 100 users per page
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Infinite scroll refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  // Debounce search for better performance
  const debouncedSearch = useDebounce(search, 300);

  // Load initial data
  useEffect(() => {
    setLoading(true);
    fetchMembersLegacy(guildId)
      .then((members) => {
        setTotalUsers(members.length);
        setAllUsers(members.slice(0, pageSize)); // Only load first page initially
        setHasMore(members.length > pageSize);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load members:', error);
        setLoading(false);
      });
  }, [guildId, pageSize]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          // Prevent multiple rapid triggers
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
  }, [loading, hasMore, loadingMore]);

  // Load more users when page changes
  useEffect(() => {
    if (page === 1) return; // Skip initial load

    // Prevent duplicate API calls
    if (loadingMore) return;

    setLoadingMore(true);
    console.log(`UserTransferPicker: Fetching page ${page}, pageSize: ${pageSize}`);
    
    fetchMembersLegacy(guildId).then(members => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const newMembers = members.slice(startIndex, endIndex);
      
      console.log(`UserTransferPicker: Page ${page}: loaded ${newMembers.length} users (${startIndex}-${endIndex} of ${members.length})`);
      
      setAllUsers(prev => [...prev, ...newMembers]);
      setHasMore(endIndex < members.length);
      setLoadingMore(false);
    }).catch(error => {
      console.error('Failed to load more members:', error);
      setLoadingMore(false);
      // Reset page on error to prevent stuck state
      setPage(prev => Math.max(1, prev - 1));
    });
  }, [page, guildId, pageSize]);

  // Cleanup observer when loading state changes
  useEffect(() => {
    if (loadingMore && observerRef.current) {
      // Disconnect observer while loading to prevent multiple triggers
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, [loadingMore]);

  // Enhanced search function that searches by username, user ID, and role names
  const searchUsers = useCallback((users: Member[], searchTerm: string) => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    
    return users.filter(user => {
      // Search by username
      if (user.username.toLowerCase().includes(term)) return true;
      
      // Search by user ID
      if (user.discordUserId.toLowerCase().includes(term)) return true;
      
      // Search by role names - check if any of the user's roles contain the search term
      if (user.roleIds.some(roleId => {
        const role = roles?.find(r => r.roleId === roleId);
        return role?.name.toLowerCase().includes(term);
      })) return true;
      
      return false;
    });
  }, [roles]);

  // Memoized filtered available users for better performance
  const available = useMemo(() => {
    return searchUsers(
      allUsers.filter(u => !value.some(sel => sel.discordUserId === u.discordUserId)),
      debouncedSearch
    );
  }, [allUsers, value, debouncedSearch, searchUsers]);

  // Reset pagination when search changes
  useEffect(() => {
    if (debouncedSearch !== search) {
      setPage(1);
      setAllUsers([]);
      setHasMore(true);
      // Reload with search filter
      fetchMembersLegacy(guildId).then(members => {
        const filtered = searchUsers(members, debouncedSearch);
        setTotalUsers(filtered.length);
        setAllUsers(filtered.slice(0, pageSize));
        setHasMore(filtered.length > pageSize);
      });
    }
  }, [debouncedSearch, search, guildId, pageSize, searchUsers]);

  return (
    <div className="flex gap-4 w-full flex-1 min-h-0">
      {/* Available users */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="mb-2 font-medium flex items-center justify-between">
          <span>Available Users</span>
          <div className="flex items-center gap-2">
            {search.trim() && (
              <span className="text-xs text-muted-foreground">
                {available.length} found
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
                setAllUsers([]);
                setHasMore(true);
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
        
        {/* Performance info */}
        <div className="text-xs text-muted-foreground mb-2">
          Showing {allUsers.length.toLocaleString()} of {totalUsers.toLocaleString()} users • Page size: {pageSize}
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto rounded border bg-card text-foreground">
          {loading ? (
            <div className="text-xs text-muted-foreground px-2 py-2">Loading...</div>
          ) : available.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              {search.trim() ? `No users found matching "${search}"` : 'No users found'}
            </div>
          ) : (
            <>
              {available.map((u, index) => {
                // Find which role matched the search (if any)
                const matchedRole = search.trim() ? u.roleIds.find(roleId => {
                  const role = roles?.find(r => r.roleId === roleId);
                  return role?.name.toLowerCase().includes(search.toLowerCase());
                }) : null;
                const matchedRoleName = matchedRole ? roles?.find(r => r.roleId === matchedRole)?.name : null;
                
                // Add ref to last element for infinite scroll
                const isLastElement = index === available.length - 1;
                
                return (
                  <div
                    key={u.discordUserId}
                    ref={isLastElement ? lastElementRef : null}
                    className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-primary/10"
                    onClick={() => onChange([...value, u])}
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
              {hasMore && (
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
                onClick={() => onChange(value.filter((sel) => sel.discordUserId !== u.discordUserId))}
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
