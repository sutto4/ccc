"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Users, 
  Shield, 
  Ban, 
  Bot, 
  Megaphone, 
  Plus, 
  UserPlus, 
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ServerGroupDetail } from '@/lib/mock/use-server-group';
import { SG_InheritanceBadge } from '@/components/server-groups/SG_InheritanceBadge';

interface OverviewTabProps {
  group: ServerGroupDetail;
}

export function OverviewTab({ group }: OverviewTabProps) {
  const kpis = [
    {
      title: 'Total Servers',
      value: group.serverCount,
      max: group.serverLimit,
      icon: Server,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Members',
      value: group.analytics.totalMembers.toLocaleString(),
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Active Members',
      value: group.analytics.activeMembers.toLocaleString(),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Moderation Actions',
      value: group.analytics.moderationActions,
      icon: Shield,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const features = [
    {
      name: 'Role Sync',
      enabled: group.roleSyncEnabled,
      icon: Users,
      description: 'Synchronize roles across servers',
      stats: `${group.analytics.roleSyncs} syncs this week`
    },
    {
      name: 'Ban Sync',
      enabled: group.banSyncEnabled,
      icon: Ban,
      description: 'Share ban lists between servers',
      stats: `${group.analytics.banSyncs} syncs this week`
    },
    {
      name: 'Automod',
      enabled: group.automodRulesCount > 0,
      icon: Bot,
      description: 'Automated moderation rules',
      stats: `${group.automodRulesCount} rules, ${group.analytics.automodTriggers} triggers`
    },
    {
      name: 'Announcements',
      enabled: group.announcements.length > 0,
      icon: Megaphone,
      description: 'Cross-server announcements',
      stats: `${group.announcements.length} scheduled, ${group.analytics.announcementsSent} sent`
    }
  ];

  const inheritanceSummary = [
    {
      module: 'Role Sync',
      inherited: group.servers.filter(s => s.settings.roleSyncEnabled && !s.settings.overrides.includes('roleSync')).length,
      overridden: group.servers.filter(s => s.settings.roleSyncEnabled && s.settings.overrides.includes('roleSync')).length,
      disabled: group.servers.filter(s => !s.settings.roleSyncEnabled).length
    },
    {
      module: 'Ban Sync',
      inherited: group.servers.filter(s => s.settings.banSyncEnabled && !s.settings.overrides.includes('banSync')).length,
      overridden: group.servers.filter(s => s.settings.banSyncEnabled && s.settings.overrides.includes('banSync')).length,
      disabled: group.servers.filter(s => !s.settings.banSyncEnabled).length
    },
    {
      module: 'Automod',
      inherited: group.servers.filter(s => s.settings.automodEnabled && !s.settings.overrides.includes('automod')).length,
      overridden: group.servers.filter(s => s.settings.automodEnabled && s.settings.overrides.includes('automod')).length,
      disabled: group.servers.filter(s => !s.settings.automodEnabled).length
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    {kpi.max && (
                      <p className="text-xs text-gray-500">of {kpi.max}</p>
                    )}
                  </div>
                  <div className={`w-12 h-12 ${kpi.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Actions</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-auto p-4 flex flex-col items-center gap-2">
              <Plus className="h-6 w-6" />
              <span>Add Server</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <UserPlus className="h-6 w-6" />
              <span>Invite Managers</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <FileText className="h-6 w-6" />
              <span>Create Template</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features Status */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Feature Status</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      feature.enabled ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        feature.enabled ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{feature.name}</h4>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                      <p className="text-xs text-gray-500">{feature.stats}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {feature.enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <Badge variant={feature.enabled ? 'default' : 'secondary'}>
                      {feature.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Inheritance Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Inheritance Summary</h3>
          <p className="text-sm text-gray-600">
            Shows how settings are inherited across servers in this group
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inheritanceSummary.map((item) => (
              <div key={item.module} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{item.module}</h4>
                  <p className="text-sm text-gray-600">
                    {item.inherited + item.overridden + item.disabled} servers total
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <SG_InheritanceBadge status="inherited" />
                    <span className="text-sm text-gray-600">{item.inherited}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SG_InheritanceBadge status="overridden" />
                    <span className="text-sm text-gray-600">{item.overridden}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Disabled</Badge>
                    <span className="text-sm text-gray-600">{item.disabled}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


