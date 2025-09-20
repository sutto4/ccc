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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Ban, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Trash2,
  RefreshCw,
  Settings
} from 'lucide-react';
import { ServerGroupDetail, BanException } from '@/lib/mock/use-server-group';
import { SG_InheritanceBadge } from '@/components/server-groups/SG_InheritanceBadge';

interface BanSyncTabProps {
  group: ServerGroupDetail;
}

export function BanSyncTab({ group }: BanSyncTabProps) {
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  const [isReconcileDialogOpen, setIsReconcileDialogOpen] = useState(false);
  const [newException, setNewException] = useState({
    userId: '',
    username: '',
    reason: ''
  });

  const handleAddException = () => {
    // Mock add exception
    console.log('Adding exception:', newException);
    setNewException({ userId: '', username: '', reason: '' });
    setIsExceptionDialogOpen(false);
  };

  const handleRemoveException = (exceptionId: string) => {
    // Mock remove exception
    console.log('Removing exception:', exceptionId);
  };

  const handleReconcile = () => {
    // Mock reconcile
    console.log('Starting ban reconciliation');
    setIsReconcileDialogOpen(false);
  };

  const getScheduleDescription = (schedule: string) => {
    const schedules: { [key: string]: string } = {
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 0 * * 0': 'Weekly on Sunday',
      'manual': 'Manual only'
    };
    return schedules[schedule] || schedule;
  };

  const mockReconcileData = [
    { action: 'add', userId: '123456789', username: 'BadUser1', reason: 'Spam', server: 'Main Gaming Server' },
    { action: 'add', userId: '987654321', username: 'BadUser2', reason: 'Harassment', server: 'Gaming Events' },
    { action: 'remove', userId: '555666777', username: 'GoodUser', reason: 'Appeal approved', server: 'Community Lounge' }
  ];

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ban Sync Settings</h3>
              <p className="text-sm text-gray-600">
                Synchronize ban lists across all servers in this group
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={group.banSyncSettings.enabled}
                onCheckedChange={(checked) => console.log('Toggle ban sync:', checked)}
              />
              <span className="text-sm font-medium">
                {group.banSyncSettings.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Sync Scope</Label>
                <Select 
                  value={group.banSyncSettings.scope}
                  onValueChange={(value) => console.log('Change scope:', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All servers in group</SelectItem>
                    <SelectItem value="specific">Specific servers only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sync Schedule</Label>
                <Select 
                  value={group.banSyncSettings.schedule}
                  onValueChange={(value) => console.log('Change schedule:', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0 */6 * * *">Every 6 hours</SelectItem>
                    <SelectItem value="0 */12 * * *">Every 12 hours</SelectItem>
                    <SelectItem value="0 0 * * *">Daily at midnight</SelectItem>
                    <SelectItem value="0 0 * * 0">Weekly on Sunday</SelectItem>
                    <SelectItem value="manual">Manual only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {getScheduleDescription(group.banSyncSettings.schedule)}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-center p-4 border rounded-lg">
                <Ban className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{group.analytics.banSyncs}</div>
                <div className="text-sm text-gray-600">Syncs This Week</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{group.banSyncSettings.exceptions.length}</div>
                <div className="text-sm text-gray-600">Exceptions</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Server Status</h3>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Bans</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.servers.map((server) => {
                const isEnabled = server.settings.banSyncEnabled;
                const hasOverride = server.settings.overrides.includes('banSync');
                
                return (
                  <TableRow key={server.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                          <Ban className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium">{server.name}</div>
                          <div className="text-sm text-gray-500">{server.memberCount} members</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isEnabled ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <SG_InheritanceBadge status={hasOverride ? 'overridden' : 'inherited'} />
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <Badge variant="outline">Disabled</Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {new Date(server.lastSeen).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">0</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => console.log('Sync server:', server.id)}
                          disabled={!isEnabled}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => console.log('Configure server:', server.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Exceptions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Ban Exceptions</h3>
            <Dialog open={isExceptionDialogOpen} onOpenChange={setIsExceptionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exception
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Ban Exception</DialogTitle>
                  <DialogDescription>
                    Add a user to the ban sync exceptions list. They will not be banned across servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-id">User ID</Label>
                    <Input
                      id="user-id"
                      value={newException.userId}
                      onChange={(e) => setNewException(prev => ({ ...prev, userId: e.target.value }))}
                      placeholder="Enter Discord user ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newException.username}
                      onChange={(e) => setNewException(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username (optional)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      id="reason"
                      value={newException.reason}
                      onChange={(e) => setNewException(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Enter reason for exception"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExceptionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddException} disabled={!newException.userId || !newException.reason}>
                    Add Exception
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
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Added At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.banSyncSettings.exceptions.map((exception) => (
                <TableRow key={exception.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{exception.username}</div>
                      <div className="text-sm text-gray-500">{exception.userId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{exception.reason}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{exception.addedBy}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {new Date(exception.addedAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveException(exception.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reconcile Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Reconcile Preview</h3>
            <Dialog open={isReconcileDialogOpen} onOpenChange={setIsReconcileDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconcile Bans
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Ban Reconciliation Preview</DialogTitle>
                  <DialogDescription>
                    Review the changes that will be made when reconciling bans across servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {mockReconcileData.filter(item => item.action === 'add').length}
                      </div>
                      <div className="text-sm text-gray-600">Bans to Add</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {mockReconcileData.filter(item => item.action === 'remove').length}
                      </div>
                      <div className="text-sm text-gray-600">Bans to Remove</div>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Server</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockReconcileData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant={item.action === 'add' ? 'destructive' : 'default'}>
                              {item.action === 'add' ? 'Add Ban' : 'Remove Ban'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.username}</div>
                              <div className="text-sm text-gray-500">{item.userId}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{item.reason}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{item.server}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReconcileDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleReconcile}>
                    Apply Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">Ready to Reconcile</h4>
            <p className="text-gray-600 mb-4">
              Click "Reconcile Bans" to preview and apply changes across all servers.
            </p>
            <Button onClick={() => setIsReconcileDialogOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Reconciliation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


