"use client";

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

interface AdminStats {
  totalServers: number;
  totalUsers: number;
  newServers24h: number;
  newServers48h: number;
  activeServers: number;
  premiumServers: number;
  totalCommands: number;
  totalEmbeds: number;
  conversionRate: string;
  averageUsersPerServer: number;
}

interface AdminGuild {
  id: string;
  name: string;
  icon_url?: string;
  member_count: number;
  premium: boolean;
  status: string;
  created_at: string;
  features: string[];
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  responseTime: string;
  database: {
    healthy: boolean;
    details: {
      responseTime: string;
      poolStatus: {
        status: string;
        totalConnections: number;
        message: string;
      };
      timestamp: string;
    };
  };
  analytics: {
    status: string;
    batchSize: number;
    isProcessing: boolean;
    maxBatchSize: number;
    flushInterval: number;
  };
  system: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    nodeVersion: string;
    platform: string;
  };
}

interface UserActivityStats {
  totalLogins: number;
  firstTimeLogins: number;
  returningLogins: number;
  recentLogins24h: number;
  uniqueUsers: number;
}

interface UserActivityResponse {
  stats: UserActivityStats;
  loginHistory: any[];
}

async function fetchAdminStats(): Promise<AdminStats> {
  console.log('[ADMIN-QUERY] Fetching admin stats...');
  const response = await fetch('/api/admin/stats');
  console.log('[ADMIN-QUERY] Admin stats response:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ADMIN-QUERY] Admin stats error:', errorText);
    throw new Error(`Failed to fetch admin stats: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  console.log('[ADMIN-QUERY] Admin stats data:', data);
  return data;
}

async function fetchAdminGuilds(): Promise<AdminGuild[]> {
  console.log('[ADMIN-QUERY] Fetching admin guilds...');
  const response = await fetch('/api/admin/guilds');
  console.log('[ADMIN-QUERY] Admin guilds response:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ADMIN-QUERY] Admin guilds error:', errorText);
    throw new Error(`Failed to fetch admin guilds: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  console.log('[ADMIN-QUERY] Admin guilds data:', data);
  return data || [];
}

async function fetchAdminHealth(): Promise<HealthStatus> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`Failed to fetch admin health: ${response.statusText}`);
  }
  return response.json();
}

async function fetchUserActivity(): Promise<UserActivityResponse> {
  const response = await fetch('/api/admin/user-logins?limit=50');
  if (!response.ok) {
    throw new Error(`Failed to fetch user activity: ${response.statusText}`);
  }
  return response.json();
}

export function useAdminStatsQuery() {
  return useQuery<AdminStats>({
    queryKey: queryKeys.adminStats(),
    queryFn: fetchAdminStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: true, // Always enabled for admin page
    retry: 1,
    retryDelay: 1000,
  });
}

export function useAdminGuildsQuery() {
  return useQuery<AdminGuild[]>({
    queryKey: queryKeys.adminGuilds(),
    queryFn: fetchAdminGuilds,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes cache
    enabled: true, // Always enabled for admin page
    retry: 1,
    retryDelay: 1000,
  });
}

export function useAdminHealthQuery() {
  return useQuery<HealthStatus>({
    queryKey: queryKeys.adminHealth(),
    queryFn: fetchAdminHealth,
    staleTime: 30 * 1000, // 30 seconds - health changes frequently
    cacheTime: 2 * 60 * 1000, // 2 minutes cache
    retry: 1,
    retryDelay: 1000,
  });
}

export function useUserActivityQuery() {
  return useQuery<UserActivityResponse>({
    queryKey: queryKeys.userActivity('admin'),
    queryFn: fetchUserActivity,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: true, // Always enabled for admin page
    retry: 1,
    retryDelay: 1000,
  });
}
