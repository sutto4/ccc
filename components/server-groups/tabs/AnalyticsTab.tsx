"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Shield, 
  Bot,
  Megaphone,
  Calendar
} from 'lucide-react';
import { ServerGroupDetail } from '@/lib/mock/use-server-group';

interface AnalyticsTabProps {
  group: ServerGroupDetail;
}

export function AnalyticsTab({ group }: AnalyticsTabProps) {
  const [timeRange, setTimeRange] = useState('7d');

  const metrics = [
    {
      title: 'Total Members',
      value: group.analytics.totalMembers.toLocaleString(),
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Members',
      value: group.analytics.activeMembers.toLocaleString(),
      change: '+8%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Moderation Actions',
      value: group.analytics.moderationActions.toString(),
      change: '-5%',
      changeType: 'negative',
      icon: Shield,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Automod Triggers',
      value: group.analytics.automodTriggers.toString(),
      change: '+15%',
      changeType: 'positive',
      icon: Bot,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const syncMetrics = [
    {
      title: 'Role Syncs',
      value: group.analytics.roleSyncs,
      description: 'Role synchronizations performed'
    },
    {
      title: 'Ban Syncs',
      value: group.analytics.banSyncs,
      description: 'Ban list synchronizations'
    },
    {
      title: 'Announcements Sent',
      value: group.analytics.announcementsSent,
      description: 'Cross-server announcements delivered'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-gray-600">Performance metrics and insights for your server group</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-sm ${
                        metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.change}
                      </span>
                      <span className="text-xs text-gray-500">vs last period</span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Activity */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Sync Activity</h3>
          <p className="text-sm text-gray-600">
            Synchronization metrics across all servers
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {syncMetrics.map((metric) => (
              <div key={metric.title} className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {metric.value}
                </div>
                <div className="text-sm font-medium text-gray-600 mb-1">
                  {metric.title}
                </div>
                <div className="text-xs text-gray-500">
                  {metric.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Server Performance */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Server Performance</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {group.servers.map((server) => (
              <div key={server.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-sm text-gray-500">{server.memberCount} members</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold">0</div>
                    <div className="text-xs text-gray-500">Mod Actions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">0</div>
                    <div className="text-xs text-gray-500">Automod Triggers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">0</div>
                    <div className="text-xs text-gray-500">Role Syncs</div>
                  </div>
                  <Badge variant={server.isOnline ? 'default' : 'secondary'}>
                    {server.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Feature Usage</h3>
          <p className="text-sm text-gray-600">
            How features are being used across the group
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Role Sync</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Servers</span>
                  <span>{group.servers.filter(s => s.settings.roleSyncEnabled).length} / {group.servers.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(group.servers.filter(s => s.settings.roleSyncEnabled).length / group.servers.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium">Ban Sync</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Servers</span>
                  <span>{group.servers.filter(s => s.settings.banSyncEnabled).length} / {group.servers.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(group.servers.filter(s => s.settings.banSyncEnabled).length / group.servers.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium">Automod</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Servers</span>
                  <span>{group.servers.filter(s => s.settings.automodEnabled).length} / {group.servers.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(group.servers.filter(s => s.settings.automodEnabled).length / group.servers.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium">Announcements</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Scheduled</span>
                  <span>{group.announcements.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Sent This Week</span>
                  <span>{group.analytics.announcementsSent}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


