"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Server, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Globe,
  Shield,
  Zap,
  BarChart3,
  Bot
} from "lucide-react";
import Link from "next/link";
import dynamic from 'next/dynamic';

// Dynamically import the bot activity panel
const BotActivityPanel = dynamic(() => import('@/components/admin/bot-activity-panel'), {
  ssr: false,
  loading: () => (
    <div className="p-4">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
});

interface SystemStats {
  totalServers: number;
  totalUsers: number;
  activeServers: number;
  premiumServers: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  uptime: string;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/overview-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Manage Features",
      description: "Configure platform features and settings",
      href: "/admin/platform/features",
      icon: Zap,
      color: "bg-blue-500"
    },
    {
      title: "View Analytics", 
      description: "Monitor usage and performance metrics",
      href: "/admin/platform/analytics",
      icon: BarChart3,
      color: "bg-green-500"
    },
    {
      title: "Guild Management",
      description: "Manage all Discord servers",
      href: "/admin/guilds",
      icon: Server,
      color: "bg-purple-500"
    },
    {
      title: "System Monitoring",
      description: "Check system health and alerts",
      href: "/admin/platform/monitoring", 
      icon: Activity,
      color: "bg-orange-500"
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading system overview...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">System Overview</h1>
          <p className="text-muted-foreground">
            Monitor your ServerMate platform at a glance
          </p>
        </div>
        
        <button
          onClick={fetchSystemStats}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">System Health</h3>
            {stats?.systemHealth === 'healthy' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            )}
          </div>
          <div className="text-2xl font-bold">
            {stats?.systemHealth === 'healthy' ? 'Healthy' : 'Warning'}
          </div>
          <p className="text-sm text-muted-foreground">
            Uptime: {stats?.uptime || 'N/A'}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Total Servers</h3>
            <Server className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">
            {stats?.totalServers.toLocaleString() || 0}
          </div>
          <p className="text-sm text-muted-foreground">
            {stats?.activeServers || 0} active
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Total Users</h3>
            <Users className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold">
            {stats?.totalUsers.toLocaleString() || 0}
          </div>
          <p className="text-sm text-muted-foreground">
            Across all servers
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Premium Servers</h3>
            <Shield className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold">
            {stats?.premiumServers || 0}
          </div>
          <p className="text-sm text-muted-foreground">
            {stats?.totalServers > 0 
              ? `${((stats.premiumServers / stats.totalServers) * 100).toFixed(1)}%`
              : '0%'
            } of total
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="block p-6 bg-card rounded-lg border hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Bot Activity Settings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Bot Settings</h2>
        <BotActivityPanel />
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-card rounded-lg border p-6">
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Activity feed coming soon</p>
            <p className="text-sm">This will show recent system events and changes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
