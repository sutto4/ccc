"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export interface ServerGroup {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  premiumTier: 'free' | 'premium' | 'enterprise';
  serverCount: number;
  serverLimit: number;
  roleSyncEnabled: boolean;
  banSyncEnabled: boolean;
  automodRulesCount: number;
  createdAt: string;
  updatedAt: string;
  servers: {
    id: string;
    name: string;
    memberCount: number;
    isOnline: boolean;
  }[];
}

export interface ServerGroupLimits {
  userPlan: string;
  serverGroupLimit: number;
  serverLimitPerGroup: number;
  canCreateGroups: boolean;
  currentGroupCount: number;
}

export function useServerGroups() {
  const queryClient = useQueryClient();

  // Fetch all server groups
  const { data, isLoading } = useQuery<{ groups: ServerGroup[]; limits: ServerGroupLimits }>({
    queryKey: ['serverGroups'],
    queryFn: async () => {
      const response = await fetch('/api/server-groups');
      if (!response.ok) {
        throw new Error('Failed to fetch server groups');
      }
      const data = await response.json();
      return data;
    },
  });

  const groups = data?.groups || [];
  const limits = data?.limits || {
    userPlan: 'free',
    serverGroupLimit: 0,
    serverLimitPerGroup: 0,
    canCreateGroups: false,
    currentGroupCount: 0
  };

  // Create a new server group
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; iconUrl?: string }) => {
      const response = await fetch('/api/server-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create server group');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverGroups'] });
    },
  });

  // Update a server group
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string; iconUrl?: string } }) => {
      const response = await fetch(`/api/server-groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update server group');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverGroups'] });
    },
  });

  // Delete a server group
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/server-groups/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete server group');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverGroups'] });
    },
  });

  return {
    groups,
    limits,
    isLoading,
    createGroup: createGroupMutation.mutateAsync,
    updateGroup: updateGroupMutation.mutateAsync,
    deleteGroup: deleteGroupMutation.mutateAsync,
    isCreating: createGroupMutation.isPending,
    isUpdating: updateGroupMutation.isPending,
    isDeleting: deleteGroupMutation.isPending,
  };
}

export function useServerGroup(groupId: string) {
  const queryClient = useQueryClient();

  // Fetch a single server group
  const { data: group, isLoading } = useQuery<ServerGroup>({
    queryKey: ['serverGroup', groupId],
    queryFn: async () => {
      console.log('[useServerGroup] Fetching group:', groupId);
      const response = await fetch(`/api/server-groups/${groupId}`);
      if (!response.ok) {
        console.error('[useServerGroup] Response not ok:', response.status, response.statusText);
        throw new Error('Failed to fetch server group');
      }
      const data = await response.json();
      console.log('[useServerGroup] API response:', data);
      console.log('[useServerGroup] Servers data:', data.servers);
      if (data.servers) {
        data.servers.forEach((server: any, index: number) => {
          console.log(`[useServerGroup] Raw server ${index}:`, {
            guild_id: server.guild_id,
            guild_name: server.guild_name,
            is_primary: server.is_primary,
            is_primary_type: typeof server.is_primary,
            is_primary_strict: server.is_primary === 1,
            is_primary_loose: server.is_primary == 1
          });
        });
      }
      
      // Transform the response to match the interface
      return {
        id: data.group.id.toString(),
        name: data.group.name,
        description: data.group.description,
        iconUrl: data.group.icon_url,
        premiumTier: data.group.user_plan === 'free' ? 'free' : 'premium' as const,
        serverCount: data.servers?.length || 0,
        serverLimit: data.group.server_limit || 0,
        roleSyncEnabled: false,
        banSyncEnabled: false,
        automodRulesCount: 0,
        createdAt: data.group.created_at,
        updatedAt: data.group.updated_at,
        servers: data.servers?.map((server: any) => ({
          id: server.guild_id,
          name: server.guild_name,
          memberCount: server.member_count || 0,
          isOnline: server.is_online || false,
          isPrimary: server.is_primary === 1 || server.is_primary === true,
          iconUrl: server.icon_url,
        })) || []
      };
    },
    enabled: !!groupId && groupId !== '',
  });

  // Fetch available servers that can be added to this group
  const { data: availableServers, isLoading: isLoadingAvailableServers } = useQuery({
    queryKey: ['availableServers', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/server-groups/${groupId}/available-servers`);
      if (!response.ok) {
        throw new Error('Failed to fetch available servers');
      }
      return response.json();
    },
    enabled: !!groupId && groupId !== '',
  });

  // Add server to group
  const addServerMutation = useMutation({
    mutationFn: async (guildId: string) => {
      const response = await fetch(`/api/server-groups/${groupId}/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add server to group');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverGroup', groupId] });
      queryClient.invalidateQueries({ queryKey: ['availableServers', groupId] });
      queryClient.invalidateQueries({ queryKey: ['serverGroups'] });
    },
  });

  // Remove server from group
  const removeServerMutation = useMutation({
    mutationFn: async (guildId: string) => {
      const response = await fetch(`/api/server-groups/${groupId}/servers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove server from group');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverGroup', groupId] });
      queryClient.invalidateQueries({ queryKey: ['availableServers', groupId] });
      queryClient.invalidateQueries({ queryKey: ['serverGroups'] });
    },
  });

  return {
    group,
    isLoading,
    availableServers: availableServers?.servers || [],
    isLoadingAvailableServers,
    addServer: addServerMutation.mutateAsync,
    removeServer: removeServerMutation.mutateAsync,
    isAddingServer: addServerMutation.isPending,
    isRemovingServer: removeServerMutation.isPending,
    queryClient,
  };
}
