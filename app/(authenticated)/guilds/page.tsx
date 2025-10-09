'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Shield, Star, StarOff, Settings, ExternalLink, Copy, 
  ChevronRight, ChevronDown, Check, X, Clock, Users, Crown,
  TrendingUp, TrendingDown, Minus, Activity, AlertCircle, CheckCircle,
  ChevronLeft, Folder, FolderOpen, Plus, FolderPlus, GripVertical,
  MessageSquare, UserCheck, Brain, Search, SlidersHorizontal, Mail,
  Palette, Bot, RefreshCw, TrendingUpIcon, Code, Radio, Tv, Zap, Lock
} from "lucide-react";
import { AuthErrorBoundary } from "@/components/auth-error-boundary";
import { useE2ETrackingContext } from '@/components/e2e-tracking-provider';
import type { Guild } from "@/lib/api";
import { useGuildsQuery } from "@/hooks/use-guilds-query";
import { Button } from "@/components/ui/button";
// Input removed from header search
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { fetchWebAppFeatures, updateWebAppFeatures } from "@/lib/api";

export default function GuildsPage() {
  return (
    <AuthErrorBoundary>
      <GuildsPageContent />
    </AuthErrorBoundary>
  );
}

function GuildsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Get selected server from URL
  const selectedServerId = searchParams?.get('server');
  
  // Fetch guilds with React Query
  const guildsQuery = useGuildsQuery();
  const { data: guildsData = [], isLoading: loading, error, isError } = guildsQuery;
  const guilds: Guild[] = guildsData as Guild[];
  
  // Force refetch on mount to get latest owner data
  useEffect(() => {
    guildsQuery.refetch().then(() => {
      console.log('[GUILDS-PAGE] Guilds after refetch:', guildsQuery.data);
      console.log('[GUILDS-PAGE] Sample guild:', guildsQuery.data?.[0]);
    });
  }, []);
  
  // Local state
  // Search removed for now
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(selectedServerId);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [collapsedFolderOpenIds, setCollapsedFolderOpenIds] = useState<Set<string>>(new Set());
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; guild: Guild | null }>({ open: false, x: 0, y: 0, guild: null });
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  // Ordering (short-term localStorage)
  const [orders, setOrders] = useState<{ favorites: string[]; groups: Record<string, string[]> }>({ favorites: [], groups: {} });
  // Drag preview state
  const [dragGuildId, setDragGuildId] = useState<string | null>(null);
  const [hoverContainerKey, setHoverContainerKey] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const draggedGuild = useMemo(() => guilds.find(g => g.id === dragGuildId) || null, [guilds, dragGuildId]);
  
  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('favoriteServers');
    if (stored) {
      try {
        setFavorites(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
    const collapsedStored = localStorage.getItem('guildsSidebarCollapsed');
    if (collapsedStored) {
      setIsSidebarCollapsed(collapsedStored === 'true');
    }
    // Load ordering
    try {
      const o = localStorage.getItem('serverListOrders');
      if (o) setOrders(JSON.parse(o));
    } catch {}
    const onGuildContext = (e: any) => {
      const { x, y, guild } = e.detail || {};
      if (x != null && y != null && guild) setContextMenu({ open: true, x, y, guild });
    };
    window.addEventListener('guild-context', onGuildContext as EventListener);
    const onDragStartEv = (e: any) => setDragGuildId(e.detail?.id || null);
    const onDragEndEv = () => { setDragGuildId(null); clearHover(); };
    window.addEventListener('guild-drag-start', onDragStartEv as EventListener);
    window.addEventListener('guild-drag-end', onDragEndEv as EventListener);
    return () => window.removeEventListener('guild-context', onGuildContext as EventListener);
  }, []);

  // Close context menu on click/escape
  useEffect(() => {
    const onGlobalClick = () => setContextMenu(prev => ({ ...prev, open: false }));
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(prev => ({ ...prev, open: false })); };
    window.addEventListener('click', onGlobalClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('click', onGlobalClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);
  
  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    localStorage.setItem('favoriteServers', JSON.stringify(Array.from(newFavorites)));
    setFavorites(newFavorites);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('guildsSidebarCollapsed', String(next));
      return next;
    });
  }, []);

  const toggleCollapsedFolder = useCallback((folderId: string) => {
    setCollapsedFolderOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  }, []);
  
  // Toggle favorite
  const toggleFavorite = useCallback((guildId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(guildId)) {
      newFavorites.delete(guildId);
    } else {
      newFavorites.add(guildId);
    }
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);
  
  // Filter and group guilds with memoization
  const { favoriteGuilds, groupedGuilds, filteredCount } = useMemo(() => {
    // No search filtering; use all guilds
    const filtered = guilds;
    
    // Separate favorites
    let favs = filtered.filter(g => favorites.has(g.id));
    if (orders.favorites?.length) {
      const pos: Record<string, number> = Object.fromEntries(orders.favorites.map((id, i) => [id, i]));
      favs = [...favs].sort((a, b) => (pos[a.id] ?? 1e9) - (pos[b.id] ?? 1e9));
    }
    
    // Group non-favorites
    const groups: Record<string, { group: any; guilds: Guild[] }> = {};
    filtered.forEach((guild) => {
      if (favorites.has(guild.id)) return; // Skip favorites

      const groupKey = guild.group?.id ? `group_${guild.group.id}` : 'ungrouped';
      if (!groups[groupKey]) {
        groups[groupKey] = {
          group: guild.group || { id: null, name: 'Individual Servers', description: null },
          guilds: []
        };
      }
      groups[groupKey].guilds.push(guild);
    });

    const result = Object.values(groups);
    result.sort((a, b) => {
      if (!a.group?.id && b.group?.id) return 1;
      if (a.group?.id && !b.group?.id) return -1;
      return (a.group?.name || '').localeCompare(b.group?.name || '');
    });
    // Apply per-group ordering
    result.forEach(section => {
      const key = section.group?.id ? `group_${section.group.id}` : 'ungrouped';
      const arr = orders.groups?.[key];
      if (arr && arr.length) {
        const pos: Record<string, number> = Object.fromEntries(arr.map((id, i) => [id, i]));
        section.guilds = [...section.guilds].sort((a, b) => (pos[a.id] ?? 1e9) - (pos[b.id] ?? 1e9));
      }
    });
    
    return { favoriteGuilds: favs, groupedGuilds: result, filteredCount: filtered.length };
  }, [guilds, favorites, searchQuery, orders]);

  const persistOrders = useCallback((next: { favorites: string[]; groups: Record<string, string[]> }) => {
    setOrders(next);
    try { localStorage.setItem('serverListOrders', JSON.stringify(next)); } catch {}
  }, []);

  const reorderInContainer = useCallback((containerKey: string, ids: string[], draggedId: string, targetIndex: number) => {
    const current = [...ids];
    const fromIndex = current.indexOf(draggedId);
    if (fromIndex === -1) current.push(draggedId); else current.splice(fromIndex, 1);
    const clamped = Math.max(0, Math.min(targetIndex, current.length));
    current.splice(clamped, 0, draggedId);
    const next = { ...orders, groups: { ...orders.groups, [containerKey]: current } };
    persistOrders(next);
  }, [orders, persistOrders]);

  const clearHover = useCallback(() => {
    setHoverContainerKey(null);
    setHoverIndex(null);
  }, []);
  
  // Auto-select first server if none selected
  useEffect(() => {
    if (!selectedGuildId && guilds.length > 0) {
      const firstGuild = favoriteGuilds[0] || guilds[0];
      if (firstGuild) {
        setSelectedGuildId(firstGuild.id);
        router.replace(`/guilds?server=${firstGuild.id}`, { scroll: false });
      }
    }
  }, [guilds, favoriteGuilds, selectedGuildId, router]);
  
  // Update URL when selection changes
  const selectGuild = useCallback((guildId: string) => {
    setSelectedGuildId(guildId);
    router.replace(`/guilds?server=${guildId}`, { scroll: false });
    setMobileShowDetail(true); // Show detail panel on mobile
  }, [router]);

  const openContextMenu = useCallback((e: React.MouseEvent, guild: Guild) => {
    e.preventDefault();
    setContextMenu({ open: true, x: e.clientX, y: e.clientY, guild });
  }, []);

  const handleCreateGroup = useCallback(() => {
    setContextMenu(prev => ({ ...prev, open: false }));
    setNewGroupName('');
    setShowCreateGroup(true);
  }, []);

  const confirmCreateGroup = useCallback(() => {
    setShowCreateGroup(false);
    toast({ title: 'Group created', description: `Created group "${newGroupName || 'New Group'}"` });
  }, [newGroupName, toast]);

  const openSettings = useCallback(() => {
    if (contextMenu.guild?.id) {
      router.push(`/guilds/${contextMenu.guild.id}/settings`);
    }
  }, [contextMenu.guild, router]);

  const openDiscord = useCallback(() => {
    if (contextMenu.guild?.id) {
      window.open(`https://discord.com/channels/${contextMenu.guild.id}`, '_blank');
    }
  }, [contextMenu.guild]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Skip if typing in search
      
      const allGuilds = [...favoriteGuilds, ...groupedGuilds.flatMap(g => g.guilds)];
      const currentIndex = allGuilds.findIndex(g => g.id === selectedGuildId);
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIndex = e.key === 'ArrowDown' 
          ? Math.min(currentIndex + 1, allGuilds.length - 1)
          : Math.max(currentIndex - 1, 0);
        if (allGuilds[nextIndex]) {
          selectGuild(allGuilds[nextIndex].id);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGuildId, favoriteGuilds, groupedGuilds, selectGuild]);
  
  // Get selected guild details
  const selectedGuild = useMemo(() => 
    guilds.find(g => g.id === selectedGuildId),
    [guilds, selectedGuildId]
  );
  
  // Check if it's an authentication error
  const isAuthError = isError && error?.message?.includes('Authentication expired');
  
  // Copy server ID
  const copyServerId = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast({ title: "Copied!", description: "Server ID copied to clipboard" });
  }, [toast]);
  
  // Toggle group collapse
  const toggleGroup = useCallback((groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedGroups(newCollapsed);
  }, [collapsedGroups]);

  if (loading) {
    return <LoadingState />;
  }

  if (isAuthError) {
    return <AuthErrorState />;
  }

  if (isError && !isAuthError) {
    return <ErrorState />;
  }

  if (guilds.length === 0) {
    return <EmptyState />;
  }

    return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* Left Panel - Server List */}
      <div className={`
        w-full ${isSidebarCollapsed ? 'md:w-[88px]' : 'md:w-[480px]'} border-r border-gray-200 bg-white flex flex-col
        ${mobileShowDetail ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header (hidden in collapsed mode to remove top gap and line) */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between group">
              <h1 className="text-xl font-bold text-gray-900">My Servers</h1>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900" onClick={() => console.log('Create server group clicked')}>
                  <FolderPlus className="h-4 w-4 mr-1" /> New group
                </Button>
            </div>
          </div>
            <div className="mt-1 text-xs text-gray-500">
              {filteredCount} server{filteredCount !== 1 ? 's' : ''} total
      </div>
          </div>
        )}

        {/* end sidebar header */}

        {/* Server List */}
        <div className="flex-1 overflow-y-auto">
          {isSidebarCollapsed ? (
            <div className="px-0 pb-2 pt-2">
              <div className="flex flex-col items-center gap-2">
                {/* Favorites first */}
                {favoriteGuilds.map((guild) => (
                  <CollapsedServerIcon
                    key={`fav_${guild.id}`}
                    guild={guild}
                    isSelected={guild.id === selectedGuildId}
                    onSelect={() => selectGuild(guild.id)}
                  />
                ))}
                {/* Grouped folders */}
                {groupedGuilds.map((groupData) => {
                  const hasGroup = !!groupData.group?.id;
                  const groupKey = hasGroup ? `group_${groupData.group.id}` : 'ungrouped';
                  if (!hasGroup) {
    return (
                      <div key={groupKey} className="flex flex-col items-center gap-3">
                        {groupData.guilds.map((guild) => (
                          <CollapsedServerIcon
                            key={guild.id}
                            guild={guild}
                            isSelected={guild.id === selectedGuildId}
                            onSelect={() => selectGuild(guild.id)}
                          />
                        ))}
            </div>
    );
  }
                  const isOpen = collapsedFolderOpenIds.has(groupKey);
    return (
                    <div key={groupKey} className={`flex flex-col items-center gap-2 ${isOpen ? 'bg-gray-100/80 rounded-lg py-2 px-2' : ''}`}>
            <button
                        onClick={() => toggleCollapsedFolder(groupKey)}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-colors ${isOpen ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        title={groupData.group?.name || 'Server Group'}
            >
                        <CollapsedGroupFolder guilds={groupData.guilds} />
            </button>
                      {isOpen && (
                        <div className="flex flex-col items-center gap-3">
                          {groupData.guilds.map((guild) => (
                            <CollapsedServerIcon
                              key={guild.id}
                              guild={guild}
                              isSelected={guild.id === selectedGuildId}
                              onSelect={() => selectGuild(guild.id)}
                            />
                          ))}
          </div>
                      )}
      </div>
    );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Favorites Section */}
              {favoriteGuilds.length > 0 && (
                <div className="border-b border-gray-200">
                  <div className="px-4 py-2 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-semibold text-gray-700 uppercase">
                        Favorites ({favoriteGuilds.length})
                      </span>
                    </div>
                  </div>
                  <div>
                    {favoriteGuilds.map((guild) => (
                      <ServerListItem
                        key={guild.id}
                        guild={guild}
                        isSelected={guild.id === selectedGuildId}
                        isFavorite={true}
                        onSelect={() => selectGuild(guild.id)}
                        onToggleFavorite={(e) => toggleFavorite(guild.id, e)}
                        onCopyId={(e) => copyServerId(guild.id, e)}
                        dragActiveId={dragGuildId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Grouped Servers */}
              {groupedGuilds.map((groupData) => {
                const groupKey = groupData.group?.id ? `group_${groupData.group.id}` : 'ungrouped';
                const isCollapsed = collapsedGroups.has(groupKey);
                
    return (
                  <div key={groupKey} className="border-b border-gray-200">
              <button
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-xs font-semibold text-gray-700 uppercase">
                          {groupData.group?.name || 'Individual Servers'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({groupData.guilds.length})
                        </span>
                      </div>
              </button>
                    {!isCollapsed && (
                  <div
                    onDragOver={(e) => {
                      // Allow dropping inside the list but don't force end-of-list marker
                      e.preventDefault();
                      setHoverContainerKey(groupKey);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData('text/plain');
                      const containerKey = groupKey;
                      const currentIds = groupData.guilds.map(g => g.id);
                      // If no hover index calculated (e.g., dropped in empty space), append to end
                      const target = (hoverContainerKey === groupKey && hoverIndex != null) ? hoverIndex : currentIds.length;
                      reorderInContainer(containerKey, currentIds, draggedId, target);
                      clearHover();
                    }}
                  >
                    {groupData.guilds.map((guild) => (
                      <div
                        key={guild.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setHoverContainerKey(groupKey);
                          const idx = groupData.guilds.findIndex(g => g.id === guild.id);
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          const before = (e.clientY - rect.top) < rect.height / 2;
                          setHoverIndex(before ? idx : idx + 1);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedId = e.dataTransfer.getData('text/plain');
                          const containerKey = groupKey;
                          const currentIds = groupData.guilds.map(g => g.id);
                          reorderInContainer(containerKey, currentIds, draggedId, hoverIndex ?? currentIds.length);
                          clearHover();
                        }}
                      >
                        {/* Inline ghost/move preview */}
                        <ServerListItem
                          guild={guild}
                          isSelected={guild.id === selectedGuildId}
                          isFavorite={favorites.has(guild.id)}
                          onSelect={() => selectGuild(guild.id)}
                          onToggleFavorite={(e) => toggleFavorite(guild.id, e)}
                          onCopyId={(e) => copyServerId(guild.id, e)}
                          dragActiveId={dragGuildId}
                        />
                        {/* Insertion marker and spacer to indicate exact drop position */}
                        {dragGuildId && hoverContainerKey === groupKey && hoverIndex != null && (
                          <>
                            {hoverIndex === groupData.guilds.findIndex(g => g.id === guild.id) && (
                              <div className="h-2 my-0.5 mx-3 bg-blue-100 rounded" />
                            )}
                            {hoverIndex === (groupData.guilds.findIndex(g => g.id === guild.id) + 1) && (
                              <div className="h-2 my-0.5 mx-3 bg-blue-100 rounded" />
                            )}
                          </>
                        )}
            </div>
                        ))}
          </div>
                    )}
      </div>
    );
              })}
            </>
          )}
            </div>
      </div>

    {/* Center gutter toggle (slightly smaller, overlapping separator) */}
      <div className="hidden md:flex w-4 items-center justify-center">
              <button
          onClick={toggleSidebarCollapsed}
          className="flex items-center justify-center w-5 h-12 -ml-2 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow hover:bg-white transition-colors"
          title={isSidebarCollapsed ? 'Expand' : 'Collapse'}
          aria-label={isSidebarCollapsed ? 'Expand server list' : 'Collapse server list'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-700" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-700" />
          )}
              </button>
            </div>

      {/* Right Panel - Server Details */}
      <div className={`
        flex-1 overflow-y-auto
        ${!mobileShowDetail ? 'hidden md:block' : 'block'}
      `}>
        {selectedGuild ? (
          <ServerDetailPanel 
            guild={selectedGuild} 
            onBack={() => setMobileShowDetail(false)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-600">Select a server</h2>
              <p className="text-gray-400 mt-2">Choose a server from the list to view details</p>
          </div>
          </div>
        )}
      </div>
      {/* Context Menu */}
      {contextMenu.open && (
        <div
          className="fixed z-50 min-w-[180px] rounded-md border border-gray-200 bg-white shadow-lg py-1"
          style={{ top: contextMenu.y + 2, left: contextMenu.x + 2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" onClick={handleCreateGroup}>
            <FolderPlus className="h-4 w-4" /> Create new group
          </button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" onClick={openSettings}>
            <Settings className="h-4 w-4" /> Settings
              </button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" onClick={openDiscord}>
            <ExternalLink className="h-4 w-4" /> Open Discord
              </button>
            </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreateGroup(false)} />
          <div className="relative bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-sm p-4">
            <h3 className="text-sm font-semibold mb-2">Create new group</h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateGroup(false)}>Cancel</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmCreateGroup}>Create</Button>
          </div>
          </div>
        </div>
      )}
      </div>
    );
  }

// Server List Item Component (Memoized for performance)
const CollapsedServerIcon = ({
  guild,
  isSelected,
  onSelect
}: {
  guild: Guild;
  isSelected: boolean;
  onSelect: () => void;
}) => {
    return (
              <button
      onClick={onSelect}
      className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
      }`}
      title={guild.name || 'Server'}
    >
                          {guild.iconUrl ? (
                            <Image
                              src={guild.iconUrl}
                              alt={guild.name || 'Server'}
                              width={40}
                              height={40}
                              className="rounded-lg"
                              unoptimized={true}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">
                                {guild.name ? guild.name.charAt(0).toUpperCase() : '?'}
                              </span>
                            </div>
                          )}
              </button>
  );
};

const CollapsedGroupFolder = ({ guilds }: { guilds: Guild[] }) => {
  const previews = guilds.slice(0, 4);
  return (
    <div className="relative w-12 h-12 rounded-xl overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
        {previews.map((g) => (
          g.iconUrl ? (
            <Image
              key={g.id}
              src={g.iconUrl}
              alt={g.name || 'Server'}
              width={24}
              height={24}
              className="rounded-md object-cover w-full h-full"
              unoptimized={true}
            />
          ) : (
            <div key={g.id} className="rounded-md bg-blue-100 flex items-center justify-center text-center text-[10px]">
              <span className="font-bold text-blue-600 leading-none">
                {g.name ? g.name.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

const ServerListItem = React.memo(({ 
  guild, 
  isSelected, 
  isFavorite, 
  onSelect, 
  onToggleFavorite,
  onCopyId,
  dragActiveId
}: {
  guild: Guild;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onCopyId: (e: React.MouseEvent) => void;
  dragActiveId?: string | null;
}) => {
  return (
    <div
      onClick={onSelect}
      onContextMenu={(e) => {
        // Proxy to parent handler via CustomEvent
        e.preventDefault();
        const event = new CustomEvent('guild-context', { detail: { x: e.clientX, y: e.clientY, guild } });
        window.dispatchEvent(event);
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', guild.id);
        e.dataTransfer.effectAllowed = 'move';
        const ev = new CustomEvent('guild-drag-start', { detail: { id: guild.id } });
        window.dispatchEvent(ev);
      }}
      onDragEnd={() => {
        const ev = new CustomEvent('guild-drag-end');
        window.dispatchEvent(ev);
      }}
      className={`
        px-4 py-3 cursor-pointer transition-colors border-l-4 relative
        ${isSelected 
          ? 'bg-blue-50 border-blue-500' 
          : 'border-transparent hover:bg-gray-50'
        }
        ${dragActiveId === guild.id ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-gray-300" />
        {/* Server Icon */}
        {guild.iconUrl ? (
          <Image
            src={guild.iconUrl}
            alt={guild.name || 'Server'}
            width={40}
            height={40}
            className="rounded-lg flex-shrink-0"
            unoptimized={true}
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-blue-600">
              {guild.name ? guild.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
        )}
        
        {/* Server Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">
                              {guild.name || 'Unknown Server'}
                            </h4>
            {guild.premium && <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-500">
            {guild.memberCount || 0} members
                            </p>
                          </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
              <button
            onClick={onToggleFavorite}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4 text-gray-400" />
            )}
              </button>
            </div>
          </div>
      
      {/* Status Indicator removed to prevent blue dot on right */}
      </div>
    );
});

ServerListItem.displayName = 'ServerListItem';

// Server Detail Panel Component
// Feature icon mapping
const FEATURE_ICONS: Record<string, any> = {
  embedded_messages: Mail,
  moderation: Shield,
  reaction_roles: Radio,
  feedback_system: MessageSquare,
  verification_system: UserCheck,
  ai_summarization: Brain,
  creator_alerts: Tv,
  ban_sync: RefreshCw,
  bot_customisation: Palette,
  custom_commands: Code,
  custom_prefix: Zap,
  custom_groups: Users,
  utilities: Settings,
  fdg_donator_sync: Crown,
  fivem_esx: Code,
  fivem_qbcore: Code,
};

// Users Panel Loader
function UsersPanelLoader({ guildId }: { guildId: string }) {
  const [MembersPanel, setMembersPanel] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPanel = async () => {
      try {
        const { default: Panel } = await import('@/components/members-panel');
        setMembersPanel(() => Panel);
      } catch (error) {
        console.error('Failed to load members panel:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPanel();
  }, []);

  if (loading) {
  return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading members...</p>
              </div>
    );
  }

  if (!MembersPanel) return null;
  return <MembersPanel guildId={guildId} />;
}

// Roles Panel Loader
function RolesPanelLoader({ guildId }: { guildId: string }) {
  const [RolesPanel, setRolesPanel] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPanel = async () => {
      try {
        const { default: Panel } = await import('@/components/roles-panel');
        setRolesPanel(() => Panel);
      } catch (error) {
        console.error('Failed to load roles panel:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPanel();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading roles...</p>
      </div>
    );
  }

  if (!RolesPanel) return null;
  return <RolesPanel guildId={guildId} />;
}

// Commands Panel Component
function CommandsPanel({ guildId }: { guildId: string }) {
  const [commands, setCommands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { toast } = useToast();

  // Command category icons and colors
  const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
    moderation: { icon: Shield, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Moderation' },
    messages: { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Messages' },
    utilities: { icon: Settings, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Utilities' },
    verification: { icon: UserCheck, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Verification' },
    other: { icon: Code, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Other' },
  };

  // Load commands
  useEffect(() => {
    const loadCommands = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/guilds/${guildId}/commands`);
        if (response.ok) {
          const data = await response.json();
          setCommands(data.commands || []);
        } else {
          toast({
            title: 'Failed to load commands',
            description: 'Unable to fetch command list',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error loading commands:', error);
        toast({
          title: 'Error',
          description: 'Failed to load commands',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadCommands();
  }, [guildId, toast]);

  // Toggle command
  const toggleCommand = async (commandName: string, enabled: boolean) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/guilds/${guildId}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [{ command_name: commandName, enabled }]
        }),
      });

      if (response.ok) {
        setCommands(prev => prev.map(cmd => 
          cmd.name === commandName ? { ...cmd, enabled } : cmd
        ));
        toast({
          title: enabled ? 'Command Enabled' : 'Command Disabled',
          description: `/${commandName} has been ${enabled ? 'enabled' : 'disabled'}`,
        });
      } else {
        throw new Error('Failed to update command');
      }
    } catch (error) {
      console.error('Error toggling command:', error);
      toast({
        title: 'Error',
        description: 'Failed to update command status',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter commands
  const filteredCommands = commands.filter(cmd => {
    const matchesSearch = !searchQuery || 
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || cmd.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc: Record<string, any[]>, cmd) => {
    const cat = cmd.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cmd);
    return acc;
  }, {});

  // Sort categories
  const sortedCategories = Object.keys(groupedCommands).sort();

  // Get category stats
  const categories = Array.from(new Set(commands.map(c => c.category || 'other')));
  const enabledCount = commands.filter(c => c.enabled).length;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading commands...</p>
      </div>
    );
  }

  return (
        <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Commands</h2>
          <p className="text-sm text-gray-500 mt-1">
            {enabledCount} of {commands.length} commands enabled
                </p>
              </div>
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{commands.length} total</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Categories ({commands.length})</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {CATEGORY_CONFIG[cat]?.label || cat} ({commands.filter(c => (c.category || 'other') === cat).length})
            </option>
          ))}
        </select>
      </div>

      {/* Commands List */}
      {filteredCommands.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <Code className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No commands found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(category => {
            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
            const CategoryIcon = config.icon;
            const cmds = groupedCommands[category];

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                    <CategoryIcon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {config.label} ({cmds.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cmds.map(cmd => (
                    <div
                      key={cmd.name}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono font-semibold text-gray-900">
                              /{cmd.name}
                            </code>
                            {cmd.enabled && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{cmd.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-3">
                          <input
                            type="checkbox"
                            checked={cmd.enabled}
                            onChange={(e) => toggleCommand(cmd.name, e.target.checked)}
                            disabled={saving}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServerDetailPanel({ guild, onBack }: { guild: Guild; onBack?: () => void }) {
  const [features, setFeatures] = useState<any>(null);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'users' | 'roles' | 'commands'>('overview');
  const [saving, setSaving] = useState(false);
  const [selectedFeaturePage, setSelectedFeaturePage] = useState<string | null>(null);
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureFilter, setFeatureFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [featureSort, setFeatureSort] = useState<'name' | 'status'>('name');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsPerPage = 10;
  const [ownerName, setOwnerName] = useState<string | null>(null);
  
  // Fetch features for this guild
  useEffect(() => {
    let mounted = true;
    
    const loadFeatures = async () => {
      setLoadingFeatures(true);
      try {
        const data = await fetchWebAppFeatures(guild.id);
        if (mounted) {
          setFeatures(data);
        }
      } catch (error) {
        console.error('Failed to load features:', error);
        if (mounted) {
          setFeatures(null);
        }
      } finally {
        if (mounted) {
          setLoadingFeatures(false);
        }
      }
    };
    
    loadFeatures();
    
    return () => {
      mounted = false;
    };
  }, [guild.id]);

  // Fetch activity logs for overview
  useEffect(() => {
    if (activeTab !== 'overview') return;
    
    let mounted = true;
    
    const loadLogs = async () => {
      setLoadingLogs(true);
      try {
        const offset = (logsPage - 1) * logsPerPage;
        const response = await fetch(`/api/guilds/${guild.id}/activity-logs?limit=${logsPerPage}&offset=${offset}`);
        if (response.ok && mounted) {
          const data = await response.json();
          setActivityLogs(data.logs || []);
          setLogsTotal(data.total || 0);
        }
      } catch (error) {
        console.error('Failed to load activity logs:', error);
      } finally {
        if (mounted) {
          setLoadingLogs(false);
        }
      }
    };
    
    loadLogs();
    
    return () => {
      mounted = false;
    };
  }, [guild.id, activeTab, logsPage]);

  // Fetch owner name
  useEffect(() => {
    console.log('[SERVER-DETAIL] Guild data:', { 
      ownerId: guild.ownerId, 
      joinedAt: guild.joinedAt,
      guild 
    });
    
    if (!guild.ownerId) {
      console.log('[SERVER-DETAIL] No ownerId found, cannot fetch owner name');
      return;
    }
    
    const fetchOwnerName = async () => {
      try {
        console.log('[SERVER-DETAIL] Fetching owner name for:', guild.ownerId);
        const response = await fetch(`/api/discord/user/${guild.ownerId}`);
        console.log('[SERVER-DETAIL] Owner API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[SERVER-DETAIL] Owner data:', data);
          // Only set name if it's different from the ID (means it was actually fetched)
          const fetchedName = data.username || data.name || null;
          if (fetchedName && fetchedName !== guild.ownerId) {
            setOwnerName(fetchedName);
          } else {
            // Could not fetch username, keep as ID
            setOwnerName(null);
          }
        } else {
          // API call failed, keep as ID
          setOwnerName(null);
        }
      } catch (error) {
        console.error('Failed to fetch owner name:', error);
        setOwnerName(null);
      }
    };
    
    fetchOwnerName();
  }, [guild.ownerId]);

  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    if (!features) return;
    
    setSaving(true);
    try {
      // Create features object with the single feature to update
      await updateWebAppFeatures(guild.id, { [featureKey]: enabled });
      
      // Update local state
      setFeatures((prev: any) => ({
        ...prev,
        features: prev.features.map((f: any) => 
          f.key === featureKey ? { ...f, enabled } : f
        )
      }));
    } catch (error) {
      console.error('Failed to update feature:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Mobile Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="md:hidden flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          <span>Back to servers</span>
        </button>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
                          {guild.iconUrl ? (
                            <Image
                              src={guild.iconUrl}
                              alt={guild.name || 'Server'}
              width={80}
              height={80}
              className="rounded-xl"
                              unoptimized={true}
                            />
                          ) : (
            <div className="w-20 h-20 rounded-xl bg-blue-100 flex items-center justify-center">
              <span className="text-3xl font-bold text-blue-600">
                                {guild.name ? guild.name.charAt(0).toUpperCase() : '?'}
                              </span>
                            </div>
                          )}
                          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                              {guild.name || 'Unknown Server'}
            </h1>
            <p className="text-gray-500 mt-1">{guild.memberCount || 0} members • {guild.roleCount || 0} roles</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${true ? 'bg-green-500' : 'bg-red-500'}`}></div>
                Online
              </span>
              {guild.premium && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200">
                  <Crown className="h-3 w-3" />
                  Premium
                </span>
              )}
              {guild.group && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Folder className="h-3 w-3" />
                  {guild.group.name}
                </span>
              )}
              <button
                onClick={() => navigator.clipboard.writeText(guild.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                title="Copy Server ID"
              >
                <Copy className="h-3 w-3" />
                {guild.id}
              </button>
            </div>
                          </div>
                        </div>
                      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => { setActiveTab('overview'); setSelectedFeaturePage(null); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview' && !selectedFeaturePage
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => { setActiveTab('features'); setSelectedFeaturePage(null); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'features' && !selectedFeaturePage
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Features
          </button>
          <button
            onClick={() => { setActiveTab('users'); setSelectedFeaturePage(null); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users' && !selectedFeaturePage
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Users
          </button>
          <button
            onClick={() => { setActiveTab('roles'); setSelectedFeaturePage(null); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles' && !selectedFeaturePage
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Roles
          </button>
          <button
            onClick={() => { setActiveTab('commands'); setSelectedFeaturePage(null); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'commands' && !selectedFeaturePage
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Code className="h-4 w-4 inline mr-2" />
            Commands
          </button>
        </nav>
      </div>

      {/* Feature Page Content */}
      {selectedFeaturePage && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedFeaturePage(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {features?.features?.find((f: any) => f.key === selectedFeaturePage)?.name || 'Feature'}
              </h2>
            </div>
          </div>
          
          <FeaturePageLoader 
            featureKey={selectedFeaturePage} 
            guildId={guild.id}
            feature={features?.features?.find((f: any) => f.key === selectedFeaturePage)}
          />
        </div>
      )}

      {/* Tab Content */}
      {!selectedFeaturePage && activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Server Stats */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Server Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Users className="h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{guild.memberCount || 0}</p>
                  <p className="text-xs text-gray-500">Members</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Shield className="h-8 w-8 text-purple-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{guild.roleCount || 0}</p>
                  <p className="text-xs text-gray-500">Roles</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Activity className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {features?.features?.filter((f: any) => f.enabled).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">Active Features</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  {guild.premium ? (
                    <>
                      <Crown className="h-8 w-8 text-yellow-500 mb-2" />
                      <p className="text-2xl font-bold text-yellow-600">Premium</p>
                    </>
                  ) : (
                    <>
                      <Star className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-2xl font-bold text-gray-600">Free</p>
                    </>
                  )}
                  <p className="text-xs text-gray-500">Plan</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Active Features Summary */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Features</h2>
            <Card>
              <CardContent className="p-4">
                {loadingFeatures ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : features?.features?.filter((f: any) => f.enabled).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {features.features
                      .filter((f: any) => f.enabled)
                      .map((feature: any) => {
                        const FeatureIcon = FEATURE_ICONS[feature.key] || Settings;
                        const isPremium = feature.minimumPackage === 'premium';
                        return (
                          <div
                            key={feature.key}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                              isPremium
                                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-900'
                                : 'bg-green-50 border-green-200 text-green-800'
                            }`}
                          >
                            <FeatureIcon className={`h-4 w-4 ${isPremium ? 'text-yellow-600' : 'text-green-600'}`} />
                            <span className="text-sm font-medium">{feature.name}</span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No features enabled yet</p>
                    <p className="text-xs mt-1">Go to the Features tab to enable features</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Server Information */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Server Information</h2>
            <Card>
              <CardContent className="p-0 divide-y divide-gray-200">
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Server ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {guild.id}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(guild.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Owner</span>
                  <span className="text-sm font-medium text-gray-900">
                    {ownerName || (guild.ownerId ? guild.ownerId : 'Unknown')}
                  </span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bot Joined</span>
                  <span className="text-sm font-medium text-gray-900">
                    {guild.joinedAt ? new Date(guild.joinedAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                {guild.group && (
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Server Group</span>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900">{guild.group.name}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
              {logsTotal > 0 && (
                <span className="text-xs text-gray-500">{logsTotal} total events</span>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                {loadingLogs ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading activity...</p>
                  </div>
                ) : activityLogs.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Timestamp
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Action
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Target
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {activityLogs.map((log: any, idx: number) => {
                            return (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {log.created_at 
                                    ? new Date(log.created_at).toLocaleString()
                                    : 'Unknown'
                                  }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {log.user_name || 'System'}
                                  </div>
                                  {log.user_id && (
                                    <div className="text-xs text-gray-500 font-mono">
                                      {log.user_id}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">
                                    {log.action_name?.replace(/_/g, ' ') || log.action_type?.replace(/_/g, ' ') || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {log.action_type}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">
                                    {log.target_name || '—'}
                                  </div>
                                  {log.target_type && (
                                    <div className="text-xs text-gray-500">
                                      {log.target_type}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    log.status === 'success' 
                                      ? 'bg-green-100 text-green-800'
                                      : log.status === 'failed'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {log.status || 'success'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {logsTotal > logsPerPage && (
                      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Showing {((logsPage - 1) * logsPerPage) + 1}-{Math.min(logsPage * logsPerPage, logsTotal)} of {logsTotal}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                            disabled={logsPage === 1}
                            className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1 text-xs">Page {logsPage}</span>
                          <button
                            onClick={() => setLogsPage(p => p + 1)}
                            disabled={logsPage * logsPerPage >= logsTotal}
                            className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs mt-1">Activity will appear here as actions are performed</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!selectedFeaturePage && activeTab === 'features' && (
        <div className="space-y-6">
          {/* Features Management */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Feature Management</h2>
              {saving && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Saving...
                </div>
              )}
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search features..."
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={featureFilter}
                  onChange={(e) => setFeatureFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Features</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
                <select
                  value={featureSort}
                  onChange={(e) => setFeatureSort(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
            
            {loadingFeatures ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading features...</p>
              </div>
            ) : features && features.features ? (() => {
              // Filter and sort features
              let filteredFeatures = features.features.filter((f: any) => {
                // Search filter
                const matchesSearch = !featureSearch || 
                  f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
                  (f.description && f.description.toLowerCase().includes(featureSearch.toLowerCase()));
                
                // Status filter
                const matchesFilter = 
                  featureFilter === 'all' ||
                  (featureFilter === 'enabled' && f.enabled) ||
                  (featureFilter === 'disabled' && !f.enabled);
                
                return matchesSearch && matchesFilter;
              });

              // Sort features - always put enabled first, then by selected sort method
              filteredFeatures = filteredFeatures.sort((a: any, b: any) => {
                // First, sort by enabled status (enabled first)
                if (a.enabled !== b.enabled) {
                  return a.enabled ? -1 : 1;
                }
                // Then sort by the selected method
                if (featureSort === 'status') {
                  return a.name.localeCompare(b.name);
                } else {
                  return a.name.localeCompare(b.name);
                }
              });

              const freeFeatures = filteredFeatures.filter((f: any) => f.minimumPackage === 'free');
              const premiumFeatures = filteredFeatures.filter((f: any) => f.minimumPackage === 'premium');

              return (
                <div className="space-y-4">
                  {freeFeatures.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                        Free Features ({freeFeatures.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {freeFeatures.map((feature: any) => {
                          const FeatureIcon = FEATURE_ICONS[feature.key] || Settings;
                          return (
                        <div 
                          key={feature.key} 
                          className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-sm ${
                            selectedFeaturePage === feature.key ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedFeaturePage(feature.key)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                                  <FeatureIcon className={`h-5 w-5 ${feature.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm text-gray-900">{feature.name}</h4>
                                    {feature.enabled && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                                  {feature.enabled && (
                                    <p className="text-xs text-blue-600 mt-1 font-medium">
                                      Click to open →
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={feature.enabled}
                                  onChange={(e) => toggleFeature(feature.key, e.target.checked)}
                                  disabled={saving || !feature.canEnable}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Premium Features */}
                  {premiumFeatures.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                        Premium Features ({premiumFeatures.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {premiumFeatures.map((feature: any) => {
                          const FeatureIcon = FEATURE_ICONS[feature.key] || Crown;
                          return (
                        <div 
                          key={feature.key} 
                          className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-sm ${
                            selectedFeaturePage === feature.key ? 'ring-2 ring-yellow-500 border-yellow-300' : ''
                          } ${
                            feature.enabled 
                              ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' 
                              : 'bg-white border-gray-200'
                          }`}
                          onClick={() => setSelectedFeaturePage(feature.key)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                                  <FeatureIcon className={`h-5 w-5 ${feature.enabled ? 'text-yellow-600' : 'text-gray-400'}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-medium text-sm ${
                                      feature.enabled ? 'text-yellow-900' : 'text-gray-900'
                                    }`}>{feature.name}</h4>
                                    {feature.enabled && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-xs mt-1 ${
                                    feature.enabled ? 'text-yellow-700' : 'text-gray-500'
                                  }`}>{feature.description}</p>
                                  {feature.enabled && (
                                    <p className="text-xs text-yellow-600 mt-1 font-medium">
                                      Click to open →
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={feature.enabled}
                                  onChange={(e) => toggleFeature(feature.key, e.target.checked)}
                                  disabled={saving || !feature.canEnable}
                                  className="sr-only peer"
                                />
                                <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600 ${
                                  feature.canEnable ? 'bg-gray-200 peer-focus:ring-4 peer-focus:ring-yellow-300' : 'bg-gray-100'
                                }`}></div>
                              </label>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {filteredFeatures.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-600 font-medium">No features found</p>
                      <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Unable to load features
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedFeaturePage && activeTab === 'users' && (
        <UsersPanelLoader guildId={guild.id} />
      )}

      {!selectedFeaturePage && activeTab === 'roles' && (
        <RolesPanelLoader guildId={guild.id} />
      )}

      {!selectedFeaturePage && activeTab === 'commands' && (
        <CommandsPanel guildId={guild.id} />
      )}

    </div>
  );
}

// Feature Page Loader Component
function FeaturePageLoader({ featureKey, guildId, feature }: { 
  featureKey: string; 
  guildId: string; 
  feature: any; 
}) {
  const [loading, setLoading] = useState(true);
  const [FeatureComponent, setFeatureComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    const loadFeatureComponent = async () => {
      try {
        let component: React.ComponentType<any> | null = null;
        
        switch (featureKey) {
          case 'embedded_messages':
            const { default: EmbeddedMessagesBuilder } = await import('@/components/embedded-messages-builder');
            component = (props: any) => <EmbeddedMessagesBuilder premium={true} guildIdProp={guildId} {...props} />;
            break;
          case 'moderation':
            const { default: ModerationPanel } = await import('@/components/moderation-panel');
            component = (props: any) => <ModerationPanel guildId={guildId} {...props} />;
            break;
          case 'reaction_roles':
            const { default: ReactionRolesPanel } = await import('@/components/reaction-roles-panel');
            component = (props: any) => <ReactionRolesPanel guildId={guildId} premium={true} {...props} />;
            break;
          case 'feedback_system':
            component = () => (
              <div className="space-y-6">
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-green-500" />
                    <h2 className="text-xl font-bold">Feedback Collection</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Collect and manage user feedback submissions with custom forms and automated responses.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">How to Use Feedback Collection</h3>
                      <div className="space-y-3 text-sm text-blue-800">
                        <div>
                          <p className="font-medium mb-1">1. Use the /feedback command in Discord</p>
                          <p className="text-blue-700">Users can submit feedback directly through Discord using the <code className="bg-blue-100 px-1 rounded">/feedback</code> slash command.</p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">2. Configure feedback channels</p>
                          <p className="text-blue-700">Set up where feedback submissions should be posted for review by your team.</p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">3. Customize priority levels</p>
                          <p className="text-blue-700">Feedback can be categorized by priority (Low, Medium, High, Critical) to help you prioritize responses.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Feature Enabled
                            </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      The feedback system is currently active. Users can submit feedback using the /feedback command.
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/guilds/${guildId}/settings#feedback`}>
                        <Button variant="outline" size="sm">
                          <Settings className="h-3 w-3 mr-2" />
                          Configure Settings
                        </Button>
                      </Link>
                          </div>
                        </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-2">Quick Actions</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Set feedback submission channel</p>
                      <p>• Configure auto-responses</p>
                      <p>• Customize priority categories</p>
                      <p>• Enable/disable notifications</p>
                      </div>
                  </div>
                </div>
              </div>
            );
            break;
          case 'verification_system':
            component = () => (
              <div className="space-y-6">
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-purple-500" />
                    <h2 className="text-xl font-bold">User Verification System</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Verify users with Discord's built-in verification system and custom verification roles.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">How to Use User Verification</h3>
                      <div className="space-y-3 text-sm text-blue-800">
                        <div>
                          <p className="font-medium mb-1">1. Send verification message with /sendverify</p>
                          <p className="text-blue-700">Use the <code className="bg-blue-100 px-1 rounded">/sendverify</code> command to send a verification message to a channel.</p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">2. Set verification log channel with /setverifylog</p>
                          <p className="text-blue-700">Configure where verification events should be logged using <code className="bg-blue-100 px-1 rounded">/setverifylog</code>.</p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">3. Users click to verify</p>
                          <p className="text-blue-700">Users click the verification button to receive the verified role and gain access to your server.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Feature Enabled
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      The verification system is currently active. Use the commands to set up verification.
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/guilds/${guildId}/settings#verification`}>
                        <Button variant="outline" size="sm">
                          <Settings className="h-3 w-3 mr-2" />
                          Configure Settings
                        </Button>
                    </Link>
                </div>
              </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-2">Available Commands</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">/sendverify</code>
                        <span className="text-gray-600 text-xs pt-1">Send verification message</span>
            </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">/setverifylog</code>
                        <span className="text-gray-600 text-xs pt-1">Set log channel</span>
        </div>
                    </div>
                  </div>
                </div>
              </div>
            );
            break;
          case 'creator_alerts':
            const { default: CreatorAlertsPanel } = await import('@/components/creator-alerts-panel');
            component = (props: any) => <CreatorAlertsPanel guildId={guildId} {...props} />;
            break;
          case 'ai_summarization':
            const { default: AISummarizationPanel } = await import('@/components/ai-summarization-panel');
            component = (props: any) => <AISummarizationPanel guildId={guildId} {...props} />;
            break;
          case 'bot_customisation':
            const { default: BotCustomisationPanel } = await import('@/components/bot-customisation-panel');
            component = (props: any) => <BotCustomisationPanel guildId={guildId} {...props} />;
            break;
          default:
            component = () => (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{feature?.name || featureKey}</h3>
                  <p className="text-gray-600 mb-6">Configure {feature?.name?.toLowerCase() || featureKey} settings and options.</p>
                  <Link href={`/guilds/${guildId}/settings`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Settings className="h-4 w-4 mr-2" />
                      Open Settings
                    </Button>
                  </Link>
                </div>
    </div>
  );
}
        
        setFeatureComponent(() => component);
      } catch (error) {
        console.error('Failed to load feature component:', error);
        setFeatureComponent(() => (
          <div className="text-center py-8 text-red-500">
            <p>Failed to load {feature?.name || featureKey}</p>
          </div>
        ));
      } finally {
        setLoading(false);
      }
    };

    loadFeatureComponent();
  }, [featureKey, guildId, feature]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading {feature?.name || 'feature'}...</p>
      </div>
    );
  }

  if (!FeatureComponent) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Feature component not found</p>
      </div>
    );
  }

  return <FeatureComponent />;
}


// Helper Components
function InfoRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const { toast } = useToast();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };
  
  return (
    <div className="px-4 py-3 flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{value}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// Loading/Error States
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold mb-2">Loading Your Servers</h2>
        <p className="text-gray-600">Please wait...</p>
      </div>
    </div>
  );
}

function AuthErrorState() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Session Expired</h2>
        <p className="text-gray-600 mb-6">Your session has expired. Please sign in again.</p>
        <Button onClick={() => window.location.href = '/signin'}>
          Sign In Again
        </Button>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Unable to Load Servers</h2>
        <p className="text-gray-600 mb-6">There was an error loading your servers.</p>
        <div className="space-x-4">
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/signin'}>
            Sign In Again
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">No Servers Found</h2>
        <p className="text-gray-600 mb-6">
          You don't have access to any servers yet.
        </p>
        <div className="space-x-4">
          <Button onClick={() => window.location.reload()}>
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href="https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID" target="_blank" rel="noopener noreferrer">
              Invite Bot
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
