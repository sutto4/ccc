"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Folder, Settings, Trash2, Users, Save, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServerGroup {
  id: number;
  name: string;
  description: string;
  server_count: number;
  created_at: string;
  updated_at: string;
}

interface Guild {
  id: string;
  name: string;
  memberCount: number;
  roleCount: number;
  iconUrl: string | null;
  premium: boolean;
  group?: {
    id: number;
    name: string;
    description: string;
  } | null;
}

interface ServerGroupsManagerProps {
  guildId: string;
}

export default function ServerGroupsManager({ guildId }: ServerGroupsManagerProps) {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [userGuilds, setUserGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ServerGroup | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [draggedGuild, setDraggedGuild] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null);
  const { toast } = useToast();

  // console.log('ServerGroupsManager mounted, guildId:', guildId);
  // console.log('Session status:', !!session);

  useEffect(() => {
    // console.log('useEffect triggered, session:', !!session);
    if (session) {
      loadData();
    }
  }, [session]);

  // Debug effect to log state changes
  useEffect(() => {
    // console.log('Groups state:', groups);
    // console.log('User guilds state:', userGuilds);
    // console.log('Ungrouped guilds count:', userGuilds.filter(g => !g.group).length);
  }, [groups, userGuilds]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Starting to load data...');
      
      // API routes handle authentication server-side via session cookies
      // Try optimized guilds API first, fallback to original
      let guildsResponse = await fetch("/api/guilds-optimized");
      if (!guildsResponse.ok) {
        console.warn('[PERF] Optimized guilds endpoint failed, trying original...');
        guildsResponse = await fetch("/api/guilds");
      }
      
      const [groupsResponse] = await Promise.all([
        fetch("/api/server-groups"),
        Promise.resolve(guildsResponse)
      ]);

      console.log('Groups response status:', groupsResponse.status);
      console.log('Guilds response status:', guildsResponse.status);

      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        console.log('Loaded groups:', groupsData);
        setGroups(groupsData.groups || []);
      } else {
        console.error('Groups response not ok:', groupsResponse.status, groupsResponse.statusText);
      }

      if (guildsResponse.ok) {
        const guildsData = await guildsResponse.json();
        console.log('Loaded guilds:', guildsData);
        console.log('Guilds array length:', guildsData.guilds?.length || 0);
        console.log('Full guilds response structure:', JSON.stringify(guildsData, null, 2));
        console.log('guildsData.guilds:', guildsData.guilds);
        console.log('guildsData.guilds type:', typeof guildsData.guilds);
        console.log('guildsData.guilds is array:', Array.isArray(guildsData.guilds));
        
        // The API returns guilds directly as an array, not nested under a 'guilds' property
        const guilds = Array.isArray(guildsData) ? guildsData : (guildsData.guilds || []);
        console.log('Final guilds array:', guilds);
        setUserGuilds(guilds);
      } else {
        console.error('Guilds response not ok:', guildsResponse.status, guildsResponse.statusText);
        const errorText = await guildsResponse.text();
        console.error('Guilds error body:', errorText);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Failed to Load Data",
        description: "Could not load server groups and guilds. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await fetch("/api/server-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        // Add the new group with server_count: 0
        const newGroup = { ...data.group, server_count: 0 };
        setGroups(prev => [newGroup, ...prev]);
        setFormData({ name: "", description: "" });
        setShowCreateForm(false);
        toast({
          title: "Group Created",
          description: `"${data.group.name}" has been created successfully.`,
          variant: "success"
        });
      } else {
        const errorData = await response.json();
        if (response.status === 403) {
          toast({
            title: "Premium Required",
            description: errorData.error || "Server groups are only available to premium customers. Please upgrade your plan.",
            variant: "destructive"
          });
        } else {
          throw new Error(errorData.error || "Failed to create group");
        }
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Failed to Create Group",
        description: "Could not create the server group. Please check your input and try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      const response = await fetch(`/api/server-groups/${editingGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(prev => prev.map(g => g.id === editingGroup.id ? data.group : g));
        setEditingGroup(null);
        setFormData({ name: "", description: "" });
        toast({
          title: "Group Updated",
          description: `"${data.group.name}" has been updated successfully.`,
          variant: "success"
        });
      } else {
        throw new Error("Failed to update group");
      }
    } catch (error) {
      console.error("Error updating group:", error);
      toast({
        title: "Failed to Update Group",
        description: "Could not update the server group. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm("Are you sure you want to delete this group? This will remove all servers from the group.")) {
      return;
    }

    try {
      const response = await fetch(`/api/server-groups/${groupId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
        // Update guilds to remove group association
        setUserGuilds(prev => prev.map(g => 
          g.group?.id === groupId ? { ...g, group: null } : g
        ));
        toast({
          title: "Group Deleted",
          description: "The server group has been deleted successfully.",
          variant: "success"
        });
      } else {
        throw new Error("Failed to delete group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        title: "Failed to Delete Group",
        description: "Could not delete the server group. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, guildId: string) => {
    setDraggedGuild(guildId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, groupId: number | null) => {
    e.preventDefault();
    setDragOverGroup(groupId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the entire drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverGroup(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetGroupId: number | null) => {
    e.preventDefault();
    if (!draggedGuild) return;

    try {
      if (targetGroupId) {
        // Add to group
        const response = await fetch(`/api/server-groups/${targetGroupId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guildId: draggedGuild })
        });

        if (response.ok) {
          // Update local state
          setUserGuilds(prev => prev.map(g => 
            g.id === draggedGuild 
              ? { ...g, group: groups.find(gr => gr.id === targetGroupId) || null }
              : g
          ));
          
          // Update group server counts
          setGroups(prev => prev.map(g => {
            if (g.id === targetGroupId) {
              return { ...g, server_count: g.server_count + 1 };
            }
            return g;
          }));
          
          toast({
            title: "Server Added",
            description: "Server has been successfully added to the group.",
            variant: "success"
          });
        }
      } else {
        // Remove from group (ungroup)
        const currentGroup = userGuilds.find(g => g.id === draggedGuild)?.group;
        if (currentGroup) {
          const response = await fetch(`/api/server-groups/${currentGroup.id}/members`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guildId: draggedGuild })
          });

          if (response.ok) {
            setUserGuilds(prev => prev.map(g => 
              g.id === draggedGuild ? { ...g, group: null } : g
            ));
            
            // Update group server counts
            setGroups(prev => prev.map(g => {
              if (g.id === currentGroup.id) {
                return { ...g, server_count: Math.max(0, g.server_count - 1) };
              }
              return g;
            }));
            
            toast({
              title: "Server Removed",
              description: "Server has been successfully removed from the group.",
              variant: "success"
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating group membership:", error);
      toast({
        title: "Failed to Update Group",
        description: "Could not update the server group membership. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDraggedGuild(null);
      setDragOverGroup(null);
    }
  };

  const startEditing = (group: ServerGroup) => {
    setEditingGroup(group);
    setFormData({ name: group.name, description: group.description || "" });
  };

  const cancelEditing = () => {
    setEditingGroup(null);
    setFormData({ name: "", description: "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Create Group Button */}
      {!showCreateForm && (
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Group
        </Button>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingGroup) && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-blue-800">{editingGroup ? "Edit Group" : "Create New Group"}</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="Enter group name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter group description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                disabled={!formData.name.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {editingGroup ? "Update Group" : "Create Group"}
              </Button>
              <Button variant="outline" onClick={editingGroup ? cancelEditing : () => setShowCreateForm(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups Display */}
      <div className="space-y-4">
        
        {groups.map((group) => {
          console.log('Rendering group:', group.name);
          return (
            <Card 
              key={group.id} 
              className={`border-2 transition-all duration-200 ${
                dragOverGroup === group.id 
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]' 
                  : 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
              }`}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDrop={(e) => handleDrop(e, group.id)}
              onDragLeave={handleDragLeave}
            >
              <CardHeader
                className="pb-4"
                title={
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Folder className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{group.name}</span>
                  </div>
                }
                action={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(group)}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                }
              />
              <CardContent>
                <div className="space-y-2">
                  <div className="mb-2">
                    {group.description && (
                      <p className="text-sm text-gray-600">{group.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.server_count} server{group.server_count !== 1 ? 's' : ''}
                      </span>
                      <span>
                        Created {new Date(group.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {userGuilds
                    .filter(g => g.group?.id === group.id)
                    .map((guild) => (
                      <div
                        key={guild.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, guild.id)}
                        className={`flex items-center gap-3 p-3 bg-white rounded-lg border cursor-move hover:shadow-sm transition-all duration-200 ${
                          draggedGuild === guild.id ? 'opacity-50 scale-95 shadow-md' : ''
                        }`}
                      >
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        {guild.iconUrl ? (
                          <img
                            src={guild.iconUrl}
                            alt={guild.name}
                            className="w-8 h-8 rounded"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {guild.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{guild.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {guild.memberCount?.toLocaleString() || 'N/A'} members
                          </p>
                        </div>
                      </div>
                    ))}
                  {userGuilds.filter(g => g.group?.id === group.id).length === 0 && (
                    <div className={`text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg ${
                      dragOverGroup === group.id 
                        ? 'border-blue-400 bg-blue-100 text-blue-700' 
                        : 'border-gray-300'
                    }`}>
                      {dragOverGroup === group.id ? (
                        <div className="flex flex-col items-center gap-2">
                          <Folder className="h-8 w-8 text-blue-500" />
                          <p className="font-medium text-lg">Drop server here!</p>
                          <p className="text-sm font-semibold bg-blue-200 px-3 py-1 rounded-full">
                            Adding to: {group.name}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Folder className="h-6 w-6 text-gray-400" />
                          <p>Drag servers here to add them to this group</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Ungrouped Servers */}
        <Card 
          className={`border-2 transition-all duration-200 ${
            dragOverGroup === null 
              ? 'border-gray-400 bg-gray-50 shadow-lg scale-[1.02]' 
              : 'border-gray-200 bg-gray-50/30'
          }`}
          onDragOver={(e) => handleDragOver(e, null)}
          onDrop={(e) => handleDrop(e, null)}
          onDragLeave={handleDragLeave}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <Folder className={`h-5 w-5 ${
                dragOverGroup === null ? 'text-gray-700' : 'text-gray-600'
              }`} />
              <div>
                <h3 className={`font-semibold ${
                  dragOverGroup === null ? 'text-gray-900' : 'text-gray-800'
                }`}>Individual Servers</h3>
                <p className={`text-sm ${
                  dragOverGroup === null ? 'text-gray-700' : 'text-gray-600'
                }`}>
                  Servers not assigned to any group
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userGuilds
                .filter(g => !g.group)
                .map((guild) => (
                  <div
                    key={guild.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, guild.id)}
                    className={`flex items-center gap-3 p-3 bg-white rounded-lg border cursor-move hover:shadow-sm transition-all duration-200 ${
                      draggedGuild === guild.id ? 'opacity-50 scale-95 shadow-md' : ''
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    {guild.iconUrl ? (
                      <img
                        src={guild.iconUrl}
                        alt={guild.name}
                        className="w-8 h-8 rounded"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {guild.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{guild.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {guild.memberCount?.toLocaleString() || 'N/A'} members
                      </p>
                    </div>
                  </div>
                ))}
              {userGuilds.filter(g => !g.group).length === 0 && (
                <div className={`text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg ${
                  dragOverGroup === null 
                    ? 'border-gray-400 bg-gray-100 text-gray-700' 
                    : 'border-gray-300'
                }`}>
                  {dragOverGroup === null ? (
                    <div className="flex flex-col items-center gap-2">
                      <Folder className="h-8 w-8 text-gray-500" />
                      <p className="font-medium text-lg">Drop server here!</p>
                      <p className="text-sm font-semibold bg-gray-200 px-3 py-1 rounded-full">
                        Removing from group
                      </p>
                    </div>
                    ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Folder className="h-6 w-6 text-gray-400" />
                      <p>All servers are grouped</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
