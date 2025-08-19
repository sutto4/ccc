import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { fetchMembersLegacy, fetchRoles, type Role } from "@/lib/api";

export type Member = {
  guildId: string;
  discordUserId: string;
  username: string;
  avatarUrl?: string | null;
  roleIds: string[];
  accountid?: string | null;
  groups?: string[];
  joinedAt?: string | null;
};

export type Row = Member & { rolesExpanded?: boolean };

const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

export function useGuildMembers(guildId: string) {
  const { data: session } = useSession();
  
  console.log('useGuildMembers hook called with:', { guildId, hasSession: !!session });
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [members, setMembers] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filtering
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  
  // Track if we've already loaded members to prevent unnecessary re-fetches
  const hasLoadedMembers = useRef(false);
  const lastLoadParams = useRef<{
    search: string;
    roleFilter: string;
    pageSize: number;
    page: number;
  }>({ search: "", roleFilter: "", pageSize: 100, page: 1 });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Load roles once
  useEffect(() => {
    console.log('Roles loading effect triggered:', { guildId, hasSession: !!session });
    
    if (!guildId || !session) return;
    
    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        const token = (session as any)?.accessToken as string;
        if (!token) return;
        
        console.log('Loading roles with token:', !!token);
        const rolesData = await fetchRoles(guildId, token);
        console.log('Roles loaded:', rolesData?.length || 0);
        setRoles(rolesData);
      } catch (err: any) {
        console.error('Failed to load roles:', err);
        setError('Failed to load roles');
      } finally {
        setLoadingRoles(false);
      }
    };
    
    loadRoles();
  }, [guildId, session]);

  // Load members with search and pagination
  const loadMembers = useCallback(async (resetPage = false) => {
    if (!guildId || !session) return;
    
    console.log('loadMembers called with:', { resetPage, hasLoadedMembers: hasLoadedMembers.current });
    
    try {
      setLoading(true);
      setError(null);
      
      const token = (session as any)?.accessToken as string;
      if (!token) return;
      
      // Calculate offset
      const currentPage = resetPage ? 1 : page;
      const offset = (currentPage - 1) * pageSize;
      
      // Load members with search
      const membersData = await fetchMembersLegacy(guildId, token);
      
      console.log('API returned members:', membersData?.length || 0, 'members');
      
      // Single loop: transform, filter, and count in one pass
      const searchTerm = debouncedSearch.trim().toLowerCase();
      const hasSearch = searchTerm.length > 0;
      
      const allFilteredMembers: Member[] = [];
      
      console.log('Starting to process', membersData?.length || 0, 'members');
      console.log('Search term:', searchTerm, 'hasSearch:', hasSearch);
      console.log('Role filter:', roleFilter);
      
      for (const mem of membersData) {
        // Transform member data (only what's needed)
        const member: Member = {
          ...mem,
          avatarUrl: mem.avatarUrl || null,
          accountid: mem.accountid || null,
          joinedAt: (mem as any).joinedAt || null
        };
        
        // Apply search filter
        let shouldInclude = true;
        if (hasSearch) {
          const usernameMatch = member.username.toLowerCase().includes(searchTerm);
          const idMatch = member.discordUserId.toLowerCase().includes(searchTerm);
          shouldInclude = usernameMatch || idMatch;
        }
        
        // Apply role filter
        if (shouldInclude && roleFilter) {
          shouldInclude = member.roleIds.includes(roleFilter);
        }
        
        if (shouldInclude) {
          allFilteredMembers.push(member);
        }
      }
      
      console.log('After filtering,', allFilteredMembers.length, 'members remain');
      
      // Update total count
      setTotalMembers(allFilteredMembers.length);
      
      console.log('Filtered members:', allFilteredMembers.length, 'total, showing page with offset:', offset);
      
      // Apply pagination
      const startIndex = offset;
      const endIndex = Math.min(startIndex + pageSize, allFilteredMembers.length);
      const pageMembers = allFilteredMembers.slice(startIndex, endIndex);
      
      console.log('Page members:', pageMembers.length, 'members');
      
      setMembers(pageMembers);
      setHasMore(endIndex < allFilteredMembers.length);
      
      if (resetPage) {
        setPage(1);
      }
      
    } catch (err: any) {
      console.error('Failed to load members:', err);
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [guildId, session, debouncedSearch, roleFilter, pageSize, page]);

  // Initial load of members (only once when roles are ready)
  useEffect(() => {
    console.log('Initial load effect triggered:', { guildId, hasSession: !!session, rolesLength: roles.length, hasLoadedMembers: hasLoadedMembers.current });
    
    if (guildId && session && roles.length > 0 && !hasLoadedMembers.current) {
      console.log('Triggering initial load of members');
      hasLoadedMembers.current = true;
      loadMembers(true);
    }
    
    // Reset the ref when guild changes
    return () => {
      hasLoadedMembers.current = false;
      lastLoadParams.current = { search: "", roleFilter: "", pageSize: 100, page: 1 };
    };
  }, [guildId, session, roles.length, loadMembers]);

  // Load members when search/filter dependencies change
  useEffect(() => {
    if (guildId && session && roles.length > 0 && hasLoadedMembers.current) {
      // Only reload if we actually have meaningful changes
      const hasSearchChange = debouncedSearch !== lastLoadParams.current.search;
      const hasRoleFilterChange = roleFilter !== lastLoadParams.current.roleFilter;
      const hasPageSizeChange = pageSize !== lastLoadParams.current.pageSize;
      
      if (hasSearchChange || hasRoleFilterChange || hasPageSizeChange) {
        lastLoadParams.current = { search: debouncedSearch, roleFilter, pageSize, page };
        loadMembers(true);
      }
    }
  }, [debouncedSearch, roleFilter, pageSize, loadMembers]);

  // Load more members (next page)
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
  }, [hasMore, loading]);

  // Load next page
  useEffect(() => {
    if (page > 1 && hasLoadedMembers.current) {
      loadMembers(false);
    }
  }, [page, loadMembers]);

  // Role map for efficient lookups
  const roleMap = useMemo(() => new Map(roles.map(r => [r.roleId, r])), [roles]);

  // Memoized filtered members for better performance
  const filteredMembers = useMemo(() => {
    if (!debouncedSearch) return members;
    
    const searchLower = debouncedSearch.toLowerCase();
    return members.filter(m => 
      m.username.toLowerCase().includes(searchLower) ||
      (m.accountid && m.accountid.toLowerCase().includes(searchLower))
    );
  }, [members, debouncedSearch]);

  // Map roleId to members (only for selected roles)
  const roleMapMembers: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    // For kanban, we need to check if roleFilter is set or if we want all roles
    const rolesToCheck = roleFilter ? [roleFilter] : roles.map(r => r.roleId);
    rolesToCheck.forEach((roleId) => {
      map[roleId] = members.filter((m) => m.roleIds.includes(roleId));
    });
    return map;
  }, [members, roleFilter, roles]);

  // Users with no roles
  const noRole = useMemo(() => {
    return members.filter((m) => m.roleIds.length === 0);
  }, [members]);

  // Users not in role (for add user modal)
  const usersNotInRole = useCallback((roleId: string) => {
    return members.filter((m) => !m.roleIds.includes(roleId));
  }, [members]);

  return {
    // State
    loading,
    loadingRoles,
    members,
    roles,
    error,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    debouncedSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    hasMore,
    totalMembers,
    
    // Actions
    loadMembers,
    loadMore,
    
    // Computed values
    roleMap,
    filteredMembers,
    roleMapMembers,
    noRole,
    usersNotInRole,
    
    // Constants
    DEFAULT_AVATAR
  };
}

// Specialized hook for Kanban that loads all members without pagination
export function useGuildMembersKanban(guildId: string) {
  const { data: session } = useSession();
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [members, setMembers] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filtering
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Track if we've already loaded members to prevent unnecessary re-fetches
  const hasLoadedMembers = useRef(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Load roles once
  useEffect(() => {
    if (!guildId || !session) return;
    
    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        const token = (session as any)?.accessToken as string;
        if (!token) return;
        
        const rolesData = await fetchRoles(guildId, token);
        setRoles(rolesData);
      } catch (err: any) {
        console.error('Failed to load roles:', err);
        setError('Failed to load roles');
      } finally {
        setLoadingRoles(false);
      }
    };
    
    loadRoles();
  }, [guildId, session]);

  // Load all members (no pagination for Kanban)
  const loadMembers = useCallback(async () => {
    if (!guildId || !session) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = (session as any)?.accessToken as string;
      if (!token) return;
      
      // Load all members
      const membersData = await fetchMembersLegacy(guildId, token);
      
      console.log('Kanban API returned members:', membersData?.length || 0, 'members');
      
      // Transform member data
      const transformedMembers: Member[] = membersData.map(mem => ({
        ...mem,
        avatarUrl: mem.avatarUrl || null,
        accountid: mem.accountid || null,
        joinedAt: (mem as any).joinedAt || null
      }));
      
      setMembers(transformedMembers);
      
    } catch (err: any) {
      console.error('Failed to load members:', err);
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [guildId, session]);

  // Initial load of members (only once when roles are ready)
  useEffect(() => {
    if (guildId && session && roles.length > 0 && !hasLoadedMembers.current) {
      hasLoadedMembers.current = true;
      loadMembers();
    }
    
    // Reset the ref when guild changes
    return () => {
      hasLoadedMembers.current = false;
    };
  }, [guildId, session, roles.length, loadMembers]);

  // Role map for efficient lookups
  const roleMap = useMemo(() => new Map(roles.map(r => [r.roleId, r])), [roles]);

  // Memoized filtered members for better performance
  const filteredMembers = useMemo(() => {
    if (!debouncedSearch) return members;
    
    const searchLower = debouncedSearch.toLowerCase();
    return members.filter(m => 
      m.username.toLowerCase().includes(searchLower) ||
      (m.accountid && m.accountid.toLowerCase().includes(searchLower))
    );
  }, [members, debouncedSearch]);

  // Map roleId to members (for selected roles)
  const roleMapMembers: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    roles.forEach((role) => {
      map[role.roleId] = members.filter((m) => m.roleIds.includes(role.roleId));
    });
    return map;
  }, [members, roles]);

  // Users with no roles
  const noRole = useMemo(() => {
    return members.filter((m) => m.roleIds.length === 0);
  }, [members]);

  // Users not in role (for add user modal)
  const usersNotInRole = useCallback((roleId: string) => {
    return members.filter((m) => !m.roleIds.includes(roleId));
  }, [members]);

  return {
    // State
    loading,
    loadingRoles,
    members,
    roles,
    error,
    search,
    setSearch,
    debouncedSearch,
    
    // Actions
    loadMembers,
    
    // Computed values
    roleMap,
    filteredMembers,
    roleMapMembers,
    noRole,
    usersNotInRole,
    
    // Constants
    DEFAULT_AVATAR
  };
}
