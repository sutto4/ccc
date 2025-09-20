"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Settings, 
  Crown, 
  AlertTriangle, 
  Trash2, 
  Save,
  Upload,
  Download,
  Shield,
  Users,
  Server
} from 'lucide-react';
import { ServerGroupDetail } from '@/lib/mock/use-server-group';
import { SG_PremiumGate } from '@/components/server-groups/SG_PremiumGate';
import { SG_LimitMeter } from '@/components/server-groups/SG_LimitMeter';

interface SettingsTabProps {
  group: ServerGroupDetail;
}

export function SettingsTab({ group }: SettingsTabProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [groupSettings, setGroupSettings] = useState({
    name: group.name,
    description: group.description || '',
    icon: '',
    notifications: true,
    autoSync: true,
    publicGroup: false
  });

  const handleSaveSettings = () => {
    // Mock save settings
    console.log('Saving settings:', groupSettings);
  };

  const handleDeleteGroup = () => {
    // Mock delete group
    console.log('Deleting group:', group.id);
    setIsDeleteDialogOpen(false);
  };

  const handleExportSettings = () => {
    // Mock export settings
    console.log('Exporting settings for group:', group.id);
  };

  const handleImportSettings = () => {
    // Mock import settings
    console.log('Importing settings for group:', group.id);
  };

  const premiumFeatures = [
    {
      name: 'Advanced Role Sync',
      description: 'Sync roles with custom permissions and hierarchies',
      current: group.premiumTier === 'premium' || group.premiumTier === 'enterprise'
    },
    {
      name: 'Ban Sync',
      description: 'Synchronize ban lists across all servers',
      current: group.premiumTier === 'premium' || group.premiumTier === 'enterprise'
    },
    {
      name: 'Automod Rules',
      description: 'Advanced automated moderation rules',
      current: group.premiumTier === 'premium' || group.premiumTier === 'enterprise'
    },
    {
      name: 'Cross-Server Announcements',
      description: 'Send announcements to multiple servers at once',
      current: group.premiumTier === 'premium' || group.premiumTier === 'enterprise'
    },
    {
      name: 'Advanced Analytics',
      description: 'Detailed analytics and reporting',
      current: group.premiumTier === 'premium' || group.premiumTier === 'enterprise'
    },
    {
      name: 'Custom Integrations',
      description: 'Integrate with external services and APIs',
      current: group.premiumTier === 'enterprise'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Group Profile */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Group Profile</h3>
          <p className="text-sm text-gray-600">
            Basic information about your server group
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={groupSettings.name}
                onChange={(e) => setGroupSettings(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter group name"
              />
            </div>
            <div>
              <Label htmlFor="group-icon">Group Icon</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="group-icon"
                  value={groupSettings.icon}
                  onChange={(e) => setGroupSettings(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="Icon URL or emoji"
                />
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={groupSettings.description}
              onChange={(e) => setGroupSettings(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your server group..."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="public-group">Public Group</Label>
              <p className="text-sm text-gray-600">
                Allow others to discover and request to join this group
              </p>
            </div>
            <Switch
              id="public-group"
              checked={groupSettings.publicGroup}
              onCheckedChange={(checked) => setGroupSettings(prev => ({ ...prev, publicGroup: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Usage Limits</h3>
          <p className="text-sm text-gray-600">
            Current usage and limits for your plan
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <SG_LimitMeter 
            current={group.serverCount} 
            limit={group.serverLimit} 
            type="servers" 
          />
          <SG_LimitMeter 
            current={group.automodRulesCount} 
            limit={group.premiumTier === 'enterprise' ? 100 : 20} 
            type="rules" 
          />
          <SG_LimitMeter 
            current={group.managers.length} 
            limit={group.premiumTier === 'enterprise' ? 50 : 10} 
            type="managers" 
          />
        </CardContent>
      </Card>

      {/* Premium Features */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Premium Features</h3>
              <p className="text-sm text-gray-600">
                Current plan: {group.premiumTier.charAt(0).toUpperCase() + group.premiumTier.slice(1)}
              </p>
            </div>
            <Badge variant={group.premiumTier === 'premium' ? 'default' : 'secondary'}>
              {group.premiumTier === 'premium' ? (
                <Crown className="h-3 w-3 mr-1" />
              ) : null}
              {group.premiumTier.charAt(0).toUpperCase() + group.premiumTier.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {premiumFeatures.map((feature) => (
              <div key={feature.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{feature.name}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {feature.current ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <Badge variant={feature.current ? 'default' : 'secondary'}>
                    {feature.current ? 'Available' : 'Upgrade Required'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {group.premiumTier === 'free' && (
            <div className="mt-6 text-center">
              <Button>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Notification Settings</h3>
          <p className="text-sm text-gray-600">
            Configure how you receive notifications about this group
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Email Notifications</Label>
              <p className="text-sm text-gray-600">
                Receive email updates about group activity
              </p>
            </div>
            <Switch
              id="notifications"
              checked={groupSettings.notifications}
              onCheckedChange={(checked) => setGroupSettings(prev => ({ ...prev, notifications: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-sync">Auto Sync</Label>
              <p className="text-sm text-gray-600">
                Automatically sync settings when changes are made
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={groupSettings.autoSync}
              onCheckedChange={(checked) => setGroupSettings(prev => ({ ...prev, autoSync: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Import & Export</h3>
          <p className="text-sm text-gray-600">
            Backup and restore your group settings
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleExportSettings}>
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <Button variant="outline" onClick={handleImportSettings}>
              <Upload className="h-4 w-4 mr-2" />
              Import Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
          <p className="text-sm text-gray-600">
            Irreversible and destructive actions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
            <div>
              <h4 className="font-medium text-red-800">Delete Server Group</h4>
              <p className="text-sm text-red-600">
                Permanently delete this server group and all its settings. This action cannot be undone.
              </p>
            </div>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Delete Server Group
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{group.name}"? This will permanently remove:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All group settings and configurations</li>
                      <li>All role templates and mappings</li>
                      <li>All automod rules and overrides</li>
                      <li>All ban sync settings and exceptions</li>
                      <li>All announcement templates</li>
                    </ul>
                    <strong className="text-red-600">This action cannot be undone.</strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteGroup}>
                    Yes, Delete Group
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" onClick={() => setGroupSettings({
          name: group.name,
          description: group.description || '',
          icon: '',
          notifications: true,
          autoSync: true,
          publicGroup: false
        })}>
          Reset
        </Button>
        <Button onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}


