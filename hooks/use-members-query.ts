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
  
  const members = await fetchMembersLegacy(guildId, {
    search,
    roleFilter,
    page,
    pageSize,
  });

  return {
    members: members.map(member => ({ ...member, rolesExpanded: false })),
    totalCount: members.length,
    hasMore: members.length === pageSize,
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
    queryFn: () => fetchMembersLegacy(guildId),
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes cache
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}
