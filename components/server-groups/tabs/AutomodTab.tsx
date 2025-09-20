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
  Bot, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import { ServerGroupDetail, AutomodRule } from '@/lib/mock/use-server-group';
import { SG_InheritanceBadge } from '@/components/server-groups/SG_InheritanceBadge';
import { SG_ResetToDefault } from '@/components/server-groups/SG_ResetToDefault';

interface AutomodTabProps {
  group: ServerGroupDetail;
}

export function AutomodTab({ group }: AutomodTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomodRule | null>(null);
  const [testInput, setTestInput] = useState('');
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high',
    action: 'warn' as 'warn' | 'timeout' | 'kick' | 'ban',
    cooldown: 60,
    conditions: [] as string[]
  });

  const handleCreateRule = () => {
    // Mock create rule
    console.log('Creating rule:', newRule);
    setNewRule({
      name: '',
      description: '',
      severity: 'medium',
      action: 'warn',
      cooldown: 60,
      conditions: []
    });
    setIsCreateDialogOpen(false);
  };

  const handleEditRule = (rule: AutomodRule) => {
    setEditingRule(rule);
  };

  const handleDeleteRule = (ruleId: string) => {
    // Mock delete rule
    console.log('Deleting rule:', ruleId);
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    // Mock toggle rule
    console.log('Toggle rule:', ruleId, enabled);
  };

  const handleTestRule = (rule: AutomodRule) => {
    // Mock test rule
    console.log('Testing rule:', rule.id, 'with input:', testInput);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'warn': return 'text-blue-600 bg-blue-100';
      case 'timeout': return 'text-orange-600 bg-orange-100';
      case 'kick': return 'text-red-600 bg-red-100';
      case 'ban': return 'text-red-700 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const availableConditions = [
    'repeated_messages',
    'caps_lock',
    'profanity',
    'spam_links',
    'mention_spam',
    'emoji_spam',
    'external_links',
    'invite_links'
  ];

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{group.automodRules.length}</div>
                <div className="text-sm text-gray-600">Total Rules</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {group.automodRules.filter(r => r.enabled).length}
                </div>
                <div className="text-sm text-gray-600">Active Rules</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{group.analytics.automodTriggers}</div>
                <div className="text-sm text-gray-600">Triggers This Week</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {group.servers.filter(s => s.settings.automodEnabled).length}
                </div>
                <div className="text-sm text-gray-600">Active Servers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Rules Library</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Automod Rule</DialogTitle>
                  <DialogDescription>
                    Create a new automated moderation rule that can be applied across servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rule-name">Rule Name</Label>
                      <Input
                        id="rule-name"
                        value={newRule.name}
                        onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter rule name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rule-severity">Severity</Label>
                      <Select 
                        value={newRule.severity}
                        onValueChange={(value: 'low' | 'medium' | 'high') => 
                          setNewRule(prev => ({ ...prev, severity: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="rule-description">Description</Label>
                    <Textarea
                      id="rule-description"
                      value={newRule.description}
                      onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this rule does"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rule-action">Action</Label>
                      <Select 
                        value={newRule.action}
                        onValueChange={(value: 'warn' | 'timeout' | 'kick' | 'ban') => 
                          setNewRule(prev => ({ ...prev, action: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warn">Warn</SelectItem>
                          <SelectItem value="timeout">Timeout</SelectItem>
                          <SelectItem value="kick">Kick</SelectItem>
                          <SelectItem value="ban">Ban</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="rule-cooldown">Cooldown (seconds)</Label>
                      <Input
                        id="rule-cooldown"
                        type="number"
                        value={newRule.cooldown}
                        onChange={(e) => setNewRule(prev => ({ ...prev, cooldown: parseInt(e.target.value) || 0 }))}
                        placeholder="60"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Conditions</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableConditions.map((condition) => (
                        <label key={condition} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newRule.conditions.includes(condition)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewRule(prev => ({
                                  ...prev,
                                  conditions: [...prev.conditions, condition]
                                }));
                              } else {
                                setNewRule(prev => ({
                                  ...prev,
                                  conditions: prev.conditions.filter(c => c !== condition)
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm capitalize">
                            {condition.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRule} disabled={!newRule.name || newRule.conditions.length === 0}>
                    Create Rule
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
                <TableHead>Rule</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Servers</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.automodRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-gray-500">{rule.description}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {rule.conditions.length} conditions • {rule.cooldown}s cooldown
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(rule.severity)}>
                      {rule.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionColor(rule.action)}>
                      {rule.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      />
                      <span className="text-sm">
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {group.servers.map((server) => {
                        const hasOverride = Object.keys(rule.serverOverrides).includes(server.id);
                        const isEnabled = server.settings.automodEnabled;
                        
                        if (!isEnabled) return null;
                        
                        return (
                          <SG_InheritanceBadge
                            key={server.id}
                            status={hasOverride ? 'overridden' : 'inherited'}
                          />
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestRule(rule)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
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

      {/* Test Input */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Test Rules</h3>
          <p className="text-sm text-gray-600">
            Test how rules would respond to different messages
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-input">Test Message</Label>
              <Textarea
                id="test-input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter a message to test against all rules..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => console.log('Test all rules with:', testInput)}>
                <Play className="h-4 w-4 mr-2" />
                Test All Rules
              </Button>
              <Button variant="outline" onClick={() => setTestInput('')}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Overrides */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Server Overrides</h3>
          <p className="text-sm text-gray-600">
            Manage rule overrides for specific servers
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {group.automodRules.map((rule) => (
              <div key={rule.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">{rule.name}</h4>
                  <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Server</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Override</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.servers.map((server) => {
                      const hasOverride = Object.keys(rule.serverOverrides).includes(server.id);
                      const isEnabled = server.settings.automodEnabled;
                      
                      return (
                        <TableRow key={server.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                <Bot className="h-4 w-4 text-blue-600" />
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
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm">
                                {isEnabled ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <SG_InheritanceBadge 
                              status={hasOverride ? 'overridden' : 'inherited'} 
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => console.log('Configure override for:', server.id, rule.id)}
                                disabled={!isEnabled}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              {hasOverride && (
                                <SG_ResetToDefault
                                  itemName={`${rule.name} override`}
                                  onReset={() => console.log('Reset override')}
                                  variant="icon"
                                />
                              )}
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


