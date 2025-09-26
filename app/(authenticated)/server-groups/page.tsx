"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Folder, Settings, Users, Shield, Ban, Bot, Megaphone, FileText, BarChart3, Key, Cog, Server, Activity, Clock, Zap, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useServerGroups } from '@/hooks/use-server-groups';

export default function ServerGroupsPage() {
  const { groups, limits, isLoading, createGroup, updateGroup } = useServerGroups();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupIconUrl, setNewGroupIconUrl] = useState('');
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupIconUrl, setEditGroupIconUrl] = useState('');

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    await createGroup({
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || null,
      iconUrl: newGroupIconUrl.trim() || null
    });
    
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupIconUrl('');
    setIsCreateDialogOpen(false);
  };

  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || '');
    setEditGroupIconUrl(group.iconUrl || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateGroup = async () => {
    if (!editGroupName.trim() || !editingGroup) return;
    
    await updateGroup({
      id: editingGroup.id,
      data: {
        name: editGroupName.trim(),
        description: editGroupDescription.trim() || null,
        iconUrl: editGroupIconUrl.trim() || null
      }
    });
    
    setIsEditDialogOpen(false);
    setEditingGroup(null);
    setEditGroupName('');
    setEditGroupDescription('');
    setEditGroupIconUrl('');
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading server groups...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/guilds">My Servers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Server Groups</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Server Groups
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Manage multiple servers as a unified group with shared settings and configurations.
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={!limits.canCreateGroups}
                title={!limits.canCreateGroups ? `Server groups require a premium plan. Your current plan: ${limits.userPlan}` : 'Create a new server group'}
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Group
                {limits.serverGroupLimit > 0 && (
                  <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                    {limits.currentGroupCount}/{limits.serverGroupLimit}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Server Group</DialogTitle>
                <DialogDescription>
                  Create a new server group to manage multiple servers together.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Enter group description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="iconUrl">Icon URL (Optional)</Label>
                  <Input
                    id="iconUrl"
                    value={newGroupIconUrl}
                    onChange={(e) => setNewGroupIconUrl(e.target.value)}
                    placeholder="https://example.com/icon.png"
                    type="url"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter a URL to an image for the group icon
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Group Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Server Group</DialogTitle>
                <DialogDescription>
                  Update the details for "{editingGroup?.name}".
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Group Name</Label>
                  <Input
                    id="edit-name"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Textarea
                    id="edit-description"
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                    placeholder="Enter group description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-iconUrl">Icon URL (Optional)</Label>
                  <Input
                    id="edit-iconUrl"
                    value={editGroupIconUrl}
                    onChange={(e) => setEditGroupIconUrl(e.target.value)}
                    placeholder="https://example.com/icon.png"
                    type="url"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter a URL to an image for the group icon
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateGroup} disabled={!editGroupName.trim()}>
                  Update Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plan Information */}
        <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Your Plan: {limits.userPlan.charAt(0).toUpperCase() + limits.userPlan.slice(1)}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {limits.serverGroupLimit === -1 ? (
                  "Unlimited server groups and servers per group"
                ) : limits.serverGroupLimit === 0 ? (
                  "Server groups require a premium plan (Squad, City, or Network)"
                ) : (
                  `Up to ${limits.serverGroupLimit} server groups, ${limits.serverLimitPerGroup} servers per group`
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{limits.currentGroupCount}</div>
              <div className="text-sm text-gray-600">Groups Created</div>
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        {groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Groups</p>
                    <p className="text-3xl font-bold text-blue-900">{groups.length}</p>
                  </div>
                  <Folder className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Servers</p>
                    <p className="text-3xl font-bold text-green-900">
                      {groups.reduce((sum, group) => sum + group.serverCount, 0)}
                    </p>
                  </div>
                  <Server className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Active Syncs</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {groups.reduce((sum, group) => sum + (group.roleSyncEnabled ? 1 : 0) + (group.banSyncEnabled ? 1 : 0), 0)}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Total Members</p>
                    <p className="text-3xl font-bold text-orange-900">
                      {groups.reduce((sum, group) => 
                        sum + (group.servers?.reduce((serverSum, server) => serverSum + server.memberCount, 0) || 0), 0
                      ).toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Folder className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Server Groups Yet</h3>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Create your first server group to manage multiple servers together with shared settings and configurations.
            </p>
            <div className="space-y-4">
              <Button 
                size="lg" 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Group
              </Button>
              <div className="text-sm text-gray-500">
                Server groups help you manage multiple Discord servers with unified settings
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Group</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Servers</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Features</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Tier</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                          {group.iconUrl ? (
                            <img 
                              src={group.iconUrl} 
                              alt={`${group.name} icon`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to default icon if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center ${group.iconUrl ? 'hidden' : ''}`}>
                            <Folder className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-gray-900">{group.name}</div>
                            <button
                              onClick={() => handleEditGroup(group)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Edit group details"
                            >
                              <Edit2 className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                            </button>
                          </div>
                          {group.description && (
                            <div className="text-sm text-gray-500 mt-1">{group.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {group.servers?.length || 0} servers
                        </div>
                        {group.servers && group.servers.length > 0 && (
                          <div className="text-xs text-gray-500 space-y-1">
                            {group.servers.map((server) => (
                              <div key={server.id} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${server.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span>{server.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className={group.roleSyncEnabled ? 'text-green-600' : 'text-gray-400'}>
                            {group.roleSyncEnabled ? 'Role Sync' : 'No Role Sync'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Ban className="h-4 w-4 text-gray-400" />
                          <span className={group.banSyncEnabled ? 'text-green-600' : 'text-gray-400'}>
                            {group.banSyncEnabled ? 'Ban Sync' : 'No Ban Sync'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            Updated {new Date(group.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={group.premiumTier === 'premium' ? 'default' : group.premiumTier === 'enterprise' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {group.premiumTier.charAt(0).toUpperCase() + group.premiumTier.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/server-groups/${group.id}`}>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


