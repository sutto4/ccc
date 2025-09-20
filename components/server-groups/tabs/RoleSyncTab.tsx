"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ServerGroupDetail, RoleTemplate } from '@/lib/mock/use-server-group';
import { SG_InheritanceBadge } from '@/components/server-groups/SG_InheritanceBadge';
import { SG_ResetToDefault } from '@/components/server-groups/SG_ResetToDefault';

interface RoleSyncTabProps {
  group: ServerGroupDetail;
}

export function RoleSyncTab({ group }: RoleSyncTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RoleTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    color: '#3B82F6',
    permissions: [] as string[],
    position: 0
  });

  const handleCreateTemplate = () => {
    // Mock create template
    console.log('Creating template:', newTemplate);
    setNewTemplate({ name: '', color: '#3B82F6', permissions: [], position: 0 });
    setIsCreateDialogOpen(false);
  };

  const handleEditTemplate = (template: RoleTemplate) => {
    setEditingTemplate(template);
  };

  const handleDeleteTemplate = (templateId: string) => {
    // Mock delete template
    console.log('Deleting template:', templateId);
  };

  const handleUpdateMapping = (templateId: string, serverId: string, roleId: string) => {
    // Mock update mapping
    console.log('Updating mapping:', { templateId, serverId, roleId });
  };

  const getServerStatus = (serverId: string) => {
    const server = group.servers.find(s => s.id === serverId);
    if (!server) return { status: 'error', text: 'Not Found' };
    if (!server.isOnline) return { status: 'offline', text: 'Offline' };
    if (!server.settings.roleSyncEnabled) return { status: 'disabled', text: 'Disabled' };
    return { status: 'active', text: 'Active' };
  };

  const availablePermissions = [
    'ADMINISTRATOR',
    'MANAGE_GUILD',
    'MANAGE_ROLES',
    'MANAGE_CHANNELS',
    'MANAGE_MESSAGES',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'MENTION_EVERYONE',
    'MANAGE_NICKNAMES',
    'MANAGE_WEBHOOKS',
    'MANAGE_EMOJIS_AND_STICKERS'
  ];

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Role Sync Settings</h3>
              <p className="text-sm text-gray-600">
                Configure how roles are synchronized across servers in this group
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={group.roleSyncEnabled}
                onCheckedChange={(checked) => console.log('Toggle role sync:', checked)}
              />
              <span className="text-sm font-medium">
                {group.roleSyncEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{group.roleTemplates.length}</div>
              <div className="text-sm text-gray-600">Role Templates</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {group.servers.filter(s => s.settings.roleSyncEnabled).length}
              </div>
              <div className="text-sm text-gray-600">Active Servers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Settings className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{group.analytics.roleSyncs}</div>
              <div className="text-sm text-gray-600">Syncs This Week</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Role Templates</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Role Template</DialogTitle>
                  <DialogDescription>
                    Create a new role template that can be applied across all servers in this group.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-color">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="template-color"
                        type="color"
                        value={newTemplate.color}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={newTemplate.color}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availablePermissions.map((permission) => (
                        <label key={permission} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newTemplate.permissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTemplate(prev => ({
                                  ...prev,
                                  permissions: [...prev.permissions, permission]
                                }));
                              } else {
                                setNewTemplate(prev => ({
                                  ...prev,
                                  permissions: prev.permissions.filter(p => p !== permission)
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate} disabled={!newTemplate.name}>
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.roleTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full border-2"
                        style={{ backgroundColor: template.color }}
                      />
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {template.color}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {template.permissions.length} permissions
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{template.position}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Server Mappings */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Server Mappings</h3>
          <p className="text-sm text-gray-600">
            Map role templates to actual roles in each server
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {group.roleTemplates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-4 h-4 rounded-full border-2"
                    style={{ backgroundColor: template.color }}
                  />
                  <h4 className="font-medium">{template.name}</h4>
                  <Badge variant="outline">{template.permissions.length} permissions</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Server</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mapped Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.servers.map((server) => {
                      const status = getServerStatus(server.id);
                      const mappedRoleId = template.serverMappings[server.id];
                      
                      return (
                        <TableRow key={server.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium">{server.name}</div>
                                <div className="text-sm text-gray-500">{server.memberCount} members</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {status.status === 'active' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {status.status === 'offline' && <XCircle className="h-4 w-4 text-red-500" />}
                              {status.status === 'disabled' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                              {status.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                              <span className="text-sm">{status.text}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {mappedRoleId ? (
                              <Badge variant="default">Role {mappedRoleId}</Badge>
                            ) : (
                              <Badge variant="outline">Not Mapped</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateMapping(template.id, server.id, 'new-role-id')}
                                disabled={status.status !== 'active'}
                              >
                                Map Role
                              </Button>
                              <SG_ResetToDefault
                                itemName={`${template.name} mapping`}
                                onReset={() => console.log('Reset mapping')}
                                variant="icon"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


