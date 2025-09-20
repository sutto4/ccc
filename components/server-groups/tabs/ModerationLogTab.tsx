"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Search, 
  Filter,
  Download,
  Eye,
  Calendar
} from 'lucide-react';
import { ServerGroupDetail } from '@/lib/mock/use-server-group';

interface ModerationLogTabProps {
  group: ServerGroupDetail;
}

export function ModerationLogTab({ group }: ModerationLogTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterServer, setFilterServer] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  // Mock moderation log data
  const mockLogs = [
    {
      id: '1',
      timestamp: '2024-01-22T10:30:00Z',
      server: 'Main Gaming Server',
      action: 'ban',
      moderator: 'AdminUser',
      target: 'BadUser#1234',
      reason: 'Spam and harassment',
      details: 'User was banned for repeated spam messages and harassment'
    },
    {
      id: '2',
      timestamp: '2024-01-22T09:15:00Z',
      server: 'Gaming Events',
      action: 'timeout',
      moderator: 'ModUser',
      target: 'User#5678',
      reason: 'Inappropriate language',
      details: 'User was timed out for 10 minutes for using inappropriate language'
    },
    {
      id: '3',
      timestamp: '2024-01-22T08:45:00Z',
      server: 'Community Lounge',
      action: 'kick',
      moderator: 'AdminUser',
      target: 'SpamBot#9999',
      reason: 'Automated spam',
      details: 'Bot was kicked for automated spam behavior'
    }
  ];

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ban': return <Badge variant="destructive">Ban</Badge>;
      case 'kick': return <Badge variant="default">Kick</Badge>;
      case 'timeout': return <Badge variant="secondary">Timeout</Badge>;
      case 'warn': return <Badge variant="outline">Warn</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesServer = filterServer === 'all' || log.server === filterServer;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    
    return matchesSearch && matchesServer && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Moderation Log</h2>
          <p className="text-gray-600">View moderation actions across all servers in this group</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterServer} onValueChange={setFilterServer}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by server" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Servers</SelectItem>
                {group.servers.map(server => (
                  <SelectItem key={server.id} value={server.name}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="ban">Ban</SelectItem>
                <SelectItem value="kick">Kick</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Moderation Actions ({filteredLogs.length})
          </h3>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Moderator</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{log.server}</span>
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{log.moderator}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono">{log.target}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{log.reason}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


