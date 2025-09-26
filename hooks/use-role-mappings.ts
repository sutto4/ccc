import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface RoleMapping {
  id: string;
  groupId: string;
  primaryServerId: string;
  primaryRoleId: string;
  primaryRoleName: string;
  targetMappings: {
    id: string;
    serverId: string;
    serverName: string;
    roleId: string;
    roleName: string;
  }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ServerRole {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}

interface CreateRoleMappingData {
  primaryServerId: string;
  primaryRoleId: string;
  primaryRoleName: string;
  targetMappings: {
    serverId: string;
    serverName: string;
    roleId: string;
    roleName: string;
  }[];
}

export function useRoleMappings(groupId: string) {
  const queryClient = useQueryClient();

  // Fetch role mappings
  const {
    data: mappings = [],
    isLoading: mappingsLoading,
    error: mappingsError,
    refetch: refetchMappings
  } = useQuery({
    queryKey: ['role-mappings', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/server-groups/${groupId}/role-mappings`);
      if (!response.ok) {
        throw new Error('Failed to fetch role mappings');
      }
      const data = await response.json();
      return data.mappings as RoleMapping[];
    },
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });

  // Fetch server roles
  const {
    data: serverRoles = {},
    isLoading: rolesLoading,
    error: rolesError
  } = useQuery({
    queryKey: ['server-roles', groupId],
    queryFn: async () => {
      console.log('[useRoleMappings] Fetching server roles for groupId:', groupId);
      try {
        const response = await fetch(`/api/server-groups/${groupId}/server-roles`);
        if (!response.ok) {
          console.error('[useRoleMappings] Server roles fetch failed:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('[useRoleMappings] Error response:', errorText);
          throw new Error('Failed to fetch server roles');
        }
        const data = await response.json();
        console.log('[useRoleMappings] Server roles data:', data);
        console.log('[useRoleMappings] Server roles keys:', Object.keys(data.serverRoles || {}));
        console.log('[useRoleMappings] Server roles values:', Object.values(data.serverRoles || {}));
        return data.serverRoles as Record<string, ServerRole[]>;
      } catch (error) {
        console.error('[useRoleMappings] Error in queryFn:', error);
        throw error;
      }
    },
    staleTime: 300000, // 5 minutes
    cacheTime: 600000, // 10 minutes
    enabled: !!groupId
  });

  // Create role mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async (data: CreateRoleMappingData) => {
      const response = await fetch(`/api/server-groups/${groupId}/role-mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create role mapping');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch role mappings
      queryClient.invalidateQueries({ queryKey: ['role-mappings', groupId] });
    },
  });

  // Create a wrapper function that returns a promise
  const createMapping = useCallback(async (data: CreateRoleMappingData) => {
    return new Promise((resolve, reject) => {
      createMappingMutation.mutate(data, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(error)
      });
    });
  }, [createMappingMutation]);

  // Delete role mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      const response = await fetch(`/api/server-groups/${groupId}/role-mappings?mappingId=${mappingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete role mapping');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch role mappings
      queryClient.invalidateQueries({ queryKey: ['role-mappings', groupId] });
    },
  });

  // Create a wrapper function that returns a promise
  const deleteMapping = useCallback(async (mappingId: string) => {
    return new Promise((resolve, reject) => {
      deleteMappingMutation.mutate(mappingId, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(error)
      });
    });
  }, [deleteMappingMutation]);

  // Helper functions
  const getServerRoles = useCallback((serverId: string): ServerRole[] => {
    console.log('[useRoleMappings] getServerRoles called for serverId:', serverId);
    console.log('[useRoleMappings] Available serverRoles keys:', Object.keys(serverRoles));
    console.log('[useRoleMappings] serverRoles object:', serverRoles);
    const roles = serverRoles[serverId] || [];
    console.log('[useRoleMappings] getServerRoles for', serverId, ':', roles);
    return roles;
  }, [serverRoles]);

  const refreshServerRoles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['server-roles', groupId] });
  }, [queryClient, groupId]);

  console.log('[useRoleMappings] Returning hook data:', {
    mappings,
    serverRoles: Object.keys(serverRoles),
    mappingsLoading,
    rolesLoading,
    createMapping: typeof createMapping,
    deleteMapping: typeof deleteMapping,
    getServerRoles: typeof getServerRoles
  });

  return {
    mappings,
    serverRoles,
    mappingsLoading,
    rolesLoading,
    mappingsError,
    rolesError,
    createMapping,
    deleteMapping,
    getServerRoles,
    refreshServerRoles,
    refetchMappings
  };
}

