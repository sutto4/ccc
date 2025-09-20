"use client";

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { type Guild } from '@/lib/api';

async function fetchGuilds(): Promise<Guild[]> {
  // Try optimized endpoint first, fallback to original
  let response = await fetch('/api/guilds-optimized');
  
  if (!response.ok) {
    console.warn('[PERF] Optimized endpoint failed, trying original...');
    response = await fetch('/api/guilds');
  }
  
  if (!response.ok) {
    // Check if it's an authentication error
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.redirectTo === '/signin') {
        // Redirect to signin page
        window.location.href = '/signin';
        throw new Error('Authentication expired - redirecting to login');
      }
    }
    
    throw new Error(`Failed to fetch guilds: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.guilds || [];
}

async function fetchGuild(guildId: string): Promise<Guild | null> {
  const guilds = await fetchGuilds();
  return guilds.find(guild => guild.id === guildId) || null;
}

export function useGuildsQuery() {
  return useQuery<Guild[]>({
    queryKey: queryKeys.guilds(),
    queryFn: fetchGuilds,
    // Keep results fresh enough to avoid refetch-on-focus/mount storms
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    // Avoid automatic refetches that can pile up concurrent requests
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useGuildQuery(guildId: string) {
  return useQuery<Guild | null>({
    queryKey: queryKeys.guild(guildId),
    queryFn: () => fetchGuild(guildId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}
