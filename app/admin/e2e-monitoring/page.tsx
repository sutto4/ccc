'use client';

import { useState, useEffect } from 'react';
import Section from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  Server,
  RefreshCw,
  Download,
  Bot,
  Zap,
  Command,
  MessageSquare
} from "lucide-react";
// Note: We use dynamic imports to avoid mysql2 bundling issues

interface SessionSummary {
  sessionId: string;
  userId: string;
  discordId: string;
  startTime: number;
  currentStep: string;
  totalSteps: number;
  totalErrors: number;
  duration: number;
  lastActivity: number;
}

interface BotActivity {
  command: string;
  userId: string;
  guildId: string;
  channelId: string;
  timestamp: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  args?: string[];
}

interface BotSummary {
  status: 'online' | 'offline' | 'degraded';
  uptime: string;
  activeGuilds: number;
  recentCommands: number;
  healthScore: number;
  lastActivity: number;
}

interface SystemStats {
  activeSessions: number;
  totalSessionsToday: number;
  averageSessionDuration: number;
  errorRate: number;
  topErrorTypes: Array<{ type: string; count: number }>;
  performanceMetrics: {
    averagePageLoad: number;
    slowestEndpoint: string;
    apiSuccessRate: number;
  };
  botStats?: {
    status: BotSummary;
    recentActivities: BotActivity[];
    commandCount: number;
    activeGuilds: number;
    healthScore: number;
  };
}

export default function E2EMonitoringPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = async () => {
    setRefreshing(true);

    try {
      // Fetch data from API to avoid client-side database imports
      const response = await fetch('/api/admin/e2e-monitoring-data');
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }
      const data = await response.json();

      console.log('[E2E-MONITORING-FRONTEND] Received data:', {
        sessionSummariesCount: data.sessionSummaries?.length || 0,
        hasSystemStats: !!data.systemStats,
        botStats: data.systemStats?.botStats
      });

      // Use the data from API response
      setSessions(data.sessionSummaries || []);
      setSystemStats(data.systemStats || null);

    } catch (error) {
      console.error('Failed to refresh E2E monitoring data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      // Fetch session details from API
      const response = await fetch(`/api/admin/e2e-monitoring-data?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session details');
      }
      const data = await response.json();

      setSessionDetails(data.sessionDetails || null);
      setSelectedSession(sessionId);
    } catch (error) {
      console.error('Failed to load session details:', error);
    }
  };

  const exportSessionData = () => {
    const data = {
      sessions: sessions.map(s => ({
        ...s,
        duration: Math.round(s.duration / 1000), // Convert to seconds
        lastActivity: new Date(s.lastActivity).toISOString()
      })),
      systemStats,
      exportTime: new Date().toISOString(),
      totalActiveSessions: sessions.length
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `e2e-monitoring-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    refreshData();

    // Refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusBadge = (session: SessionSummary) => {
    const age = Date.now() - session.lastActivity;
    if (age < 30000) return <Badge variant="default" className="bg-green-500">Active</Badge>;
    if (age < 300000) return <Badge variant="secondary">Recent</Badge>;
    return <Badge variant="outline">Idle</Badge>;
  };

  return (
    <div className="space-y-6">
      <Section title="E2E Monitoring Dashboard">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Real-time User Journey Tracking</h2>
            <p className="text-muted-foreground">
              Monitor user sessions, performance, and errors during testing
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportSessionData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* System Overview */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.activeSessions}</div>
                <p className="text-xs text-muted-foreground">
                  +{systemStats.totalSessionsToday} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(systemStats.averageSessionDuration)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per active session
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.errorRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Across all sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.performanceMetrics.apiSuccessRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bot Overview */}
        {systemStats?.botStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    systemStats.botStats.status.status === 'online' ? 'bg-green-500' :
                    systemStats.botStats.status.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-2xl font-bold capitalize">
                    {systemStats.botStats.status.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {systemStats.botStats.status.uptime}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Guilds</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.botStats.status.activeGuilds}</div>
                <p className="text-xs text-muted-foreground">
                  Bot is active in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Commands</CardTitle>
                <Command className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.botStats.status.recentCommands}</div>
                <p className="text-xs text-muted-foreground">
                  In last 5 minutes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bot Health</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.botStats.status.healthScore}%</div>
                <p className="text-xs text-muted-foreground">
                  Health score
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active User Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No active sessions found
                  </p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                        selectedSession === session.sessionId ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => loadSessionDetails(session.sessionId)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {session.sessionId.slice(0, 8)}...
                            </code>
                            {getStatusBadge(session)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            User: {session.discordId.slice(0, 6)}... | Steps: {session.totalSteps}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Current: {session.currentStep} | Duration: {formatDuration(session.duration)}
                          </p>
                        </div>
                        {session.totalErrors > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {session.totalErrors} errors
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionDetails ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Session ID:</span>
                      <code className="block text-xs bg-muted p-2 rounded mt-1">
                        {sessionDetails.sessionId}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">User ID:</span>
                      <p className="text-muted-foreground">{sessionDetails.discordId}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p className="text-muted-foreground">
                        {formatDuration(Date.now() - sessionDetails.startTime)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Total Steps:</span>
                      <p className="text-muted-foreground">{sessionDetails.journey.length}</p>
                    </div>
                  </div>

                  {/* Journey Steps */}
                  <div>
                    <h4 className="font-medium mb-2">Journey Steps:</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sessionDetails.journey.map((step: any, index: number) => (
                        <div key={index} className="text-xs bg-muted p-2 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{step.step}</span>
                            <span className="text-muted-foreground">
                              {step.duration ? `+${step.duration}ms` : ''}
                            </span>
                          </div>
                          {step.metadata && (
                            <pre className="text-xs mt-1 text-muted-foreground">
                              {JSON.stringify(step.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Errors */}
                  {sessionDetails.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">Errors ({sessionDetails.errors.length}):</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {sessionDetails.errors.map((error: any, index: number) => (
                          <div key={index} className="text-xs bg-red-50 border border-red-200 p-2 rounded">
                            <div className="flex justify-between">
                              <span className="font-medium text-red-700">{error.type}</span>
                              <span className="text-muted-foreground">
                                {new Date(error.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-red-600 mt-1">{error.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Bot Activities */}
                  {sessionDetails.relatedBotActivities && sessionDetails.relatedBotActivities.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-blue-600">Related Bot Commands ({sessionDetails.relatedBotActivities.length}):</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {sessionDetails.relatedBotActivities.map((activity: any, index: number) => (
                          <div key={index} className="text-xs bg-blue-50 border border-blue-200 p-2 rounded">
                            <div className="flex justify-between">
                              <span className="font-medium text-blue-700">/{activity.command}</span>
                              <span className="text-muted-foreground">
                                {activity.responseTime}ms
                              </span>
                            </div>
                            <p className="text-blue-600 mt-1">
                              Guild: {activity.guildId.slice(0, 8)}... • {activity.success ? 'Success' : 'Failed'}
                            </p>
                            {activity.args && activity.args.length > 0 && (
                              <p className="text-blue-600 mt-1 text-xs">
                                Args: {activity.args.join(' ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Select a session to view details
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Bot Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Bot Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {systemStats?.botStats?.recentActivities?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No recent bot activities
                  </p>
                ) : (
                  systemStats?.botStats?.recentActivities?.map((activity, index) => (
                    <div
                      key={`${activity.timestamp}_${index}`}
                      className={`p-3 border rounded-lg ${
                        activity.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              /{activity.command}
                            </code>
                            <Badge variant={activity.success ? "default" : "destructive"} className="text-xs">
                              {activity.success ? 'Success' : 'Failed'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            User: {activity.userId.slice(0, 6)}... | Guild: {activity.guildId.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.responseTime}ms • {new Date(activity.timestamp).toLocaleTimeString()}
                          </p>
                          {activity.args && activity.args.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Args: {activity.args.join(' ')}
                            </p>
                          )}
                          {activity.errorMessage && (
                            <p className="text-xs text-red-600 mt-1">
                              Error: {activity.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Summary */}
        {systemStats && systemStats.topErrorTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Top Error Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {systemStats.topErrorTypes.map((errorType) => (
                  <div key={errorType.type} className="text-center">
                    <div className="text-2xl font-bold text-red-600">{errorType.count}</div>
                    <p className="text-sm text-muted-foreground capitalize">{errorType.type} Errors</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </Section>
    </div>
  );
}
