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
  Info
} from "lucide-react";

interface Guild {
  id: string;
  name: string;
  icon_url?: string;
  member_count: number;
  premium: boolean;
  status: string;
  joined_at: string;
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

interface ActivityItem {
  id: string;
  type: "server_joined" | "server_left" | "premium_upgrade" | "command_used" | "error";
  message: string;
  timestamp: string;
  severity: "info" | "warning" | "error";
}

export default function AdminDashboard() {
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
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
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
        const newServers24h = guildsData.filter((g: Guild) => {
          const joinedAt = new Date(g.joined_at);
          return (now.getTime() - joinedAt.getTime()) <= 24 * 60 * 60 * 1000;
        }).length;
        
        const newServers48h = guildsData.filter((g: Guild) => {
          const joinedAt = new Date(g.joined_at);
          return (now.getTime() - joinedAt.getTime()) <= 48 * 60 * 60 * 1000;
        }).length;

        setStats({
          totalServers: guildsData.length,
          totalUsers: guildsData.reduce((sum: number, g: Guild) => sum + (g.member_count || 0), 0),
          newServers24h,
          newServers48h,
          activeServers: guildsData.filter((g: Guild) => g.status === 'active').length,
          premiumServers: guildsData.filter((g: Guild) => g.premium).length,
          totalCommands: 0, // Will be fetched separately
          totalEmbeds: 0, // Will be fetched separately
          conversionRate: guildsData.length > 0 ? ((guildsData.filter((g: Guild) => g.premium).length / guildsData.length) * 100).toFixed(1) : "0",
          averageUsersPerServer: guildsData.length > 0 ? Math.round(guildsData.reduce((sum: number, g: Guild) => sum + (g.member_count || 0), 0) / guildsData.length) : 0
        });
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(prev => ({ ...prev, ...statsData }));
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      // Generate mock activity feed (replace with real data later)
      generateActivityFeed();

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const generateActivityFeed = () => {
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'server_joined',
        message: 'New server "Gaming Community" joined',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        severity: 'info'
      },
      {
        id: '2',
        type: 'premium_upgrade',
        message: 'Server "Tech Hub" upgraded to Premium',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        severity: 'info'
      },
      {
        id: '3',
        type: 'command_used',
        message: 'High command usage detected on "Music Bot Server"',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        severity: 'warning'
      },
      {
        id: '4',
        type: 'server_left',
        message: 'Server "Test Server" removed the bot',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        severity: 'warning'
      }
    ];
    setActivityFeed(mockActivities);
  };

  const getFilteredGuilds = () => {
    const now = new Date();
    const cutoff48h = now.getTime() - (48 * 60 * 60 * 1000);
    
    switch (filter) {
      case "new":
        return guilds.filter(g => new Date(g.joined_at).getTime() > cutoff48h);
      case "existing":
        return guilds.filter(g => new Date(g.joined_at).getTime() <= cutoff48h);
      default:
        return guilds;
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "server_joined":
        return <Server className="w-4 h-4 text-green-500" />;
      case "server_left":
        return <Server className="w-4 h-4 text-red-500" />;
      case "premium_upgrade":
        return <Shield className="w-4 h-4 text-purple-500" />;
      case "command_used":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your bot's performance and manage servers</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Servers</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalServers)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <TrendingUp className="w-4 h-4 mr-1" />
              +{stats.newServers24h} in 24h
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

        {/* Health Status and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Status */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`flex items-center p-4 rounded-lg border ${getHealthColor(health.bot)}`}>
                {getHealthIcon(health.bot)}
                <div className="ml-3">
                  <p className="font-medium">Bot Status</p>
                  <p className="text-sm capitalize">{health.bot}</p>
                </div>
              </div>
              <div className={`flex items-center p-4 rounded-lg border ${getHealthColor(health.database)}`}>
                {getHealthIcon(health.database)}
                <div className="ml-3">
                  <p className="font-medium">Database</p>
                  <p className="text-sm capitalize">{health.database}</p>
                </div>
              </div>
              <div className={`flex items-center p-4 rounded-lg border ${getHealthColor(health.api)}`}>
                {getHealthIcon(health.api)}
                <div className="ml-3">
                  <p className="text-sm text-gray-500">Last checked: {formatDate(health.lastCheck)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {activityFeed.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCommands}</div>
              <div className="text-sm text-gray-600">Custom Commands</div>
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
                  New ({stats.newServers48h})
                </button>
                <button
                  onClick={() => setFilter("existing")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === "existing" 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Existing ({guilds.length - stats.newServers48h})
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
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
                          : guild.status === 'left'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {guild.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(guild.joined_at)}
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
                        <button className="text-blue-600 hover:text-blue-900" title="Server Settings">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900" title="View Commands">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="text-purple-600 hover:text-purple-900" title="Server Dashboard">
                          <ExternalLink className="w-4 h-4" />
                        </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Bot className="w-5 h-5 text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Bot Status</p>
                <p className="text-sm text-gray-500">Check bot health</p>
              </div>
            </button>
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Database className="w-5 h-5 text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Database</p>
                <p className="text-sm text-gray-500">View stats</p>
              </div>
            </button>
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Globe className="w-5 h-5 text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">API Status</p>
                <p className="text-sm text-gray-500">Monitor endpoints</p>
              </div>
            </button>
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <BarChart3 className="w-5 h-5 text-yellow-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Analytics</p>
                <p className="text-sm text-gray-500">View detailed metrics</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}