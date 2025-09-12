"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Server, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings, 
  MessageSquare, 
  Shield, 
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Bot,
  Database,
  Zap,
  Globe,
  BarChart3,
  Target,
  AlertCircle,
  Info,
  UserPlus,
  Heart,
  Monitor,
  Cpu,
  HardDrive
} from "lucide-react";
import PremiumModal from "@/components/premium-modal";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';
import { useAdminGuildsQuery, useAdminStatsQuery, useAdminHealthQuery, useUserActivityQuery } from "@/hooks/use-admin-query";
import { useSession } from "next-auth/react";

interface Guild {
  id: string;
  name: string;
  icon_url?: string;
  member_count: number;
  premium: boolean;
  status: string;
  created_at: string;
  features: string[];
}

interface DashboardStats {
  totalServers: number;
  totalUsers: number;
  newServers24h: number;
  newServers48h: number;
  activeServers: number;
  premiumServers: number;
  totalCommands: number;
  totalEmbeds: number;
  conversionRate: string;
}

interface ApiHealthStatus {
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

interface HealthStatus {
  bot: "healthy" | "warning" | "error";
  database: "healthy" | "warning" | "error";
  api: "healthy" | "warning" | "error";
  overall: "healthy" | "warning" | "error";
  lastCheck: string;
  checks: {
    database: { status: string; message: string };
    bot: { status: string; message: string };
    api: { status: string; message: string };
  };
}

export default function AdminDashboard() {
  return (
    <AuthErrorBoundary>
      <AdminDashboardContent />
    </AuthErrorBoundary>
  );
}

function AdminDashboardContent() {
  const { data: session, status: sessionStatus } = useSession();
  
  // Use React Query hooks for data fetching
  const [filter, setFilter] = useState<"all" | "new" | "existing">("all");
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [sortField, setSortField] = useState<"name" | "member_count" | "status" | "created_at">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);
  
  // React Query hooks - only enable when user is authenticated
  const guildsQuery = useAdminGuildsQuery();
  const statsQuery = useAdminStatsQuery();
  const healthQuery = useAdminHealthQuery();
  const userActivityQuery = useUserActivityQuery();

  // Show loading while session is loading
  if (sessionStatus === "loading") {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (sessionStatus === "unauthenticated" || !session?.user) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You must be logged in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }
  
  const guilds = guildsQuery.data || [];
  const stats = statsQuery.data || {
    totalServers: 0,
    totalUsers: 0,
    newServers24h: 0,
    newServers48h: 0,
    activeServers: 0,
    premiumServers: 0,
    totalCommands: 0,
    totalEmbeds: 0,
    conversionRate: "0",
    averageUsersPerServer: 0
  };
  const apiHealth = healthQuery.data;
  const loading = guildsQuery.isLoading || statsQuery.isLoading || userActivityQuery.isLoading;
  const error = guildsQuery.error || statsQuery.error || userActivityQuery.error;

  // Debug logging
  console.log('[ADMIN] Session info:', {
    sessionStatus,
    user: session?.user,
    userEmail: session?.user?.email,
    userRole: (session?.user as any)?.role
  });

  console.log('[ADMIN] Query states:', {
    guildsLoading: guildsQuery.isLoading,
    guildsError: guildsQuery.error,
    guildsData: guildsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.error,
    statsData: statsQuery.data,
    userActivityLoading: userActivityQuery.isLoading,
    userActivityError: userActivityQuery.error,
    userActivityData: userActivityQuery.data
  });

  // Check if queries are actually running
  console.log('[ADMIN] Query status:', {
    guildsStatus: guildsQuery.status,
    statsStatus: statsQuery.status,
    userActivityStatus: userActivityQuery.status,
    healthStatus: healthQuery.status
  });
  
  // Legacy health object for compatibility
  const health: HealthStatus = {
    bot: "healthy",
    database: apiHealth?.database?.healthy ? "healthy" : "error",
    api: apiHealth?.status === 'healthy' ? "healthy" : "error",
    overall: apiHealth?.status === 'healthy' ? "healthy" : "error",
    lastCheck: apiHealth?.timestamp || new Date().toISOString(),
    checks: {
      database: { 
        status: apiHealth?.database?.healthy ? "healthy" : "error", 
        message: apiHealth?.database?.healthy ? "Database connection successful" : "Database connection failed" 
      },
      bot: { status: "healthy", message: "Bot is running" },
      api: { 
        status: apiHealth?.status === 'healthy' ? "healthy" : "error", 
        message: apiHealth?.status === 'healthy' ? "API responding normally" : "API responding with errors" 
      }
    }
  };

  // User activity data from React Query
  const userActivityStats = userActivityQuery.data?.stats || {
    totalLogins: 0,
    firstTimeLogins: 0,
    returningLogins: 0,
    recentLogins24h: 0,
    uniqueUsers: 0
  };
  const loginHistory = userActivityQuery.data?.loginHistory || [];

  // Data fetching is now handled by React Query hooks above


  // Old fetch functions removed - now using React Query hooks

  const getFilteredGuilds = () => {
    const now = new Date();
    const cutoff48h = now.getTime() - (48 * 60 * 60 * 1000); // Use 48 hours consistently
    
    let filteredGuilds;
    switch (filter) {
      case "new":
        filteredGuilds = guilds.filter(g => {
          const createdAt = new Date(g.created_at);
          return createdAt.getTime() > cutoff48h;
        });
        break;
      case "existing":
        filteredGuilds = guilds.filter(g => {
          const createdAt = new Date(g.created_at);
          return createdAt.getTime() <= cutoff48h;
        });
        break;
      default:
        filteredGuilds = guilds;
    }

    // Apply sorting
    return filteredGuilds.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "member_count":
          aValue = a.member_count || 0;
          bValue = b.member_count || 0;
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Calculate actual counts for the filter buttons
  const getActualFilterCounts = () => {
    const now = new Date();
    const cutoff48h = now.getTime() - (48 * 60 * 60 * 1000);
    
    // Debug: Log the first few guilds to see their data structure
    console.log('Sample guilds data:', guilds.slice(0, 3).map(g => ({
      id: g.id,
      name: g.name,
      created_at: g.created_at,
      created_at_type: typeof g.created_at,
      parsed_date: new Date(g.created_at),
      is_valid_date: !isNaN(new Date(g.created_at).getTime())
    })));
    
    const newCount = guilds.filter(g => {
      const createdAt = new Date(g.created_at);
      const isValidDate = !isNaN(createdAt.getTime());
      if (!isValidDate) {
        console.warn('Invalid date for guild:', g.id, g.created_at);
        return false; // Skip invalid dates
      }
      return createdAt.getTime() > cutoff48h;
    }).length;
    
    const existingCount = guilds.filter(g => {
      const createdAt = new Date(g.created_at);
      const isValidDate = !isNaN(createdAt.getTime());
      if (!isValidDate) {
        return false; // Skip invalid dates
      }
      return createdAt.getTime() <= cutoff48h;
    }).length;
    
    // Debug logging
    console.log('Filter counts:', { 
      total: guilds.length, 
      new: newCount, 
      existing: existingCount,
      cutoff48h: new Date(cutoff48h).toISOString(),
      now: now.toISOString()
    });
    
    return { newCount, existingCount };
  };

  const { newCount, existingCount } = getActualFilterCounts();

  // Notification system
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg border-l-4 ${
          notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
          'bg-blue-50 border-blue-400 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 mr-2" />}
              {notification.type === 'info' && <Info className="w-5 h-5 mr-2" />}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Health Status */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your bot's performance and manage servers</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Compact Health Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${getHealthColor(health.overall)}`}>
              {getHealthIcon(health.overall)}
              <span className="font-medium capitalize">{health.overall}</span>
            </div>
            <button
              onClick={() => {
                guildsQuery.refetch();
                statsQuery.refetch();
                healthQuery.refetch();
                userActivityQuery.refetch();
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/reset-db', { method: 'POST' });
                  if (response.ok) {
                    // Wait a moment then refresh data
                    setTimeout(() => {
                      guildsQuery.refetch();
                      statsQuery.refetch();
                      healthQuery.refetch();
                      userActivityQuery.refetch();
                    }, 1000);
                  }
                } catch (error) {
                  console.error('Failed to reset database:', error);
                }
              }}
              className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              title="Reset database connections if you're having connection issues"
            >
              <Database className="w-4 h-4" />
              Reset DB
            </button>
            <a
              href="https://discord.gg/nrSjZByddw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#5865F2] text-white px-4 py-2 rounded-lg hover:bg-[#4752C4] transition-colors"
              title="Join our Discord server for support and updates"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0786-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0786.0105c.1202.099.2462.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
              </svg>
              Discord
            </a>
            <button
              onClick={() => setTestModalOpen(true)}
              className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
              title="Test the premium modal functionality"
            >
              🧪 Test Modal
            </button>

            <button
              onClick={async () => {
                // Use NEXT_PUBLIC_BOT_API_URL environment variable or default to localhost
                const botUrl = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://127.0.0.1:3001';
                console.log('🔄 Triggering manual sync with bot at:', botUrl);
                
                try {

                  // First test basic connectivity
                  console.log('🔍 Testing basic health endpoint...');
                  const healthResponse = await fetch(`${botUrl}/api/health`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    // Add timeout for better error handling
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                  });
                  console.log('🏥 Health check response:', healthResponse.status);

                  if (!healthResponse.ok) {
                    throw new Error(`Health check failed: ${healthResponse.status} - Bot may not be running or accessible`);
                  }

                  // Now try the sync endpoint
                  console.log('🔄 Calling sync endpoint...');
                  const response = await fetch(`${botUrl}/api/sync-member-counts`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    // Add timeout for better error handling
                    signal: AbortSignal.timeout(30000) // 30 second timeout for sync operation
                  });

                  if (response.ok) {
                    console.log('✅ Manual sync completed');
                    
                    // Now run cleanup to mark left guilds as removed
                    console.log('🧹 Running cleanup for left guilds...');
                    const cleanupResponse = await fetch(`${botUrl}/api/cleanup-removed-guilds`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      signal: AbortSignal.timeout(30000)
                    });
                    
                    if (cleanupResponse.ok) {
                      console.log('✅ Cleanup completed');
                      // Refresh the dashboard data
                      await guildsQuery.refetch();
                      // Show success notification
                      showNotification('✅ Guild sync and cleanup completed! Server list has been refreshed.', 'success');
                    } else {
                      console.warn('⚠️ Sync completed but cleanup failed:', cleanupResponse.status);
                      await guildsQuery.refetch();
                      showNotification('✅ Guild sync completed, but cleanup failed. Some guilds may still show incorrect status.', 'warning');
                    }
                  } else {
                    console.error('❌ Manual sync failed:', response.status);
                    showNotification(`❌ Manual sync failed: ${response.status}`, 'error');
                  }
                } catch (error) {
                  console.error('❌ Manual sync error:', error);
                  
                  let errorMessage = 'Unknown error';
                  if (error instanceof Error) {
                    if (error.name === 'TimeoutError') {
                      errorMessage = 'Request timed out - Bot may be slow to respond or unreachable';
                    } else if (error.message.includes('Failed to fetch')) {
                      errorMessage = 'Cannot connect to bot - Check if bot is running and accessible';
                    } else {
                      errorMessage = error.message;
                    }
                  }
                  
                  showNotification(`❌ Manual sync error: ${errorMessage}`, 'error');
                }
              }}
              className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors font-semibold"
              title="Manually trigger guild status sync to update kicked servers"
            >
              🔄 Sync Status
            </button>
        </div>
      </div>

        {/* Error Display */}
          {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      guildsQuery.refetch();
                      statsQuery.refetch();
                      healthQuery.refetch();
                      userActivityQuery.refetch();
                    }}
                    className="text-sm text-red-800 hover:text-red-900 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Health Section */}
        {apiHealth && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-900">API Health Status</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  apiHealth.status === 'healthy' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {apiHealth.status}
                </div>
                <button
                  onClick={() => healthQuery.refetch()}
                  disabled={healthQuery.isFetching}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${healthQuery.isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Database Health */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">Database</span>
                </div>
                <div className={`text-sm ${apiHealth.database.healthy ? 'text-green-600' : 'text-red-600'}`}>
                  {apiHealth.database.healthy ? 'Healthy' : 'Unhealthy'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Response: {apiHealth.database.details.responseTime}
                </div>
                <div className="text-xs text-gray-500">
                  Pool: {apiHealth.database.details.poolStatus.totalConnections} connections
                </div>
              </div>

              {/* System Health */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-sm">System</span>
                </div>
                <div className="text-sm text-gray-600">
                  Uptime: {Math.floor(apiHealth.system.uptime / 3600)}h
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Memory: {Math.round(apiHealth.system.memory.heapUsed / 1024 / 1024)}MB
                </div>
                <div className="text-xs text-gray-500">
                  Node: {apiHealth.system.nodeVersion}
                </div>
              </div>

              {/* Analytics Health */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-sm">Analytics</span>
                </div>
                <div className="text-sm text-gray-600">
                  Status: {apiHealth.analytics.status}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Batch: {apiHealth.analytics.batchSize}/{apiHealth.analytics.maxBatchSize}
                </div>
                <div className="text-xs text-gray-500">
                  Processing: {apiHealth.analytics.isProcessing ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              Last updated: {new Date(apiHealth.timestamp).toLocaleString()} 
              (Response time: {apiHealth.responseTime})
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Servers</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.activeServers)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Database className="w-4 h-4 mr-1" />
              All Time: {formatNumber(stats.totalServers)} servers
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalUsers)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Activity className="w-4 h-4 mr-1" />
              ~{stats.averageUsersPerServer} per server
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Servers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.newServers48h}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              Last 48 hours
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Premium Servers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.premiumServers}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Target className="w-4 h-4 mr-1" />
              {stats.conversionRate}% conversion
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatNumber(stats.totalServers)}</div>
              <div className="text-sm text-gray-600">All Time Servers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalEmbeds}</div>
              <div className="text-sm text-gray-600">Embedded Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.activeServers}</div>
              <div className="text-sm text-gray-600">Active Servers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.conversionRate}%</div>
              <div className="text-sm text-gray-600">Premium Conversion</div>
            </div>
          </div>
        </div>

        {/* User Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{userActivityStats?.totalLogins || 0}</div>
              <div className="text-sm text-gray-600">Total Logins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userActivityStats?.firstTimeLogins || 0}</div>
              <div className="text-sm text-gray-600">New Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{userActivityStats?.returningLogins || 0}</div>
              <div className="text-sm text-gray-600">Returning Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{userActivityStats?.recentLogins24h || 0}</div>
              <div className="text-sm text-gray-600">Logins (24h)</div>
            </div>
          </div>

          {/* Recent Login Activity */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">Recent Login Activity</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loginHistory?.slice(0, 10).map((login: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      login.login_type === 'first_time'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {login.login_type === 'first_time' ? '🎉 New' : '👋 Back'}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{login.username || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{login.discord_id}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(login.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
              {(!loginHistory || loginHistory.length === 0) && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No login activity yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Server Management */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Server Management</h2>
              <div className="flex gap-2">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filter === "all" 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All ({guilds.length})
                  </button>
                  <button
                    onClick={() => setFilter("new")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filter === "new" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    New ({newCount})
                  </button>
                  <button
                    onClick={() => setFilter("existing")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filter === "existing" 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Existing ({existingCount})
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => {
                      if (sortField === "name") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("name");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Server
                      {sortField === "name" && (
                        <span className="text-blue-600">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => {
                      if (sortField === "member_count") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("member_count");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Members
                      {sortField === "member_count" && (
                        <span className="text-blue-600">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => {
                      if (sortField === "status") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("status");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === "status" && (
                        <span className="text-blue-600">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => {
                      if (sortField === "created_at") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("created_at");
                        setSortDirection("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {sortField === "created_at" && (
                        <span className="text-blue-600">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Features</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredGuilds().map((guild) => (
                  <tr key={guild.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {guild.icon_url ? (
                            <img 
                              className="h-10 w-10 rounded-full" 
                              src={guild.icon_url} 
                              alt={guild.name} 
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {guild.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{guild.name}</div>
                          <div className="text-sm text-gray-500">ID: {guild.id}</div>
                        </div>
                        {guild.premium && (
                          <div className="ml-2">
                            <Shield className="w-4 h-4 text-purple-500" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(guild.member_count || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        guild.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : guild.status === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : guild.status === 'left'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {guild.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(guild.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {guild.features?.slice(0, 3).map((feature, index) => (
                          <span 
                            key={index}
                            className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                        {guild.features && guild.features.length > 3 && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            +{guild.features.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <a 
                          href={`/admin/guilds/${guild.id}`}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Admin Settings - Manage guild features and overrides"
                        >
                          <Settings className="w-4 h-4" />
                        </a>
                        <a 
                          href={`/guilds/${guild.id}/settings`}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Guild Settings - Server configuration and preferences"
                        >
                          <Shield className="w-4 h-4" />
                        </a>
                        <a 
                          href={`/guilds/${guild.id}/custom-commands`}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="Custom Commands - Create and manage bot commands"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        {guild.premium && (
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to remove premium access from guild ${guild.id}?`)) {
                                try {
                                  const response = await fetch('/api/admin/cleanup-premium', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ guildId: guild.id })
                                  });
                                  if (response.ok) {
                                    const result = await response.json();
                                    alert(`Premium access cleaned up successfully!\n\nBefore: ${JSON.stringify(result.before, null, 2)}\nAfter: ${JSON.stringify(result.after, null, 2)}\nFeatures disabled: ${result.featuresDisabled}`);
                                    guildsQuery.refetch(); // Refresh the dashboard
                                  } else {
                                    const error = await response.json();
                                    alert(`Failed to cleanup premium access: ${error.error || 'Unknown error'}`);
                                  }
                                } catch (error) {
                                  console.error('Failed to cleanup premium access:', error);
                                  alert('Failed to cleanup premium access. Check console for details.');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Remove premium access from this guild"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        )}
                        {/* Status Fix Button - only show for 'inactive' status guilds */}
                        {guild.status === 'inactive' && (
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to reset the status of guild ${guild.id} from 'inactive' to 'active'? This will make it visible again.`)) {
                                try {
                                  const response = await fetch('/api/admin/guilds/fix-status', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      guildId: guild.id,
                                      action: 'reset-inactive-status'
                                    })
                                  });
                                  if (response.ok) {
                                    const result = await response.json();
                                    alert(`Guild status fixed successfully!\n\n${result.message}`);
                                    guildsQuery.refetch(); // Refresh the dashboard
                                  } else {
                                    const error = await response.json();
                                    alert(`Failed to fix guild status: ${error.error || 'Unknown error'}`);
                                  }
                                } catch (error) {
                                  console.error('Failed to fix guild status:', error);
                                  alert('Failed to fix guild status. Check console for details.');
                                }
                              }
                            }}
                            className="text-orange-600 hover:text-orange-900 transition-colors"
                            title="Reset guild status from 'inactive' to 'active'"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/api/admin/test-db"
              target="_blank"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Database className="w-5 h-5 text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Test Database</p>
                <p className="text-sm text-gray-500">Check DB connectivity</p>
              </div>
            </a>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/reset-db', { method: 'POST' });
                  if (response.ok) {
                    setTimeout(() => {
                      guildsQuery.refetch();
                      statsQuery.refetch();
                      healthQuery.refetch();
                      userActivityQuery.refetch();
                    }, 1000);
                  }
                } catch (error) {
                  console.error('Failed to reset database:', error);
                }
              }}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-5 h-5 text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Reset DB Pool</p>
                <p className="text-sm text-gray-500">Clear connections</p>
              </div>
            </button>
            <button
              onClick={async () => {
                const guildId = prompt('Enter Guild ID to cleanup premium access:');
                if (guildId && confirm(`Are you sure you want to remove premium access from guild ${guildId}?`)) {
                  try {
                    const response = await fetch('/api/admin/cleanup-premium', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ guildId })
                    });
                    if (response.ok) {
                      const result = await response.json();
                      alert(`Premium access cleaned up successfully!\n\nBefore: ${JSON.stringify(result.before, null, 2)}\nAfter: ${JSON.stringify(result.after, null, 2)}\nFeatures disabled: ${result.featuresDisabled}`);
                      guildsQuery.refetch(); // Refresh the dashboard
                    } else {
                      const error = await response.json();
                      alert(`Failed to cleanup premium access: ${error.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('Failed to cleanup premium access:', error);
                    alert('Failed to cleanup premium access. Check console for details.');
                  }
                }
              }}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Zap className="w-5 h-5 text-red-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Cleanup Premium</p>
                <p className="text-sm text-gray-500">Remove premium access</p>
              </div>
            </button>
            <button
              onClick={async () => {
                const guildId = prompt('Enter Guild ID to fix status (reset from "inactive" to "active"):');
                if (guildId && confirm(`Are you sure you want to reset the status of guild ${guildId} from 'inactive' to 'active'? This will make it visible again.`)) {
                  try {
                    const response = await fetch('/api/admin/guilds/fix-status', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        guildId,
                        action: 'reset-inactive-status'
                      })
                    });
                    if (response.ok) {
                      const result = await response.json();
                      alert(`Guild status fixed successfully!\n\n${result.message}`);
                      guildsQuery.refetch(); // Refresh the dashboard
                    } else {
                      const error = await response.json();
                      alert(`Failed to fix guild status: ${error.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('Failed to fix guild status:', error);
                    alert('Failed to fix guild status. Check console for details.');
                  }
                }
              }}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-5 h-5 text-orange-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Fix Guild Status</p>
                <p className="text-sm text-gray-500">Reset 'inactive' to 'active'</p>
              </div>
            </button>
            <button
              onClick={async () => {
                try {
                  // First check current status
                  const checkResponse = await fetch('/api/admin/guilds/check-status');
                  if (checkResponse.ok) {
                    const statusData = await checkResponse.json();
                    const message = `Current Guild Status Summary:\n\n` +
                      `Total Guilds: ${statusData.summary.totalGuilds}\n` +
                      `Active: ${statusData.summary.totalActive}\n` +
                      `Inactive: ${statusData.summary.totalInactive}\n\n` +
                      `Inactive Guilds:\n${statusData.inactiveGuilds.map((g: any) => `- ${g.guild_name || g.guild_id} (${g.guild_id})`).join('\n')}\n\n` +
                      `Would you like to fix all ${statusData.summary.totalInactive} guild(s) with 'inactive' status?`;
                    
                    if (confirm(message)) {
                      const fixResponse = await fetch('/api/admin/guilds/check-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'fix-all-inactive' })
                      });
                      
                      if (fixResponse.ok) {
                        const result = await fixResponse.json();
                        alert(`Bulk status fix completed!\n\n${result.message}`);
                        guildsQuery.refetch(); // Refresh the dashboard
                      } else {
                        const error = await fixResponse.json();
                        alert(`Failed to fix guild statuses: ${error.error || 'Unknown error'}`);
                      }
                    }
                  } else {
                    const error = await checkResponse.json();
                    alert(`Failed to check guild statuses: ${error.error || 'Unknown error'}`);
                  }
                } catch (error) {
                  console.error('Failed to check/fix guild statuses:', error);
                  alert('Failed to check/fix guild statuses. Check console for details.');
                }
              }}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Database className="w-5 h-5 text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Check & Fix All</p>
                <p className="text-sm text-gray-500">Bulk status fix</p>
              </div>
            </button>
            <button
              onClick={async () => {
                const userInput = prompt('Grant bot access to user\n\nEnter: GUILD_ID,USER_ID\n\nExample: 123456789012345678,876543210987654321');
                if (!userInput) return;

                const [guildId, userId] = userInput.split(',').map(s => s.trim());
                if (!guildId || !userId) {
                  alert('Invalid format. Use: GUILD_ID,USER_ID');
                  return;
                }

                try {
                  const response = await fetch('/api/admin/guilds/grant-access', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guildId, userId, notes: 'Manually granted by admin' })
                  });

                  if (response.ok) {
                    const result = await response.json();
                    alert(`Access granted successfully!\n\n${result.message}`);
                  } else {
                    const error = await response.json();
                    alert(`Failed to grant access: ${error.error || 'Unknown error'}`);
                  }
                } catch (error) {
                  console.error('Failed to grant access:', error);
                  alert('Failed to grant access. Check console for details.');
                }
              }}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <UserPlus className="w-5 h-5 text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Grant Bot Access</p>
                <p className="text-sm text-gray-500">Manually grant user access to bot management</p>
              </div>
            </button>


            <a
              href="https://discord.gg/nrSjZByddw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-[#5865F2] mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0786-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0786.0105c.1202.099.2462.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-900">Discord Support</p>
                <p className="text-sm text-gray-500">Get help & updates</p>
              </div>
            </a>
          </div>
        </div>
      </div>
      
      {/* Test Premium Modal */}
      <PremiumModal open={testModalOpen} onOpenChange={setTestModalOpen} />
    </div>
  );

}