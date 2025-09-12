"use client";

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { queryKeys } from '@/lib/query-client';

interface PermissionCheck {
  canUseApp: boolean;
  isOwner: boolean;
  hasRoleAccess: boolean;
  loading: boolean;
  error: string | null;
}

interface PermissionCheckResponse {
  canUseApp: boolean;
  isOwner: boolean;
  hasRoleAccess: boolean;
}

async function checkPermissions(guildId: string, userId: string, userRoles: string[]): Promise<PermissionCheckResponse> {
  const response = await fetch(`/api/guilds/${guildId}/role-permissions/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      userRoles
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Permission check failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export function usePermissionsQuery(guildId: string) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: queryKeys.permissions(guildId),
    queryFn: () => checkPermissions(
      guildId, 
      (session?.user as any)?.discordId || session?.user?.id || '', 
      (session?.user as any)?.roles || []
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes - balance security vs performance
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!guildId && !!session?.user?.id,
    retry: 1,
    retryDelay: 1000,
  });
}

// Backward compatibility hook that matches the old usePermissions interface
export function usePermissions(guildId: string): PermissionCheck {
  const { data, isLoading, error, isError } = usePermissionsQuery(guildId);

  return {
    canUseApp: data?.canUseApp ?? false,
    isOwner: data?.isOwner ?? false,
    hasRoleAccess: data?.hasRoleAccess ?? false,
    loading: isLoading,
    error: isError ? (error as Error)?.message || 'Permission check failed' : null,
  };
}
