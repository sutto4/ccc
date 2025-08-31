"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Clock
} from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  userId?: string;
  username?: string;
  actionType?: string;
  details?: any;
}

export default function LogsPage() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7d");
  const [error, setError] = useState<string | null>(null);

  // Load logs
  useEffect(() => {
    if (!guildId || !session) return;
    
    const loadLogs = async () => {
      try {
    setLoading(true);
        setError(null);
        
        // TODO: Replace with actual API call when endpoint is created
        // const response = await fetch(`/api/guilds/${guildId}/logs`);
        // if (!response.ok) throw new Error(`Failed to load logs: ${response.statusText}`);
        // const data = await response.json();
        // setLogs(data);
        
        // For now, use placeholder data
        const mockLogs: LogEntry[] = [
          {
            id: "1",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            level: 'info',
            category: 'user_management',
            message: 'User role updated',
            userId: '123456789',
            username: 'JohnDoe',
            actionType: 'role.update'
          },
          {
            id: "2",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            level: 'success',
            category: 'feature',
            message: 'Feature enabled successfully',
            userId: '987654321',
            username: 'AdminUser',
            actionType: 'feature.enable'
          },
          {
            id: "3",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            level: 'warning',
            category: 'moderation',
            message: 'User warned for inappropriate content',
            userId: '456789123',
            username: 'Moderator',
            actionType: 'moderation.warn'
          },
          {
            id: "4",
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            level: 'error',
            category: 'api',
            message: 'Failed to sync with Discord API',
            actionType: 'api.sync'
          },
          {
            id: "5",
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            level: 'info',
            category: 'bot',
            message: 'Bot restarted successfully',
            actionType: 'bot.restart'
          }
        ];
        
        setLogs(mockLogs);
        setFilteredLogs(mockLogs);
        
      } catch (err: any) {
        console.error('Failed to load logs:', err);
        setError(err.message || 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    
    loadLogs();
  }, [guildId, session]);

  // Filter logs based on search and filters
  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(log => log.category === categoryFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case '1h':
          filterDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          filterDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, levelFilter, categoryFilter, dateFilter]);

  // Get level icon and color
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get level badge variant
  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'success':
        return 'default';
      case 'info':
      default:
        return 'outline';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Export logs
  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Category', 'Message', 'User', 'Action Type'],
      ...filteredLogs.map(log => [
        log.timestamp,
        log.level,
        log.category,
        log.message,
        log.username || 'N/A',
        log.actionType || 'N/A'
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${guildId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Refresh logs
  const handleRefresh = () => {
    // TODO: Implement actual refresh
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <Section title="Server Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
    <div>
            <h2 className="text-xl font-semibold">Server Logs</h2>
            <p className="text-muted-foreground">
              View server activity and bot logs
            </p>
        </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
        </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" />
            {error}
        </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter logs by various criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="user_management">User Management</SelectItem>
                    <SelectItem value="feature">Features</SelectItem>
                    <SelectItem value="moderation">Moderation</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="bot">Bot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Time Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
        </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Log Entries
            </CardTitle>
            <CardDescription>
              Showing {filteredLogs.length} of {logs.length} total logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No logs found matching the current filters.
      </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-shrink-0 mt-1">
                      {getLevelIcon(log.level)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getLevelBadgeVariant(log.level) as any}>
                          {log.level}
                        </Badge>
                        <Badge variant="outline">
                          {log.category}
                        </Badge>
                        {log.username && (
                          <span className="text-sm text-muted-foreground">
                            by {log.username}
                      </span>
                    )}
                      </div>
                      
                      <p className="text-sm font-medium mb-1">{log.message}</p>
                      
                      {log.actionType && (
                        <p className="text-xs text-muted-foreground">
                          Action: {log.actionType}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Log Statistics</CardTitle>
            <CardDescription>
              Overview of log activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {logs.filter(l => l.level === 'info').length}
                </div>
                <div className="text-sm text-blue-700">Info</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {logs.filter(l => l.level === 'success').length}
                </div>
                <div className="text-sm text-green-700">Success</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {logs.filter(l => l.level === 'warning').length}
                </div>
                <div className="text-sm text-yellow-700">Warnings</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {logs.filter(l => l.level === 'error').length}
                </div>
                <div className="text-sm text-red-700">Errors</div>
      </div>
    </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
