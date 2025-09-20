"use client";

import { useState, useEffect } from 'react';
import { ServerGroup } from './use-server-groups';

export interface ServerGroupDetail extends ServerGroup {
  servers: Server[];
  roleTemplates: RoleTemplate[];
  banSyncSettings: BanSyncSettings;
  automodRules: AutomodRule[];
  announcements: Announcement[];
  managers: Manager[];
  analytics: Analytics;
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  roleCount: number;
  isOnline: boolean;
  lastSeen: string;
  settings: {
    roleSyncEnabled: boolean;
    banSyncEnabled: boolean;
    automodEnabled: boolean;
    overrides: string[];
  };
}

export interface RoleTemplate {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  position: number;
  isDefault: boolean;
  serverMappings: { [serverId: string]: string }; // serverId -> roleId
}

export interface BanSyncSettings {
  enabled: boolean;
  scope: 'all' | 'specific';
  schedule: string;
  exceptions: BanException[];
}

export interface BanException {
  id: string;
  userId: string;
  username: string;
  reason: string;
  addedBy: string;
  addedAt: string;
}

export interface AutomodRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  action: 'warn' | 'timeout' | 'kick' | 'ban';
  cooldown: number;
  enabled: boolean;
  conditions: string[];
  serverOverrides: { [serverId: string]: Partial<AutomodRule> };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  scheduledFor: string | null;
  status: 'draft' | 'scheduled' | 'sent';
  targets: { [serverId: string]: string }; // serverId -> channelId
  createdAt: string;
  sentAt: string | null;
}

export interface Manager {
  id: string;
  userId: string;
  username: string;
  role: 'owner' | 'admin' | 'moderator';
  permissions: string[];
  addedAt: string;
  addedBy: string;
}

export interface Analytics {
  totalMembers: number;
  activeMembers: number;
  moderationActions: number;
  roleSyncs: number;
  banSyncs: number;
  automodTriggers: number;
  announcementsSent: number;
  period: '7d' | '30d' | '90d';
}

// Mock detailed data
const mockGroupDetail: ServerGroupDetail = {
  id: '1',
  name: 'Gaming Community',
  description: 'Main gaming servers for our community',
  premiumTier: 'premium',
  serverCount: 3,
  serverLimit: 10,
  roleSyncEnabled: true,
  banSyncEnabled: true,
  automodRulesCount: 12,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-20T14:30:00Z',
  servers: [
    {
      id: 's1',
      name: 'Main Gaming Server',
      iconUrl: null,
      memberCount: 1250,
      roleCount: 15,
      isOnline: true,
      lastSeen: '2024-01-22T10:30:00Z',
      settings: {
        roleSyncEnabled: true,
        banSyncEnabled: true,
        automodEnabled: true,
        overrides: ['roleSync', 'automod']
      }
    },
    {
      id: 's2',
      name: 'Gaming Events',
      iconUrl: null,
      memberCount: 850,
      roleCount: 8,
      isOnline: true,
      lastSeen: '2024-01-22T09:15:00Z',
      settings: {
        roleSyncEnabled: true,
        banSyncEnabled: false,
        automodEnabled: true,
        overrides: ['banSync']
      }
    },
    {
      id: 's3',
      name: 'Community Lounge',
      iconUrl: null,
      memberCount: 2100,
      roleCount: 12,
      isOnline: false,
      lastSeen: '2024-01-21T18:45:00Z',
      settings: {
        roleSyncEnabled: false,
        banSyncEnabled: true,
        automodEnabled: false,
        overrides: ['roleSync', 'automod']
      }
    }
  ],
  roleTemplates: [
    {
      id: 'rt1',
      name: 'Admin',
      color: '#ff0000',
      permissions: ['ADMINISTRATOR'],
      position: 1,
      isDefault: true,
      serverMappings: {
        's1': 'role1',
        's2': 'role2',
        's3': 'role3'
      }
    },
    {
      id: 'rt2',
      name: 'Moderator',
      color: '#00ff00',
      permissions: ['MANAGE_MESSAGES', 'KICK_MEMBERS', 'BAN_MEMBERS'],
      position: 2,
      isDefault: true,
      serverMappings: {
        's1': 'role4',
        's2': 'role5',
        's3': 'role6'
      }
    }
  ],
  banSyncSettings: {
    enabled: true,
    scope: 'all',
    schedule: '0 */6 * * *', // Every 6 hours
    exceptions: [
      {
        id: 'be1',
        userId: '123456789',
        username: 'SpecialUser',
        reason: 'Trusted community member',
        addedBy: 'admin',
        addedAt: '2024-01-15T10:00:00Z'
      }
    ]
  },
  automodRules: [
    {
      id: 'ar1',
      name: 'Spam Protection',
      description: 'Prevents spam messages',
      severity: 'medium',
      action: 'timeout',
      cooldown: 300,
      enabled: true,
      conditions: ['repeated_messages', 'caps_lock'],
      serverOverrides: {
        's2': { action: 'warn' }
      }
    },
    {
      id: 'ar2',
      name: 'Profanity Filter',
      description: 'Filters inappropriate language',
      severity: 'low',
      action: 'warn',
      cooldown: 60,
      enabled: true,
      conditions: ['profanity'],
      serverOverrides: {}
    }
  ],
  announcements: [
    {
      id: 'a1',
      title: 'Weekly Gaming Tournament',
      content: 'Join us this Saturday for our weekly gaming tournament!',
      scheduledFor: '2024-01-27T19:00:00Z',
      status: 'scheduled',
      targets: {
        's1': 'channel1',
        's2': 'channel2'
      },
      createdAt: '2024-01-20T10:00:00Z',
      sentAt: null
    }
  ],
  managers: [
    {
      id: 'm1',
      userId: 'owner123',
      username: 'CommunityOwner',
      role: 'owner',
      permissions: ['*'],
      addedAt: '2024-01-15T10:00:00Z',
      addedBy: 'system'
    },
    {
      id: 'm2',
      userId: 'admin456',
      username: 'AdminUser',
      role: 'admin',
      permissions: ['manage_servers', 'manage_roles', 'manage_automod'],
      addedAt: '2024-01-16T14:30:00Z',
      addedBy: 'owner123'
    }
  ],
  analytics: {
    totalMembers: 4200,
    activeMembers: 3200,
    moderationActions: 45,
    roleSyncs: 12,
    banSyncs: 3,
    automodTriggers: 156,
    announcementsSent: 8,
    period: '7d'
  }
};

export function useServerGroup(groupId: string) {
  const [group, setGroup] = useState<ServerGroupDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      if (groupId === '1') {
        setGroup(mockGroupDetail);
      } else {
        setError('Group not found');
      }
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [groupId]);

  const updateGroup = async (data: Partial<ServerGroupDetail>) => {
    if (group) {
      setGroup(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const addServer = async (serverId: string) => {
    // Mock adding server
    console.log('Adding server:', serverId);
  };

  const removeServer = async (serverId: string) => {
    // Mock removing server
    console.log('Removing server:', serverId);
  };

  const updateRoleTemplate = async (templateId: string, data: Partial<RoleTemplate>) => {
    if (group) {
      setGroup(prev => {
        if (!prev) return null;
        return {
          ...prev,
          roleTemplates: prev.roleTemplates.map(template =>
            template.id === templateId ? { ...template, ...data } : template
          )
        };
      });
    }
  };

  const updateAutomodRule = async (ruleId: string, data: Partial<AutomodRule>) => {
    if (group) {
      setGroup(prev => {
        if (!prev) return null;
        return {
          ...prev,
          automodRules: prev.automodRules.map(rule =>
            rule.id === ruleId ? { ...rule, ...data } : rule
          )
        };
      });
    }
  };

  return {
    group,
    isLoading,
    error,
    updateGroup,
    addServer,
    removeServer,
    updateRoleTemplate,
    updateAutomodRule
  };
}


