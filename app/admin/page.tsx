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
  UserPlus
} from "lucide-react";
import PremiumModal from "@/components/premium-modal";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

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
  averageUsersPerServer: number;
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
  
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
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
  });
  const [health, setHealth] = useState<HealthStatus>({
    bot: "healthy",
    database: "healthy",
    api: "healthy",
    overall: "healthy",
    lastCheck: new Date().toISOString(),
    checks: {
      database: { status: "healthy", message: "Database connection successful" },
      bot: { status: "healthy", message: "Bot is running" },
      api: { status: "healthy", message: "API responding normally" }
    }
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "existing">("all");
  const [error, setError] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);

  // User activity state
  const [userActivityStats, setUserActivityStats] = useState({
    totalLogins: 0,
    firstTimeLogins: 0,
    returningLogins: 0,
    recentLogins24h: 0,
    uniqueUsers: 0
  });
  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    // Remove automatic refresh to prevent connection issues
    // const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    // return () => clearInterval(interval);
  }, []);


  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [guildsRes, statsRes, healthRes] = await Promise.all([
        fetch('/api/admin/guilds'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/health')
      ]);

      if (guildsRes.ok) {
        const guildsData = await guildsRes.json();
        setGuilds(guildsData);
        
        // Calculate stats from guilds data
        const now = new Date();
        const cutoff48h = now.getTime() - (48 * 60 * 60 * 1000);
        
        const newServers48h = guildsData.filter((g: Guild) => {
          const createdAt = new Date(g.created_at);
          return createdAt.getTime() > cutoff48h;
        }).length;

        setStats({
          totalServers: guildsData.length,
          totalUsers: 0, // Will be set from stats API
          newServers24h: newServers48h, // Keep name for stats but use 48h value
          newServers48h,
          activeServers: guildsData.filter((g: Guild) => g.status === 'active').length,
          premiumServers: guildsData.filter((g: Guild) => g.premium).length,
          totalCommands: 0, // Will be fetched separately
          totalEmbeds: 0, // Will be fetched separately
          conversionRate: guildsData.length > 0 ? ((guildsData.filter((g: Guild) => g.premium).length / guildsData.length) * 100).toFixed(1) : "0",
          averageUsersPerServer: 0 // Will be calculated from API stats
        });
      } else {
        const errorData = await guildsRes.json().catch(() => ({}));
        console.error('Guilds API error:', errorData);
        setError(`Failed to load servers: ${errorData.error || 'Unknown error'}`);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('Stats data received:', statsData);
        setStats(prev => ({ 
          ...prev, 
          ...statsData,
          // Ensure totalUsers comes from the API, not calculated from guilds
          totalUsers: statsData.totalUsers || 0,
          // Calculate average users per server from API data
          averageUsersPerServer: statsData.totalUsers && statsData.totalServers ? 
            Math.round(statsData.totalUsers / statsData.totalServers) : 0
        }));
      } else {
        const errorData = await statsRes.json().catch(() => ({}));
        console.error('Stats API error:', errorData);
        setError(`Failed to load stats: ${errorData.error || 'Unknown error'}`);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      } else {
        const errorData = await healthRes.json().catch(() => ({}));
        console.error('Health API error:', errorData);
        setError(`Failed to load health status: ${errorData.error || 'Unknown error'}`);
      }

      // Fetch user activity data
      try {
        const userActivityRes = await fetch('/api/admin/user-logins?limit=50');
        if (userActivityRes.ok) {
          const userActivityData = await userActivityRes.json();
          setUserActivityStats(userActivityData.stats || {
            totalLogins: 0,
            firstTimeLogins: 0,
            returningLogins: 0,
            recentLogins24h: 0,
            uniqueUsers: 0
          });
          setLoginHistory(userActivityData.loginHistory || []);
        } else {
          const errorText = await userActivityRes.text().catch(() => 'Unknown error');
          console.error('User activity API error:', errorText);
          // Set default values if API fails
          setUserActivityStats({
            totalLogins: 0,
            firstTimeLogins: 0,
            returningLogins: 0,
            recentLogins24h: 0,
            uniqueUsers: 0
          });
          setLoginHistory([]);
        }
      } catch (userActivityError) {
        console.error('Failed to fetch user activity:', userActivityError);
        // Set default values if fetch fails
        setUserActivityStats({
          totalLogins: 0,
          firstTimeLogins: 0,
          returningLogins: 0,
          recentLogins24h: 0,
          uniqueUsers: 0
        });
        setLoginHistory([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  const getFilteredGuilds = () => {
    const now = new Date();
    const cutoff48h = now.getTime() - (48 * 60 * 60 * 1000); // Use 48 hours consistently
    
    switch (filter) {
      case "new":
        return guilds.filter(g => {
          const createdAt = new Date(g.created_at);
          return createdAt.getTime() > cutoff48h;
        });
      case "existing":
        return guilds.filter(g => {
          const createdAt = new Date(g.created_at);
          return createdAt.getTime() <= cutoff48h;
        });
      default:
        return guilds;
    }
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
              onClick={fetchDashboardData}
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
                    setTimeout(fetchDashboardData, 1000);
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
                try {
                  // Use same logic as health check
                  const botUrl = process.env.SERVER_API_BASE_URL || process.env.BOT_API_URL || 'http://127.0.0.1:3001';
                  console.log('🔄 Triggering manual sync with bot at:', botUrl);

                  // First test basic connectivity
                  console.log('🔍 Testing basic health endpoint...');
                  const healthResponse = await fetch(`${botUrl}/api/health`);
                  console.log('🏥 Health check response:', healthResponse.status);

                  if (!healthResponse.ok) {
                    throw new Error(`Health check failed: ${healthResponse.status}`);
                  }

                  // Now try the sync endpoint
                  console.log('🔄 Calling sync endpoint...');
                  const response = await fetch(`${botUrl}/api/sync-member-counts`, {
                    method: 'POST',
                  });

                  if (response.ok) {
                    console.log('✅ Manual sync completed');
                    alert('✅ Guild status sync completed! Check the guild status now.');
                  } else {
                    console.error('❌ Manual sync failed:', response.status);
                    alert(`❌ Manual sync failed: ${response.status}`);
                  }
                } catch (error) {
                  console.error('❌ Manual sync error:', error);
                  alert(`❌ Manual sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                    onClick={fetchDashboardData}
                    className="text-sm text-red-800 hover:text-red-900 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Server</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
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
                                    fetchDashboardData(); // Refresh the dashboard
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
                                    fetchDashboardData(); // Refresh the dashboard
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
                    setTimeout(fetchDashboardData, 1000);
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
                      fetchDashboardData(); // Refresh the dashboard
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
                      fetchDashboardData(); // Refresh the dashboard
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
                        fetchDashboardData(); // Refresh the dashboard
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