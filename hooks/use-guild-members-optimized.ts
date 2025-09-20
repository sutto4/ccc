import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { type Role, type Member } from "@/lib/api";
import { useMembersWithRolesOptimized } from "./use-members-query-optimized";

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

export function useGuildMembersOptimized(guildId: string) {
  const { data: session } = useSession();
  
  // Search and filtering
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Use the optimized combined hook
  const membersQuery = useMembersWithRolesOptimized(guildId, { 
    search: debouncedSearch, 
    roleFilter, 
    page, 
    pageSize 
  });

  // Extract data from the query
  const loading = membersQuery.isLoading;
  const loadingRoles = membersQuery.rolesLoading;
  const members = (membersQuery.data?.members || []).map((mem: Member) => ({
    ...mem,
    avatarUrl: mem.avatarUrl || null,
    accountid: mem.accountid || null,
    joinedAt: (mem as any).joinedAt || null,
    rolesExpanded: false
  }));
  const roles = membersQuery.roles || [];
  const error = membersQuery.error || membersQuery.rolesError;
  const hasMore = membersQuery.data?.hasMore || false;
  const totalMembers = membersQuery.data?.totalCount || 0;

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  // Load members function (for compatibility)
  const loadMembers = useCallback((resetPage = false) => {
    if (resetPage) {
      setPage(1);
    }
    // The query will automatically refetch when dependencies change
  }, []);

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
export function useGuildMembersKanbanOptimized(guildId: string) {
  const { data: session } = useSession();
  
  // Search and filtering
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Use the optimized combined hook with large limit for kanban
  const membersQuery = useMembersWithRolesOptimized(guildId, { 
    search: debouncedSearch, 
    pageSize: 1000 // Load all members for kanban
  });

  // Extract data from the query
  const loading = membersQuery.isLoading;
  const loadingRoles = membersQuery.rolesLoading;
  const members = (membersQuery.data?.members || []).map((mem: Member) => ({
    ...mem,
    avatarUrl: mem.avatarUrl || null,
    accountid: mem.accountid || null,
    joinedAt: (mem as any).joinedAt || null,
    rolesExpanded: false
  }));
  const roles = membersQuery.roles || [];
  const error = membersQuery.error || membersQuery.rolesError;

  // Load members function
  const loadMembers = useCallback(() => {
    // The query will automatically refetch when dependencies change
  }, []);

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

