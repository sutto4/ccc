"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Server as ServerIcon
} from 'lucide-react';
import { ServerGroupDetail, Server } from '@/lib/mock/use-server-group';
import { SG_InheritanceBadge } from '@/components/server-groups/SG_InheritanceBadge';
import { SG_ResetToDefault } from '@/components/server-groups/SG_ResetToDefault';

interface ServersTabProps {
  group: ServerGroupDetail;
}

export function ServersTab({ group }: ServersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);

  const filteredServers = group.servers.filter(server =>
    server.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectServer = (serverId: string) => {
    setSelectedServers(prev =>
      prev.includes(serverId)
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const handleSelectAll = () => {
    if (selectedServers.length === filteredServers.length) {
      setSelectedServers([]);
    } else {
      setSelectedServers(filteredServers.map(s => s.id));
    }
  };

  const handleViewDetails = (server: Server) => {
    setSelectedServer(server);
    setIsDetailDrawerOpen(true);
  };

  const handleRemoveServer = (serverId: string) => {
    // Mock remove server
    console.log('Removing server:', serverId);
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action ${action} on servers:`, selectedServers);
  };

  const getServerStatus = (server: Server) => {
    if (server.isOnline) {
      return { icon: CheckCircle, color: 'text-green-500', text: 'Online' };
    } else {
      return { icon: XCircle, color: 'text-red-500', text: 'Offline' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search servers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          {selectedServers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedServers.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('sync')}
              >
                Sync Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('reset')}
              >
                Reset to Defaults
              </Button>
            </div>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Server to Group</DialogTitle>
              <DialogDescription>
                Add a new server to this group to manage it alongside your other servers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Server ID</label>
                <Input placeholder="Enter Discord server ID" />
              </div>
              <div>
                <label className="text-sm font-medium">Server Name</label>
                <Input placeholder="Enter server name" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Add Server
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Servers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Servers ({filteredServers.length})</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedServers.length === filteredServers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedServers.length === filteredServers.length && filteredServers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Settings</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServers.map((server) => {
                const status = getServerStatus(server);
                const StatusIcon = status.icon;
                
                return (
                  <TableRow key={server.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedServers.includes(server.id)}
                        onChange={() => handleSelectServer(server.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ServerIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{server.name}</div>
                          <div className="text-sm text-gray-500">{server.roleCount} roles</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        <span className="text-sm">{status.text}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{server.memberCount.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {server.settings.roleSyncEnabled && (
                          <SG_InheritanceBadge 
                            status={server.settings.overrides.includes('roleSync') ? 'overridden' : 'inherited'} 
                          />
                        )}
                        {server.settings.banSyncEnabled && (
                          <SG_InheritanceBadge 
                            status={server.settings.overrides.includes('banSync') ? 'overridden' : 'inherited'} 
                          />
                        )}
                        {server.settings.automodEnabled && (
                          <SG_InheritanceBadge 
                            status={server.settings.overrides.includes('automod') ? 'overridden' : 'inherited'} 
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(server.lastSeen).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(server)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveServer(server.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Server Detail Drawer */}
      {selectedServer && (
        <Dialog open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ServerIcon className="h-6 w-6 text-blue-600" />
                </div>
                {selectedServer.name}
              </DialogTitle>
              <DialogDescription>
                Server configuration and override settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Members:</span>
                      <span>{selectedServer.memberCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Roles:</span>
                      <span>{selectedServer.roleCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant={selectedServer.isOnline ? 'default' : 'secondary'}>
                        {selectedServer.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Feature Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Role Sync</span>
                      <div className="flex items-center gap-2">
                        <SG_InheritanceBadge 
                          status={selectedServer.settings.roleSyncEnabled 
                            ? (selectedServer.settings.overrides.includes('roleSync') ? 'overridden' : 'inherited')
                            : 'custom'
                          } 
                        />
                        <SG_ResetToDefault
                          itemName="Role Sync"
                          onReset={() => console.log('Reset role sync')}
                          variant="icon"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ban Sync</span>
                      <div className="flex items-center gap-2">
                        <SG_InheritanceBadge 
                          status={selectedServer.settings.banSyncEnabled 
                            ? (selectedServer.settings.overrides.includes('banSync') ? 'overridden' : 'inherited')
                            : 'custom'
                          } 
                        />
                        <SG_ResetToDefault
                          itemName="Ban Sync"
                          onReset={() => console.log('Reset ban sync')}
                          variant="icon"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Automod</span>
                      <div className="flex items-center gap-2">
                        <SG_InheritanceBadge 
                          status={selectedServer.settings.automodEnabled 
                            ? (selectedServer.settings.overrides.includes('automod') ? 'overridden' : 'inherited')
                            : 'custom'
                          } 
                        />
                        <SG_ResetToDefault
                          itemName="Automod"
                          onReset={() => console.log('Reset automod')}
                          variant="icon"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDrawerOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
