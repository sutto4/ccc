"use client";

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { type Guild } from '@/lib/api';

async function fetchGuilds(): Promise<Guild[]> {
  const response = await fetch('/api/guilds');
  
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
    staleTime: 5 * 60 * 1000, // 5 minutes - guilds rarely change
    cacheTime: 15 * 60 * 1000, // 15 minutes cache
    retry: 1,
    retryDelay: 1000,
  });
}

export function useGuildQuery(guildId: string) {
  return useQuery<Guild | null>({
    queryKey: queryKeys.guild(guildId),
    queryFn: () => fetchGuild(guildId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes cache
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}
