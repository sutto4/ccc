"use client";

import { useState, useEffect } from 'react';

export interface ServerGroup {
  id: string;
  name: string;
  description: string | null;
  premiumTier: 'free' | 'premium' | 'enterprise';
  serverCount: number;
  serverLimit: number;
  roleSyncEnabled: boolean;
  banSyncEnabled: boolean;
  automodRulesCount: number;
  createdAt: string;
  updatedAt: string;
  servers: {
    id: string;
    name: string;
    memberCount: number;
    isOnline: boolean;
  }[];
}

// Mock data
const mockGroups: ServerGroup[] = [
  {
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
          { id: '1', name: 'Gaming Central', memberCount: 1250, isOnline: true },
          { id: '2', name: 'Esports Arena', memberCount: 890, isOnline: true },
          { id: '3', name: 'Casual Gaming', memberCount: 2100, isOnline: false },
          { id: '4', name: 'Competitive Hub', memberCount: 650, isOnline: true },
          { id: '5', name: 'Community Server', memberCount: 3200, isOnline: true },
          { id: '6', name: 'Tournament Central', memberCount: 480, isOnline: false },
          { id: '7', name: 'Newbie Friendly', memberCount: 1100, isOnline: true },
          { id: '8', name: 'Pro Players', memberCount: 320, isOnline: true },
          { id: '9', name: 'Moderator Hub', memberCount: 750, isOnline: true },
          { id: '10', name: 'VIP Lounge', memberCount: 180, isOnline: true }
        ]
  },
  {
    id: '2',
    name: 'Development Team',
    description: 'Servers for our development team collaboration',
    premiumTier: 'free',
    serverCount: 2,
    serverLimit: 3,
    roleSyncEnabled: false,
    banSyncEnabled: false,
    automodRulesCount: 0,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-18T16:45:00Z',
    servers: [
      { id: '4', name: 'Dev Team Alpha', memberCount: 45, isOnline: true },
      { id: '5', name: 'Code Review Hub', memberCount: 32, isOnline: true }
    ]
  },
  {
    id: '3',
    name: 'Content Creators',
    description: 'Servers for content creators and streamers',
    premiumTier: 'enterprise',
    serverCount: 8,
    serverLimit: 50,
    roleSyncEnabled: true,
    banSyncEnabled: true,
    automodRulesCount: 25,
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-01-22T11:20:00Z',
    servers: [
      { id: '6', name: 'Streamer Central', memberCount: 3200, isOnline: true },
      { id: '7', name: 'Creator Collab', memberCount: 1800, isOnline: true },
      { id: '8', name: 'Content Hub', memberCount: 950, isOnline: true },
      { id: '9', name: 'Stream Setup', memberCount: 420, isOnline: false },
      { id: '10', name: 'Creator Events', memberCount: 2100, isOnline: true },
      { id: '11', name: 'Content Review', memberCount: 680, isOnline: true },
      { id: '12', name: 'Stream Analytics', memberCount: 320, isOnline: true },
      { id: '13', name: 'Creator Support', memberCount: 1500, isOnline: false }
    ]
  }
];

export function useServerGroups() {
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setGroups(mockGroups);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const createGroup = async (data: { name: string; description: string | null }) => {
    const newGroup: ServerGroup = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      premiumTier: 'free',
      serverCount: 0,
      serverLimit: 3,
      roleSyncEnabled: false,
      banSyncEnabled: false,
      automodRulesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      servers: []
    };

    setGroups(prev => [newGroup, ...prev]);
    return newGroup;
  };

  const updateGroup = async (id: string, data: Partial<ServerGroup>) => {
    setGroups(prev => 
      prev.map(group => 
        group.id === id 
          ? { ...group, ...data, updatedAt: new Date().toISOString() }
          : group
      )
    );
  };

  const deleteGroup = async (id: string) => {
    setGroups(prev => prev.filter(group => group.id !== id));
  };

  return {
    groups,
    isLoading,
    createGroup,
    updateGroup,
    deleteGroup
  };
}


