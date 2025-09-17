"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Section from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';

interface SystemLog {
  id: number;
  guild_id: string;
  guild_name?: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  user_role: string;
  action_type: string;
  action_name: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  old_value?: any;
  new_value?: any;
  metadata?: any;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  created_at: string;
}

interface LogFilters {
  guildId?: string;
  userId?: string;
  actionType?: string[];
  targetType?: string[];
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const ACTION_TYPES = [
  'feature_toggle', 'feature_config', 'role_permission', 'user_management',
  'bot_config', 'channel_config', 'message_config', 'creator_alert',
  'moderation_action', 'system_setting', 'data_export', 'api_access',
  'login', 'logout', 'other'
];

const TARGET_TYPES = [
  'guild', 'user', 'role', 'channel', 'feature', 'command', 'setting', 'system'
];

const STATUS_OPTIONS = ['success', 'failed', 'pending'];

function AdminLogsPageContent() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  
  // Filters
  const [filters, setFilters] = useState<LogFilters>({
    search: searchParams?.get('search') || '',
    guildId: searchParams?.get('guildId') || '',
    actionType: searchParams?.get('actionType')?.split(',').filter(Boolean) || [],
    status: searchParams?.get('status')?.split(',').filter(Boolean) || []
  });

  const [showFilters, setShowFilters] = useState(false);

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value && (Array.isArray(value) ? value.length > 0 : true)
          ).map(([key, value]) => [
            key, 
            Array.isArray(value) ? value.join(',') : value.toString()
          ])
        )
      });

      const response = await fetch(`/api/admin/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotal(data.total);
      } else {
        console.error('Failed to fetch logs');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeColor = (actionType: string) => {
    const colors: Record<string, string> = {
      'feature_toggle': 'bg-blue-100 text-blue-800',
      'role_permission': 'bg-purple-100 text-purple-800',
      'user_management': 'bg-orange-100 text-orange-800',
      'bot_config': 'bg-indigo-100 text-indigo-800',
      'login': 'bg-green-100 text-green-800',
      'logout': 'bg-gray-100 text-gray-800'
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800';
  };

  const formatValue = (value: any) => {
    if (!value) return 'N/A';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value.toString();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Logs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor all user actions and system events
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>
          <Button
            variant="outline"
            onClick={fetchLogs}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <Input
                  type="text"
                  placeholder="User name, action, target..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guild ID
                </label>
                <Input
                  type="text"
                  placeholder="Enter guild ID"
                  value={filters.guildId || ''}
                  onChange={(e) => handleFilterChange('guildId', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Type
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={filters.actionType?.[0] || ''}
                  onChange={(e) => handleFilterChange('actionType', e.target.value ? [e.target.value] : [])}
                >
                  <option value="">All Action Types</option>
                  {ACTION_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={filters.status?.[0] || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value] : [])}
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <Input
                  type="datetime-local"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <Input
                  type="datetime-local"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {logs.length} of {total.toLocaleString()} logs
        </p>
        
        {/* Pagination */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{log.user_name}</div>
                        <div className="text-xs text-gray-500">{log.user_role}</div>
                        {log.guild_name && (
                          <div className="text-xs text-blue-600 mt-1">
                            📍 {log.guild_name}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getActionTypeColor(log.action_type)}>
                          {log.action_type.replace('_', ' ')}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">{log.action_name}</div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {log.target_name || log.target_id || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{log.target_type}</div>
                        {log.guild_id && log.guild_id !== 'system' && (
                          <div className="text-xs text-gray-400 mt-1">
                            Guild: {log.guild_id}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusBadgeColor(log.status)}>
                          {log.status}
                        </Badge>
                        {log.error_message && (
                          <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
                            {log.error_message}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.new_value && (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-800">
                              View changes
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded max-w-xs overflow-auto">
                              {formatValue(log.new_value)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminLogsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading logs…</div>}>
      <AdminLogsPageContent />
    </Suspense>
  );
}
