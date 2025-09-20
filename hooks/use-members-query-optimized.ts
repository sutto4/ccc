"use client";

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { type Role, type Member } from '@/lib/api';

export type MemberRow = Member & { rolesExpanded?: boolean };

interface MembersResponse {
  members: MemberRow[];
  totalCount: number;
  hasMore: boolean;
  roles?: Role[];
  membersCount?: number;
}

interface MembersParams {
  search?: string;
  roleFilter?: string;
  page?: number;
  pageSize?: number;
}

async function fetchMembersOptimized(guildId: string, params: MembersParams = {}): Promise<MembersResponse> {
  const { search = '', roleFilter = '', page = 1, pageSize = 100 } = params;
  
  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;
  
  // Build query parameters for the optimized /members endpoint
  const queryParams = new URLSearchParams();
  queryParams.set('limit', pageSize.toString());
  if (offset > 0) queryParams.set('after', offset.toString());
  if (search) queryParams.set('q', search);
  if (roleFilter) queryParams.set('role', roleFilter);
  
  // Try optimized endpoint first, fallback to original
  let response = await fetch(`/api/guilds/${guildId}/members-optimized?${queryParams.toString()}`);

  if (!response.ok) {
    console.warn('[PERF] Optimized members endpoint failed, trying original...');
    response = await fetch(`/api/guilds/${guildId}/members?${queryParams.toString()}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch members: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    members: data.members.map((member: Member) => ({ ...member, rolesExpanded: false })),
    totalCount: data.page?.total || data.members.length,
    hasMore: data.page?.nextAfter !== null,
    roles: data.roles,
    membersCount: data.membersCount
  };
}

async function fetchRolesOptimized(guildId: string): Promise<Role[]> {
  // Try optimized endpoint first, fallback to original
  let response = await fetch(`/api/guilds/${guildId}/roles-optimized`);

  if (!response.ok) {
    console.warn('[PERF] Optimized roles endpoint failed, trying original...');
    response = await fetch(`/api/guilds/${guildId}/roles`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch roles: ${response.statusText}`);
  }
  
  return response.json();
}

export function useMembersQueryOptimized(guildId: string, params: MembersParams = {}) {
  return useQuery<MembersResponse>({
    queryKey: queryKeys.members(guildId, params),
    queryFn: () => fetchMembersOptimized(guildId, params),
    staleTime: 2 * 60 * 1000, // 2 minutes - longer cache for better performance
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useRolesQueryOptimized(guildId: string) {
  return useQuery<Role[]>({
    queryKey: queryKeys.roles(guildId),
    queryFn: () => fetchRolesOptimized(guildId),
    staleTime: 5 * 60 * 1000, // 5 minutes - roles change less frequently
    cacheTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}

// Combined hook that fetches both members and roles in one call
export function useMembersWithRolesOptimized(guildId: string, params: MembersParams = {}) {
  const membersQuery = useMembersQueryOptimized(guildId, params);
  
  // If members query includes roles, use them; otherwise fetch roles separately
  const rolesQuery = useRolesQueryOptimized(guildId);
  
  const roles = membersQuery.data?.roles || rolesQuery.data || [];
  
  return {
    ...membersQuery,
    roles,
    rolesLoading: membersQuery.data?.roles ? false : rolesQuery.isLoading,
    rolesError: membersQuery.data?.roles ? null : rolesQuery.error
  };
}

