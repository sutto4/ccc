"use client";

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { fetchMembersLegacy, fetchRoles, type Role, type Member } from '@/lib/api';

export type MemberRow = Member & { rolesExpanded?: boolean };

interface MembersResponse {
  members: MemberRow[];
  totalCount: number;
  hasMore: boolean;
}

interface MembersParams {
  search?: string;
  roleFilter?: string;
  page?: number;
  pageSize?: number;
}

async function fetchMembersWithParams(guildId: string, params: MembersParams = {}): Promise<MembersResponse> {
  const { search = '', roleFilter = '', page = 1, pageSize = 100 } = params;
  
  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;
  
  // Build query parameters for the /members endpoint
  const queryParams = new URLSearchParams();
  queryParams.set('limit', pageSize.toString());
  if (offset > 0) queryParams.set('after', offset.toString());
  if (search) queryParams.set('q', search);
  if (roleFilter) queryParams.set('role', roleFilter);
  
  const response = await fetch(`/api/guilds/${guildId}/members?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch members: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    members: data.members.map((member: Member) => ({ ...member, rolesExpanded: false })),
    totalCount: data.page.total || data.members.length,
    hasMore: data.page.nextAfter !== null,
  };
}

export function useMembersQuery(guildId: string, params: MembersParams = {}) {
  return useQuery<MembersResponse>({
    queryKey: queryKeys.members(guildId, params),
    queryFn: () => fetchMembersWithParams(guildId, params),
    staleTime: 2 * 60 * 1000, // 2 minutes - longer cache for better performance
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useRolesQuery(guildId: string) {
  return useQuery<Role[]>({
    queryKey: queryKeys.roles(guildId),
    queryFn: () => fetchRoles(guildId),
    staleTime: 5 * 60 * 1000, // 5 minutes - roles change less frequently
    cacheTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}

// Hook for kanban-style member management
export function useMembersKanbanQuery(guildId: string) {
  return useQuery<Member[]>({
    queryKey: queryKeys.membersKanban(guildId),
    queryFn: async () => {
      const response = await fetch(`/api/guilds/${guildId}/members?limit=1000`);
      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.statusText}`);
      }
      const data = await response.json();
      return data.members;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes cache
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}
