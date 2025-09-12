import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes default stale time
      cacheTime: 5 * 60 * 1000, // 5 minutes cache time
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true, // Refetch on component mount
      retry: 1, // Retry failed requests once
      retryDelay: 1000, // 1 second delay between retries
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Permission queries
  permissions: (guildId: string) => ['permissions', guildId] as const,
  
  // Features queries
  features: (guildId: string) => ['features', guildId] as const,
  
  // Members queries
  members: (guildId: string, params?: any) => ['members', guildId, params] as const,
  membersKanban: (guildId: string) => ['members-kanban', guildId] as const,
  
  // Guilds queries
  guilds: () => ['guilds'] as const,
  guild: (guildId: string) => ['guild', guildId] as const,
  
  // Roles queries
  roles: (guildId: string) => ['roles', guildId] as const,
  
  // Admin queries
  adminStats: () => ['admin-stats'] as const,
  adminGuilds: () => ['admin-guilds'] as const,
  adminHealth: () => ['admin-health'] as const,
  
  // User activity queries
  userActivity: (guildId: string) => ['user-activity', guildId] as const,
} as const;
