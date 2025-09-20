"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Folder, 
  Server, 
  Users, 
  Ban, 
  Bot, 
  Megaphone, 
  FileText, 
  BarChart3, 
  Key, 
  Cog,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useServerGroup } from '@/lib/mock/use-server-group';
import { SG_PremiumGate } from '@/components/server-groups/SG_PremiumGate';
import { SG_InheritanceBadge } from '@/components/server-groups/SG_InheritanceBadge';
import { SG_LimitMeter } from '@/components/server-groups/SG_LimitMeter';

// Import page components
import { OverviewTab } from '@/components/server-groups/tabs/OverviewTab';
import { ServersTab } from '@/components/server-groups/tabs/ServersTab';
import { RoleSyncTab } from '@/components/server-groups/tabs/RoleSyncTab';
import { BanSyncTab } from '@/components/server-groups/tabs/BanSyncTab';
import { AutomodTab } from '@/components/server-groups/tabs/AutomodTab';
import { AnnouncementsTab } from '@/components/server-groups/tabs/AnnouncementsTab';
import { ModerationLogTab } from '@/components/server-groups/tabs/ModerationLogTab';
import { AnalyticsTab } from '@/components/server-groups/tabs/AnalyticsTab';
import { PermissionsTab } from '@/components/server-groups/tabs/PermissionsTab';
import { SettingsTab } from '@/components/server-groups/tabs/SettingsTab';

export default function ServerGroupPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');
  
  const { group, isLoading, error } = useServerGroup(groupId);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading server group...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Group Not Found</h3>
            <p className="text-gray-600 mb-6">
              The server group you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Folder },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'role-sync', label: 'Role Sync', icon: Users },
    { id: 'ban-sync', label: 'Ban Sync', icon: Ban },
    { id: 'automod', label: 'Automod', icon: Bot },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'moderation-log', label: 'Moderation Log', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'permissions', label: 'Permissions', icon: Key },
    { id: 'settings', label: 'Settings', icon: Cog },
  ];

  return (
    <div className="p-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/guilds">My Servers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/server-groups">Server Groups</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{group.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
            <Folder className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
              <Badge variant={group.premiumTier === 'premium' ? 'default' : 'secondary'}>
                {group.premiumTier}
              </Badge>
              {group.premiumTier === 'premium' && (
                <Crown className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            {group.description && (
              <p className="text-gray-600 mt-1">{group.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>{group.serverCount} servers</span>
              <span>•</span>
              <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SG_LimitMeter 
            current={group.serverCount} 
            limit={group.serverLimit} 
            type="servers" 
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab group={group} />
        </TabsContent>

        <TabsContent value="servers">
          <ServersTab group={group} />
        </TabsContent>

        <TabsContent value="role-sync">
          <SG_PremiumGate requiredTier="premium" currentTier={group.premiumTier}>
            <RoleSyncTab group={group} />
          </SG_PremiumGate>
        </TabsContent>

        <TabsContent value="ban-sync">
          <SG_PremiumGate requiredTier="premium" currentTier={group.premiumTier}>
            <BanSyncTab group={group} />
          </SG_PremiumGate>
        </TabsContent>

        <TabsContent value="automod">
          <SG_PremiumGate requiredTier="premium" currentTier={group.premiumTier}>
            <AutomodTab group={group} />
          </SG_PremiumGate>
        </TabsContent>

        <TabsContent value="announcements">
          <SG_PremiumGate requiredTier="premium" currentTier={group.premiumTier}>
            <AnnouncementsTab group={group} />
          </SG_PremiumGate>
        </TabsContent>

        <TabsContent value="moderation-log">
          <ModerationLogTab group={group} />
        </TabsContent>

        <TabsContent value="analytics">
          <SG_PremiumGate requiredTier="premium" currentTier={group.premiumTier}>
            <AnalyticsTab group={group} />
          </SG_PremiumGate>
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsTab group={group} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab group={group} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


