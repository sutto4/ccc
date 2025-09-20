"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Key, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield,
  Crown,
  Users
} from 'lucide-react';
import { ServerGroupDetail, Manager } from '@/lib/mock/use-server-group';

interface PermissionsTabProps {
  group: ServerGroupDetail;
}

export function PermissionsTab({ group }: PermissionsTabProps) {
  const [isAddManagerDialogOpen, setIsAddManagerDialogOpen] = useState(false);
  const [newManager, setNewManager] = useState({
    userId: '',
    username: '',
    role: 'moderator' as 'admin' | 'moderator',
    permissions: [] as string[]
  });

  const handleAddManager = () => {
    console.log('Adding manager:', newManager);
    setNewManager({ userId: '', username: '', role: 'moderator', permissions: [] });
    setIsAddManagerDialogOpen(false);
  };

  const handleRemoveManager = (managerId: string) => {
    console.log('Removing manager:', managerId);
  };

  const handleUpdateManager = (managerId: string, updates: Partial<Manager>) => {
    console.log('Updating manager:', managerId, updates);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return <Badge className="bg-purple-100 text-purple-800"><Crown className="h-3 w-3 mr-1" />Owner</Badge>;
      case 'admin': return <Badge className="bg-red-100 text-red-800"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'moderator': return <Badge className="bg-blue-100 text-blue-800"><Users className="h-3 w-3 mr-1" />Moderator</Badge>;
      default: return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const availablePermissions = [
    'manage_servers',
    'manage_roles',
    'manage_automod',
    'manage_announcements',
    'manage_ban_sync',
    'manage_role_sync',
    'view_analytics',
    'manage_settings'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Permissions</h2>
          <p className="text-gray-600">Manage who can access and modify this server group</p>
        </div>
        <Dialog open={isAddManagerDialogOpen} onOpenChange={setIsAddManagerDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Manager
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Manager</DialogTitle>
              <DialogDescription>
                Add a new manager to help manage this server group
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  value={newManager.userId}
                  onChange={(e) => setNewManager(prev => ({ ...prev, userId: e.target.value }))}
                  placeholder="Enter Discord user ID"
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newManager.username}
                  onChange={(e) => setNewManager(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username (optional)"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={newManager.role}
                  onValueChange={(value: 'admin' | 'moderator') => 
                    setNewManager(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availablePermissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newManager.permissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewManager(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission]
                            }));
                          } else {
                            setNewManager(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">
                        {permission.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddManagerDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddManager} disabled={!newManager.userId}>
                Add Manager
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permission Templates */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Permission Templates</h3>
          <p className="text-sm text-gray-600">
            Predefined permission sets for different roles
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">Owner</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Full access to all features and settings
              </p>
              <div className="text-xs text-gray-500">
                All permissions included
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-red-600" />
                <h4 className="font-medium">Admin</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Manage most features except billing and ownership
              </p>
              <div className="text-xs text-gray-500">
                Most permissions included
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium">Moderator</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Basic moderation and monitoring features
              </p>
              <div className="text-xs text-gray-500">
                Limited permissions
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Managers List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Group Managers</h3>
          <p className="text-sm text-gray-600">
            Users who can manage this server group
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.managers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{manager.username}</div>
                      <div className="text-sm text-gray-500">{manager.userId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(manager.role)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {manager.permissions.slice(0, 3).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission.replace('_', ' ')}
                        </Badge>
                      ))}
                      {manager.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{manager.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {new Date(manager.addedAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateManager(manager.id, { role: 'admin' })}
                        disabled={manager.role === 'owner'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveManager(manager.id)}
                        disabled={manager.role === 'owner'}
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

      {/* Access Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Effective Access Summary</h3>
          <p className="text-sm text-gray-600">
            Overview of what each role can access
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Server Management</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Add/Remove Servers</span>
                    <span className="text-gray-500">Admin+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Configure Server Settings</span>
                    <span className="text-gray-500">Moderator+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>View Server Status</span>
                    <span className="text-gray-500">All</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Feature Management</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Role Sync Configuration</span>
                    <span className="text-gray-500">Admin+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ban Sync Management</span>
                    <span className="text-gray-500">Admin+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Automod Rules</span>
                    <span className="text-gray-500">Moderator+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Announcements</span>
                    <span className="text-gray-500">Moderator+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


