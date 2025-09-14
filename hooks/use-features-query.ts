"use client";

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { fetchFeatures, type FeaturesResponse } from '@/lib/api';

export function useFeaturesQuery(guildId: string) {
  return useQuery({
    queryKey: queryKeys.features(guildId),
    queryFn: () => fetchFeatures(guildId),
    staleTime: 10 * 60 * 1000, // 10 minutes - features rarely change
    cacheTime: 30 * 60 * 1000, // 30 minutes cache
    enabled: !!guildId,
    retry: 1,
    retryDelay: 1000,
  });
}

// Hook for sidebar usage with backward compatibility
export function useSidebarFeatures(guildId: string) {
  const { data, isLoading, error, isError } = useFeaturesQuery(guildId);

  return {
    features: data?.features || {},
    loading: isLoading,
    error: isError ? (error as Error)?.message || 'Failed to fetch features' : null,
  };
}

