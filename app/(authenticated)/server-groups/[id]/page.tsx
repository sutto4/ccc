"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Shield, Users, Server, Plus, Trash2, Loader2, Edit2, MoreHorizontal, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { RoleSyncManager } from '@/components/server-groups/RoleSyncManager';
import { useServerGroup } from '@/hooks/use-server-groups';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// Mock data for the specific group (fallback)
const mockGroupData = {
  id: '1',
  name: 'Gaming Community',
  description: 'Main gaming servers for our community',
  premiumTier: 'premium',
  serverCount: 3,
  roleSyncEnabled: true,
  banSyncEnabled: true,
  servers: [
    { id: '1', name: 'Gaming Central', memberCount: 1250, isOnline: true, isPrimary: true },
    { id: '2', name: 'Esports Arena', memberCount: 890, isOnline: true },
    { id: '3', name: 'Casual Gaming', memberCount: 2100, isOnline: false },
  ],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-20T14:30:00Z'
};

export default function ServerGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'role-sync'>('overview');
  const [groupId, setGroupId] = useState<string>('');
  const [selectedServerToAdd, setSelectedServerToAdd] = useState<string>('');
  const [removingServerId, setRemovingServerId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Await params for Next.js 15
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setGroupId(resolvedParams.id);
    });
  }, [params]);
  
  const { 
    group, 
    isLoading, 
    availableServers, 
    isLoadingAvailableServers,
    addServer,
    removeServer,
    isAddingServer,
    isRemovingServer,
    queryClient
  } = useServerGroup(groupId);
  
  // Use real data only - no fallback to mock data
  const groupData = group;
  
  // Debug logging
  React.useEffect(() => {
    console.log('[ServerGroupDetailPage] groupId:', groupId);
    console.log('[ServerGroupDetailPage] group:', group);
    console.log('[ServerGroupDetailPage] isLoading:', isLoading);
    console.log('[ServerGroupDetailPage] groupData:', groupData);
    console.log('[ServerGroupDetailPage] servers:', groupData?.servers);
    console.log('[ServerGroupDetailPage] availableServers:', availableServers);
    console.log('[ServerGroupDetailPage] isLoadingAvailableServers:', isLoadingAvailableServers);
    if (groupData?.servers) {
      groupData.servers.forEach((server, index) => {
        console.log(`[ServerGroupDetailPage] Server ${index}:`, {
          id: server.id,
          name: server.name,
          isPrimary: server.isPrimary,
          memberCount: server.memberCount,
          rawServer: server
        });
      });
    }
  }, [groupId, group, isLoading, groupData, availableServers, isLoadingAvailableServers]);

  const handleAddServer = async () => {
    if (!selectedServerToAdd) return;
    
    try {
      await addServer(selectedServerToAdd);
      setSelectedServerToAdd('');
      toast({
        title: "Server Added",
        description: "Server has been successfully added to the group.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add server",
        variant: "destructive",
      });
    }
  };

  const handleRemoveServer = async (serverId: string, serverName: string) => {
    setRemovingServerId(serverId);
    try {
      await removeServer(serverId);
      toast({
        title: "Server Removed",
        description: `${serverName} has been removed from the group.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove server",
        variant: "destructive",
      });
    } finally {
      setRemovingServerId(null);
    }
  };

  const handleSetAsPrimary = async (serverId: string, serverName: string) => {
    try {
      // Call API to set as primary
      const response = await fetch(`/api/server-groups/${groupId}/set-primary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: serverId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set as primary');
      }
      
      toast({
        title: "Primary Server Updated",
        description: `${serverName} is now the primary server.`,
      });
      
      // Refresh the data without page reload
      queryClient.invalidateQueries({ queryKey: ['serverGroup', groupId] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set as primary",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !groupData) {
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

    return (
      <div className="p-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/server-groups">Server Groups</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{groupData.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/server-groups">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{groupData.name}</h1>
            <p className="text-gray-600">{groupData?.description || 'No description'}</p>
          </div>
        </div>
        <Badge 
          variant={groupData?.premiumTier === 'premium' ? 'default' : 'secondary'}
          className="text-sm"
        >
          {(groupData?.premiumTier || 'free').charAt(0).toUpperCase() + (groupData?.premiumTier || 'free').slice(1)}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('role-sync')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'role-sync'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Role Sync
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Servers</p>
                    <p className="text-2xl font-bold text-gray-900">{groupData?.serverCount || 0}</p>
                  </div>
                  <Server className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(groupData?.servers || []).reduce((sum, server) => sum + server.memberCount, 0).toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Online Servers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(groupData?.servers || []).filter(server => server.isOnline).length}
                    </p>
                  </div>
                  <Server className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Servers List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Servers in this Group</CardTitle>
                  {groupData?.serverLimit !== -1 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {(groupData?.servers || []).length} / {groupData?.serverLimit} servers used
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedServerToAdd} onValueChange={setSelectedServerToAdd}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select server to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingAvailableServers ? (
                        <SelectItem value="" disabled>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading servers...
                        </SelectItem>
                      ) : availableServers.length === 0 ? (
                        <SelectItem value="" disabled>
                          No available servers
                        </SelectItem>
                      ) : (
                        availableServers.map((server: any) => (
                          <SelectItem key={server.guild_id} value={server.guild_id}>
                            <div className="flex items-center gap-2">
                              {server.icon_url ? (
                                <img 
                                  src={server.icon_url} 
                                  alt={`${server.guild_name} icon`}
                                  className="w-4 h-4 rounded-full"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">
                                  {server.guild_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span>{server.guild_name} ({server.member_count?.toLocaleString() || 0} members)</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddServer}
                    disabled={!selectedServerToAdd || isAddingServer || (groupData?.serverLimit !== -1 && (groupData?.servers || []).length >= groupData?.serverLimit)}
                    size="sm"
                  >
                    {isAddingServer ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Server
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(groupData?.servers || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No servers in this group yet. Add servers using the dropdown above.
                  </div>
                ) : (
                  (groupData?.servers || []).map((server) => (
                    <div key={server.id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      server.isPrimary 
                        ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${server.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          {server.iconUrl ? (
                            <img 
                              src={server.iconUrl} 
                              alt={`${server.name} icon`}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium ${server.iconUrl ? 'hidden' : ''}`}>
                            {server.name.charAt(0).toUpperCase()}
                          </div>
          </div>
          <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {server.isPrimary && (
                              <Crown className="h-4 w-4 text-yellow-600" />
                            )}
                            {server.name}
                            {server.isPrimary && (
                              <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                Primary Server
              </Badge>
              )}
            </div>
                          <div className="text-sm text-gray-500">
                            {server.memberCount.toLocaleString()} members
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
                        <Link href={`/guilds/${server.id}/settings`}>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50 min-w-[160px]">
                            {!server.isPrimary && (
                              <DropdownMenuItem 
                                onClick={() => handleSetAsPrimary(server.id, server.name)}
                                className="text-blue-600 focus:text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Set as Primary
                              </DropdownMenuItem>
                            )}
                            {!server.isPrimary && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleRemoveServer(server.id, server.name)}
                                  disabled={removingServerId === server.id}
                                  className="text-red-600 focus:text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  {removingServerId === server.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                  )}
                                  Remove from Group
                                </DropdownMenuItem>
                              </>
                            )}
                            {server.isPrimary && (
                              <DropdownMenuItem disabled className="text-gray-500 cursor-not-allowed">
                                <Crown className="h-4 w-4 mr-2" />
                                Primary Server
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
        </div>
      </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {activeTab === 'role-sync' && (
        <RoleSyncManager 
          groupId={groupData?.id || ''}
          groupName={groupData?.name || ''}
          servers={groupData?.servers || []}
        />
      )}
    </div>
  );
}