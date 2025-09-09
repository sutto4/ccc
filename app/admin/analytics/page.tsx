'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, AlertTriangle, Clock, Users, Globe, Eye, Shield, Hash, Crown, Settings, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

interface APIStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  rateLimitRate: number;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  requestsByHour: Record<string, number>;
  lastUpdated: string;
}

interface RecentRequest {
  id: string;
  endpoint: string;
  method: string;
  userId?: string;
  userName?: string;
  discordId?: string;
  userAgent?: string;
  ip?: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  error?: string;
  rateLimited?: boolean;
  environment?: string;
  instanceId?: string;
  requestBodySize?: number;
  responseBodySize?: number;
  guildId?: string;
  guildName?: string;
  userRole?: string;
  permissionLevel?: string;
  actionContext?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetChannelId?: string;
  targetChannelName?: string;
}

interface TopEndpoint {
  endpoint: string;
  count: number;
}

interface TopUser {
  userId: string;
  count: number;
}

// Context Details Component
function RequestContextDetails({ request }: { request: RecentRequest }) {
  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'member': return <User className="h-4 w-4 text-green-500" />;
      default: return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPermissionColor = (level?: string) => {
    switch (level) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'public': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Guild Context */}
      {request.guildId && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Guild Context
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Guild ID:</span>
              <span className="text-sm font-mono">{request.guildId}</span>
            </div>
            {request.guildName && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Guild Name:</span>
                <span className="text-sm">{request.guildName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Context */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
          <User className="h-4 w-4" />
          User Context
        </h4>
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">User Role:</span>
            <div className="flex items-center gap-2">
              {getRoleIcon(request.userRole)}
              <span className="text-sm capitalize">{request.userRole || 'Unknown'}</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Permission Level:</span>
            <Badge className={getPermissionColor(request.permissionLevel)}>
              {request.permissionLevel || 'Unknown'}
            </Badge>
          </div>
          {request.discordId && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Discord ID:</span>
              <span className="text-sm font-mono">{request.discordId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Context */}
      {request.actionContext && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Action Context
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Action:</span>
              <span className="text-sm capitalize">{request.actionContext.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Target Context */}
      {(request.targetUserId || request.targetChannelId) && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Target Context
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
            {request.targetUserId && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Target User:</span>
                <div className="text-right">
                  <div className="text-sm font-mono">{request.targetUserId}</div>
                  {request.targetUserName && (
                    <div className="text-xs text-gray-500">{request.targetUserName}</div>
                  )}
                </div>
              </div>
            )}
            {request.targetChannelId && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Target Channel:</span>
                <div className="text-right">
                  <div className="text-sm font-mono">{request.targetChannelId}</div>
                  {request.targetChannelName && (
                    <div className="text-xs text-gray-500">{request.targetChannelName}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Technical Details */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Technical Details
        </h4>
        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Environment:</span>
            <Badge variant={request.environment === 'production' ? 'default' : 'secondary'}>
              {request.environment || 'Unknown'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Instance ID:</span>
            <span className="text-sm font-mono text-xs">{request.instanceId || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">IP Address:</span>
            <span className="text-sm font-mono">{request.ip || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  return (
    <AuthErrorBoundary>
      <AdminAnalyticsContent undefined />
    </AuthErrorBoundary>
  );
}

function AdminAnalyticsContent() {
  
  const [stats, setStats] = useState<APIStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [hourlyStats, setHourlyStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RecentRequest | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics');
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setStats(data.stats);
      setRecentRequests(data.recentRequests);
      setTopEndpoints(data.topEndpoints);
      setTopUsers(data.topUsers);
      setHourlyStats(data.hourlyStats);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanupData = async () => {
    try {
      const response = await fetch('/api/admin/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' })
      });

      if (response.ok) {
        await fetchAnalytics(); // Refresh data
      }
    } catch (error) {
      console.error('Error cleaning up data:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load analytics</h2>
        <Button onClick={fetchAnalytics}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Analytics</h1>
          <p className="text-muted-foreground">
            Last updated: {lastRefresh?.toLocaleString() || 'Never'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={cleanupData} variant="outline">
            Cleanup Data
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(stats.totalRequests).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Number(stats.successRate).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {Number(stats.successfulRequests).toLocaleString()} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {Number(stats.errorRate).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {Number(stats.failedRequests).toLocaleString()} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(stats.averageResponseTime).toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Endpoints and Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topEndpoints.map((endpoint, index) => (
                <div key={endpoint.endpoint} className="flex justify-between items-center">
                  <span className="text-sm font-mono">{endpoint.endpoint}</span>
                  <Badge variant="secondary">{endpoint.count.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topUsers.map((user, index) => (
                <div key={user.userId} className="flex justify-between items-center">
                  <span className="text-sm font-mono">{user.userId}</span>
                  <Badge variant="secondary">{user.count.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Method</th>
                  <th className="text-left p-2">Endpoint</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Guild</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Time (ms)</th>
                  <th className="text-left p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-gray-50 cursor-pointer">
                    <td className="p-2 text-muted-foreground">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-2">
                      <Badge variant={request.method === 'GET' ? 'default' : 'secondary'}>
                        {request.method}
                      </Badge>
                    </td>
                    <td className="p-2 font-mono text-xs">{request.endpoint}</td>
                    <td className="p-2 font-mono text-xs">
                      <div className="space-y-1">
                        <div>{request.userName || request.userId || 'Anonymous'}</div>
                        {request.discordId && (
                          <div className="text-xs text-muted-foreground">
                            Discord: {request.discordId}
                          </div>
                        )}
                        {request.userRole && (
                          <div className="text-xs text-blue-600 capitalize">
                            {request.userRole}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 font-mono text-xs">
                      {request.guildName ? (
                        <div className="space-y-1">
                          <div className="text-xs">{request.guildName}</div>
                          <div className="text-xs text-muted-foreground">{request.guildId}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      {request.actionContext ? (
                        <Badge variant="outline" className="text-xs">
                          {request.actionContext.replace(/_/g, ' ')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge 
                        variant={request.environment === 'production' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {request.environment || 'prod'}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge 
                        variant={
                          request.statusCode >= 200 && request.statusCode < 300 
                            ? 'default' 
                            : request.statusCode === 429 
                            ? 'destructive' 
                            : 'secondary'
                        }
                      >
                        {request.statusCode}
                      </Badge>
                    </td>
                    <td className="p-2">{request.responseTime}ms</td>
                    <td className="p-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Request Details</DialogTitle>
                          </DialogHeader>
                          <RequestContextDetails request={request} />
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Stats Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Requests by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(hourlyStats)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([hour, count]) => (
                <div key={hour} className="flex items-center gap-2">
                  <span className="text-sm w-20">{hour}:00</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(count / Math.max(...Object.values(hourlyStats))) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm w-16 text-right">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

}
