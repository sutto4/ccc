"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";


import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckIcon, ImageIcon, RefreshCwIcon, SaveIcon, Trash2Icon, LayoutGridIcon, HashIcon, SendIcon, XIcon, SearchIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logAction } from "@/lib/logger";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";



type ButtonConfig = {
  id: string;
  label: string;
  url: string;
  style?: 'primary' | 'secondary' | 'danger' | 'link';
};

type EmbeddedMessageConfig = {
   id: string;
   channelId: string;
   messageId?: string | null;
   title?: string;
   description?: string;
   color?: number | null;
   imageUrl?: string | null;
   thumbnailUrl?: string | null;
   author?: { name?: string; iconUrl?: string } | null;
   footer?: { text?: string; iconUrl?: string } | null;
   timestamp?: number | null;
   enabled: boolean | null;
   createdBy?: string;
   createdAt?: number;
   updatedAt?: number;
   multiChannel?: boolean;
   // Multi-channel support
   channels?: Array<{guildId: string, channelId: string, guildName: string, channelName: string}>;
   // Button support
   buttons?: ButtonConfig[];
   enableButtons?: boolean;
 };

export default function EmbeddedMessagesBuilder({ premium }: { premium: boolean }) {
  const params = useParams<{ id: string }>();
  const guildId = params.id;
  const { data: session } = useSession();
  const { toast } = useToast();
  
  // Global request deduplication - persists across component lifecycle changes
  const globalRequestIds = useRef(new Map<string, Promise<any>>());

  // More robust duplicate prevention
  const hasLoadedData = useRef(false);
  const isLoadingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [configs, setConfigs] = useState<EmbeddedMessageConfig[]>([]);
  const [editing, setEditing] = useState<EmbeddedMessageConfig | null>(null);
     const [channels, setChannels] = useState<any[]>([]);
   const [guilds, setGuilds] = useState<any[]>([]);
   const [groups, setGroups] = useState<any[]>([]);
   const [tempColor, setTempColor] = useState("#5865F2");
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [authorIconModalOpen, setAuthorIconModalOpen] = useState(false);
     const [footerIconModalOpen, setFooterIconModalOpen] = useState(false);
   const [channelSelectorOpen, setChannelSelectorOpen] = useState(false);
   const [tempThumbnailUrl, setTempThumbnailUrl] = useState("");
   const [tempImageUrl, setTempImageUrl] = useState("");
   const [tempAuthorIconUrl, setTempAuthorIconUrl] = useState("");
   const [tempFooterIconUrl, setTempFooterIconUrl] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Channel selector state
  const [expandedGuilds, setExpandedGuilds] = useState<Set<string>>(new Set());
  const [currentServerSearch, setCurrentServerSearch] = useState("");
  const [groupedServersSearch, setGroupedServersSearch] = useState("");

     // Form fields
   const [selectedChannels, setSelectedChannels] = useState<Array<{guildId: string, channelId: string, guildName: string, channelName: string}>>([]);
   const [title, setTitle] = useState("");
   const [description, setDescription] = useState("");
   const [color, setColor] = useState("#5865F2");
   const [imageUrl, setImageUrl] = useState("");
   const [thumbnailUrl, setThumbnailUrl] = useState("");
   const [authorName, setAuthorName] = useState("");
   const [authorIconUrl, setAuthorIconUrl] = useState("");
   const [footerText, setFooterText] = useState("");
   const [footerIconUrl, setFooterIconUrl] = useState("");
   const [showTimestamp, setShowTimestamp] = useState(true);
   
   // Button state
   const [enableButtons, setEnableButtons] = useState(false);
   const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  
  // User mention state
  const [guildMembers, setGuildMembers] = useState<any[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [activeMentionField, setActiveMentionField] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null);

  // Access token is handled server-side by withAuth wrapper, no need to include in client requests
  const authHeader = useMemo(() => ({}), []) as HeadersInit;

  // Memoize the username lookup map for better performance
  const usernameMap = useMemo(() => {
    if (!guildMembers.length) return new Map();
    
    const map = new Map();
    guildMembers.forEach(member => {
      if (member.username && member.discordUserId) {
        map.set(member.username.toLowerCase(), member.discordUserId);
      }
      if (member.displayName && member.discordUserId) {
        map.set(member.displayName.toLowerCase(), member.discordUserId);
      }
      if (member.nickname && member.discordUserId) {
        map.set(member.nickname.toLowerCase(), member.discordUserId);
      }
    });
    
    return map;
  }, [guildMembers]);

  // Optimized mention conversion function
  const convertMentions = useCallback((text: string): string => {
    if (!text || !usernameMap.size) return text;
    
    return text.replace(/@(\w+)/g, (match, username) => {
      // Try exact match first
      let userId = usernameMap.get(username.toLowerCase());
      
      // If no exact match, try partial matches
      if (!userId) {
        for (const [mapUsername, mapUserId] of usernameMap.entries()) {
          if (mapUsername.toLowerCase().includes(username.toLowerCase()) || 
              username.toLowerCase().includes(mapUsername.toLowerCase())) {
            userId = mapUserId;
            break;
          }
        }
      }
      
      return userId ? `<@${userId}>` : match;
    });
  }, [usernameMap]);

  // Filtered users for inline search
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim() || !guildMembers.length) return [];
    
    const query = userSearchQuery.toLowerCase();
    return guildMembers
      .filter(member => 
        member.username?.toLowerCase().includes(query) ||
        member.displayName?.toLowerCase().includes(query) ||
        member.nickname?.toLowerCase().includes(query)
      )
      .slice(0, 8); // Limit to 8 results for performance
  }, [userSearchQuery, guildMembers]);

  // Button management functions
  const addButton = () => {
    const newButton: ButtonConfig = {
      id: `btn_${Date.now()}`,
      label: 'New Button',
      url: 'https://example.com',
      style: 'primary'
    };
    setButtons(prev => [...prev, newButton]);
  };

  const removeButton = (buttonId: string) => {
    setButtons(prev => prev.filter(btn => btn.id !== buttonId));
  };

  const updateButton = (buttonId: string, field: keyof ButtonConfig, value: string) => {
    setButtons(prev => prev.map(btn => 
      btn.id === buttonId ? { ...btn, [field]: value } : btn
    ));
  };

  // Handle @ key press to show user search
  const handleInputChange = useCallback((field: string, value: string, setter: (value: string) => void) => {
    setter(value);
    
    // Check for @ symbol to trigger user search - look for @ anywhere in the text
    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1) {
      // Get everything after the @ symbol
      const afterAt = value.slice(atIndex + 1);
      
      // Check if there's a space or end of string after the @
      const spaceIndex = afterAt.indexOf(' ');
      const endIndex = spaceIndex !== -1 ? spaceIndex : afterAt.length;
      const usernamePart = afterAt.slice(0, endIndex);
      
      if (usernamePart.length > 0) {
        // Check if there's an exact match in the usernameMap
        const exactMatch = usernameMap.get(usernamePart.toLowerCase());
        
        if (exactMatch) {
          // Exact match found - mark as valid mention but keep @username visible
          console.log("🔍 Exact username match found:", { username: usernamePart, userId: exactMatch });
          
          // Don't show dropdown for exact matches - the visual styling will indicate it's valid
          setShowUserSearch(false);
          setActiveMentionField(null);
          setMentionPosition(null);
          setUserSearchQuery("");
        } else {
          // No exact match - show dropdown for search
          setShowUserSearch(true);
          setUserSearchQuery(usernamePart);
          setActiveMentionField(field);
          setMentionPosition({ start: atIndex, end: atIndex + usernamePart.length + 1 });
        }
      } else {
        setShowUserSearch(false);
      }
    } else {
      setShowUserSearch(false);
    }
  }, [usernameMap]);

  // Toggle guild expansion
  const toggleGuildExpansion = useCallback((guildId: string) => {
    setExpandedGuilds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guildId)) {
        newSet.delete(guildId);
      } else {
        newSet.add(guildId);
      }
      return newSet;
    });
  }, []);

  // Filter channels based on search
  const filteredCurrentServerChannels = useMemo(() => {
    if (!currentServerSearch.trim()) return channels;
    const searchTerm = currentServerSearch.toLowerCase();
    return channels.filter(ch => ch.name.toLowerCase().includes(searchTerm));
  }, [channels, currentServerSearch]);

  const filteredGroupedServersChannels = useMemo(() => {
    console.log("🔍 filteredGroupedServersChannels triggered:", {
      groupedServersSearch,
      groupsCount: groups.length,
      guildId,
      groupsData: groups
    });
    
    if (!groupedServersSearch.trim()) {
      // No search term - show all channels but filter out current server
      const result = groups.map(group => ({
        ...group,
        guilds: group.guilds?.map((guild: any) => ({
          ...guild,
          channels: guild.channels || []
        })).filter((guild: any) => guild.id !== guildId) || []
      })).filter(group => group.guilds.length > 0);
      
      console.log("🔍 No search term - showing all channels:", result);
      return result;
    }
    
    // Search term exists - filter channels by search term
    const searchTerm = groupedServersSearch.toLowerCase();
    console.log("🔍 Searching for:", searchTerm);
    
    const filteredGroups = groups.map(group => ({
      ...group,
      guilds: group.guilds?.map((guild: any) => {
        const filteredChannels = guild.channels?.filter((channel: any) => 
          channel.name.toLowerCase().includes(searchTerm) ||
          guild.name.toLowerCase().includes(searchTerm)
        ) || [];
        
        console.log(`🔍 Guild ${guild.name} (${guild.id}):`, {
          totalChannels: guild.channels?.length || 0,
          filteredChannels: filteredChannels.length,
          matchingChannels: filteredChannels.map((ch: any) => ch.name)
        });
        
        return {
          ...guild,
          channels: filteredChannels
        };
      }).filter((guild: any) => {
        // Only show guilds that have matching channels AND are not the current server
        const shouldShow = guild.channels.length > 0 && guild.id !== guildId;
        console.log(`🔍 Guild ${guild.name} should show:`, shouldShow);
        return shouldShow;
      }) || []
    })).filter(group => group.guilds.length > 0);
    
    console.log("🔍 Search results:", filteredGroups);
    return filteredGroups;
  }, [groups, groupedServersSearch, guildId]);

  // Insert user mention into the active field
  const insertUserMention = useCallback((username: string, userId: string) => {
    console.log("🔍 insertUserMention called with:", { username, userId, type: typeof userId });
    
    if (!activeMentionField || !mentionPosition) return;
    
    const mention = `<@${userId}>`;
    console.log("🔍 Created mention:", mention);
    
    // Update the appropriate field
    if (activeMentionField === 'title') {
      const newTitle = title.slice(0, mentionPosition.start) + mention + title.slice(mentionPosition.end);
      setTitle(newTitle);
    } else if (activeMentionField === 'description') {
      const newDescription = description.slice(0, mentionPosition.start) + mention + description.slice(mentionPosition.end);
      setDescription(newDescription);
    } else if (activeMentionField === 'authorName') {
      const newAuthorName = authorName.slice(0, mentionPosition.start) + mention + authorName.slice(mentionPosition.end);
      setAuthorName(newAuthorName);
    } else if (activeMentionField === 'footerText') {
      const newFooterText = footerText.slice(0, mentionPosition.start) + mention + footerText.slice(mentionPosition.end);
      setFooterText(newFooterText);
    }
    
    // Close user search
    setShowUserSearch(false);
    setActiveMentionField(null);
    setMentionPosition(null);
    setUserSearchQuery("");
  }, [activeMentionField, mentionPosition, title, description, authorName, footerText]);



   // Filter configs based on search query
   const filteredConfigs = useMemo(() => {
     if (!searchQuery.trim()) return configs;
     
     const query = searchQuery.toLowerCase();
     return configs.filter(config => {
       const title = (config.title || '').toLowerCase();
       const description = (config.description || '').toLowerCase();
       
       // Check current channel name
       const channelName = channels.find(ch => String(ch.id) === String(config.channelId))?.name?.toLowerCase() || '';
       
       // Check multi-channel information
       const multiChannelMatch = config.channels?.some(channel => 
         channel.channelName.toLowerCase().includes(query) ||
         channel.guildName.toLowerCase().includes(query)
       ) || false;
       
       return title.includes(query) || 
              description.includes(query) || 
              channelName.includes(query) ||
              multiChannelMatch;
     });
   }, [configs, searchQuery, channels]);

  // Reset loaded data flag when guildId changes
  useEffect(() => {
    hasLoadedData.current = false;
    isLoadingRef.current = false;
  }, [guildId]);

  // Reset loaded data flag when session changes (new login/logout)
  useEffect(() => {
    hasLoadedData.current = false;
    isLoadingRef.current = false;
  }, [session]);

  // Cleanup effect to reset flags when component unmounts
  useEffect(() => {
    return () => {
      hasLoadedData.current = false;
      isLoadingRef.current = false;
    };
  }, []);

  // Global deduplication function
  const makeGlobalDeduplicatedRequest = async (url: string, options: RequestInit = {}) => {
    const requestKey = `${url}-${JSON.stringify({ ...options, headers: { ...options.headers, Authorization: '[REDACTED]' } })}`;
    
    console.log(`🔍 Global deduplication check for: ${url}`);
    console.log(`🔍 Already in progress globally: ${globalRequestIds.current.has(requestKey)}`);
    console.log(`🔍 Total global requests in progress: ${globalRequestIds.current.size}`);
    
    // If this exact request is already in progress globally, return the existing promise
    if (globalRequestIds.current.has(requestKey)) {
      console.log(`🔍 ⏳ Reusing existing request: ${url}`);
      return globalRequestIds.current.get(requestKey);
    }
    
    // Create new request promise
    console.log(`🔍 ➕ Creating new global request: ${url}`);
    const requestPromise = (async () => {
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data;
      } finally {
        // Remove from global in-progress map
        console.log(`🔍 ➖ Removing request from global in-progress: ${url}`);
        globalRequestIds.current.delete(requestKey);
      }
    })();
    
    // Store the promise in the global map
    globalRequestIds.current.set(requestKey, requestPromise);
    
    return requestPromise;
  };

  useEffect(() => {
    let alive = true;
    
    console.log("🔍 useEffect triggered:", {
      guildId,
      hasLoadedData: hasLoadedData.current,
      isLoading: isLoadingRef.current,
      hasAuthHeader: typeof authHeader === 'object' && 'Authorization' in authHeader,
      requestIdsSize: globalRequestIds.current.size
    });
    
    // Prevent duplicate API calls if already loaded data for this guild or currently loading
    if (hasLoadedData.current || isLoadingRef.current) {
      console.log("🔍 Skipping API calls - already loaded or loading");
      return;
    }
    
    // Set loading ref to prevent duplicate calls
    console.log("🔍 Setting isLoadingRef to true");
    isLoadingRef.current = true;
    
    (async () => {
      try {
        console.log("🔍 Starting API calls...");
        setLoading(true);
        
        // Use deduplicated requests
        const [chRes, cRes, membersRes, guildsRes, groupsRes] = await Promise.all([
          makeGlobalDeduplicatedRequest(`/api/guilds/${guildId}/channels`, { headers: authHeader }),
          makeGlobalDeduplicatedRequest(`/api/proxy/guilds/${guildId}/embedded-messages`, { headers: authHeader }).catch(() => ({ configs: [] })),
          makeGlobalDeduplicatedRequest(`/api/guilds/${guildId}/members`, { headers: authHeader }).catch(() => ({ members: [] })),
          makeGlobalDeduplicatedRequest(`/api/proxy/guilds/${guildId}/guilds`, { headers: authHeader }).catch(() => ({ groups: [] })),
          makeGlobalDeduplicatedRequest(`/api/guilds/${guildId}/groups`, { headers: authHeader }).catch(() => ({ groups: [] })),
        ]);
        
        if (!alive) return;
        
        console.log("🔍 API calls completed successfully");
        
        const ch = Array.isArray(chRes?.channels) ? chRes.channels : Array.isArray(chRes) ? chRes : [];
        setChannels(ch);
        
        const guildsData = Array.isArray(guildsRes?.guilds) ? guildsRes.guilds : [];
        console.log("🔍 Guilds data received:", guildsData);
        console.log("🔍 Sample guild with channels:", guildsData[0]);
        setGuilds(guildsData);
        
        const groupsData = Array.isArray(groupsRes?.groups) ? groupsRes.groups : [];
        setGroups(groupsData);
        
        setGuildMembers(Array.isArray(membersRes) ? membersRes : []);
        setConfigs(Array.isArray(cRes?.configs) ? cRes.configs : []);
        
        // Mark as loaded to prevent duplicate calls
        console.log("🔍 Setting hasLoadedData to true");
        hasLoadedData.current = true;
      } finally {
        if (alive) {
          console.log("🔍 Setting loading to false");
          setLoading(false);
          isLoadingRef.current = false;
        }
      }
    })();
    
    return () => { 
      console.log("🔍 useEffect cleanup");
      alive = false; 
    };
  }, [guildId, authHeader]);

  // Fetch groups data
  useEffect(() => {
    if (!guildId || !authHeader) return;
    
    const fetchGroups = async () => {
      try {
        const response = await makeGlobalDeduplicatedRequest(`/api/guilds/${guildId}/groups`, { headers: authHeader });
        console.log("🔍 Raw groups API response:", response);
        
        if (response && Array.isArray(response)) {
          console.log("🔍 Setting groups:", response);
          setGroups(response);
        } else if (response && response.groups && Array.isArray(response.groups)) {
          console.log("🔍 Setting groups from response.groups:", response.groups);
          setGroups(response.groups);
        } else {
          console.warn("🔍 Groups response is not an array:", response);
          setGroups([]);
        }
      } catch (error) {
        console.error("🔍 Error fetching groups:", error);
        setGroups([]);
      }
    };

    fetchGroups();
  }, [guildId, authHeader]);

   // Close channel selector when clicking outside
   useEffect(() => {
     const handleClickOutside = (event: MouseEvent) => {
       const target = event.target as Element;
       if (!target.closest('.channel-selector')) {
         setChannelSelectorOpen(false);
       }
     };

     if (channelSelectorOpen) {
       document.addEventListener('mousedown', handleClickOutside);
     }

     return () => {
       document.removeEventListener('mousedown', handleClickOutside);
     };
   }, [channelSelectorOpen]);

     const startNew = () => {
     setEditing(null);
     setSelectedChannels([]);
     setTitle("");
     setDescription("");
     setColor("#5865F2");
     setImageUrl("");
     setThumbnailUrl("");
     setAuthorName("");
     setAuthorIconUrl("");
     setFooterText("");
     setFooterIconUrl("");
     setShowTimestamp(true);
     setEnableButtons(false);
     setButtons([]);
   };

     const startEdit = (config: EmbeddedMessageConfig) => {
     setEditing(config);
     
     // Handle multi-channel messages - if config has channels array, use it; otherwise fall back to single channel
     if (config.channels && config.channels.length > 0) {
       setSelectedChannels(config.channels);
     } else {
       // Fallback for legacy single-channel messages
       setSelectedChannels([{
         guildId: guildId,
         channelId: String(config.channelId || ""),
         guildName: "Current Server",
         channelName: channels.find(ch => String(ch.id) === String(config.channelId))?.name || `#${config.channelId}`
       }]);
     }
     
     setTitle(config.title || "");
     setDescription(config.description || "");
     setColor(config.color ? `#${config.color.toString(16).padStart(6, '0')}` : "#5865F2");
     setImageUrl(config.imageUrl || "");
     setThumbnailUrl(config.thumbnailUrl || "");
     setAuthorName(config.author?.name || "");
     setAuthorIconUrl(config.author?.iconUrl || "");
     setFooterText(config.footer?.text || "");
     setFooterIconUrl(config.footer?.iconUrl || "");
     setShowTimestamp(config.timestamp !== null);
     setEnableButtons(config.enableButtons || false);
     setButtons(config.buttons || []);
   };

  const cancelEdit = () => {
    setEditing(null);
    startNew();
  };

  const refresh = async () => {
    // Only refresh embedded messages, not all data
    try {
      const cRes = await makeGlobalDeduplicatedRequest(`/api/proxy/guilds/${guildId}/embedded-messages`, { headers: authHeader }).catch(() => ({ configs: [] }));
      const configsArray = Array.isArray(cRes?.configs) ? cRes.configs : [];
      setConfigs(configsArray);
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

     const doPublish = async () => {
     setPublishMsg(null);
     if (!guildId) { setPublishMsg("Missing guildId"); return; }
     if (selectedChannels.length === 0) { setPublishMsg("Pick at least one channel"); return; }
     
     try {
       setPublishing(true);
       const convertedTitle = title ? convertMentions(title) : undefined;
       const convertedDescription = description ? convertMentions(description) : undefined;
       const convertedAuthorName = authorName ? convertMentions(authorName) : undefined;
       const convertedFooterText = footerText ? convertMentions(footerText) : undefined;
       
       const body = {
         title: convertedTitle,
         description: convertedDescription,
         color: color ? parseInt(color.replace('#', ''), 16) : undefined,
         thumbnailUrl: thumbnailUrl || undefined,
         imageUrl: imageUrl || undefined,
         author: (authorName || authorIconUrl) ? { 
           name: convertedAuthorName, 
           iconUrl: authorIconUrl || undefined 
         } : undefined,
         footer: (footerText || footerIconUrl) ? { 
           text: convertedFooterText, 
           iconUrl: footerIconUrl || undefined 
         } : undefined,
         timestamp: showTimestamp ? Date.now() : undefined,
         enabled: true,
         createdBy: (session?.user as any)?.name || (session?.user as any)?.username || 'ServerMate Bot',
         enableButtons: enableButtons,
         buttons: enableButtons ? buttons : undefined,
       };

       if (editing && editing.id) {
         // Update existing message - send to current guild's API with all channels
         const res = await fetch(`/api/proxy/guilds/${guildId}/embedded-messages/${editing.id}`, {
           method: 'PUT',
           headers: { 'content-type': 'application/json', ...authHeader }, 
           body: JSON.stringify({ 
             ...body, 
             channelId: selectedChannels[0].channelId, // Primary channel for backward compatibility
             channels: selectedChannels // All channels to update
           })
         });
         
         if (!res.ok) {
           setPublishMsg("Failed to update message");
           return;
         }
         
         const result = await res.json();
         if (result.success) {
           toast({ title: "Updated", description: `Updated across ${selectedChannels.length} channel${selectedChannels.length > 1 ? 's' : ''}`, duration: 3000 });
         } else {
           setPublishMsg(result.message || "Failed to update message");
         }
       } else {
         // Create new message - send to current guild's API with all channels
         const res = await fetch(`/api/proxy/guilds/${guildId}/embedded-messages`, {
           method: 'POST',
           headers: { 'content-type': 'application/json', ...authHeader }, 
           body: JSON.stringify({ 
             ...body, 
             channelId: selectedChannels[0].channelId, // Primary channel for backward compatibility
             channels: selectedChannels // All channels to send to
           })
         });
         
         if (!res.ok) {
           setPublishMsg("Failed to publish message");
           return;
         }
         
         const result = await res.json();
         if (result.success) {
           toast({ title: "Published", description: `Posted to ${selectedChannels.length} channel${selectedChannels.length > 1 ? 's' : ''}`, duration: 3000 });
         } else {
           setPublishMsg(result.message || "Failed to publish message");
         }
       }
       
       await logAction({ 
         guildId, 
         userId: (session?.user as any)?.id || "", 
         actionType: editing ? "embedded-message.update" : "embedded-message.create", 
         user: { id: (session?.user as any)?.id || "" }, 
         actionData: { title: title, id: editing?.id, channels: selectedChannels.length } 
       });
       
       // Clear editing state and form
       setEditing(null);
       startNew();
       
       // Refresh the list
       await refresh();
       
     } catch (e:any) {
       setPublishMsg(e?.message || "Publish failed");
     } finally {
       setPublishing(false);
     }
   };

  const toggle = async (c: EmbeddedMessageConfig, enable: boolean) => {
    try {
      const res = await fetch(`/api/proxy/guilds/${guildId}/embedded-messages/${c.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json', ...authHeader }, body: JSON.stringify({ enabled: enable })
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || `Failed (${res.status})`);
      toast({ title: enable ? "Enabled" : "Disabled", duration: 2500 });
      await logAction({ guildId, userId: (session?.user as any)?.id || "", actionType: enable ? "embedded-message.enable" : "embedded-message.disable", user: { id: (session?.user as any)?.id || "" }, actionData: { id: c.id } });
      
      // Refresh the full data to get updated messageId
      await refresh();
    } catch (e:any) {
      toast({ title: "Toggle failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  };

  const doDelete = async (c: EmbeddedMessageConfig) => {
    try {
      const res = await fetch(`/api/proxy/guilds/${guildId}/embedded-messages/${c.id}`, { method: 'DELETE', headers: authHeader });
      if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || `Failed (${res.status})`);
      toast({ title: "Deleted", description: "Embedded message sent", duration: 3000 });
      await logAction({ guildId, userId: (session?.user as any)?.id || "", actionType: "embedded-message.delete", user: { id: (session?.user as any)?.id || "" }, actionData: { id: c.id } });
      setConfigs(prev => prev.filter(x => x.id !== c.id));
    } catch (e:any) {
      toast({ title: "Delete failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  };

  // Function to render text with styled mentions
  const renderTextWithMentions = useCallback((text: string) => {
    if (!text) return text;
    
    // Split text by @ mentions and render each part
    const parts = text.split(/(@\w+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1); // Remove @
        const userId = usernameMap.get(username.toLowerCase());
        
        if (userId) {
          // Valid mention - style it
          return (
            <span 
              key={index} 
              className="inline-block bg-blue-100 text-blue-800 px-1 rounded text-sm font-medium border border-blue-200"
              title={`Mention: ${username} (${userId})`}
            >
              {part}
            </span>
          );
        } else {
          // Invalid mention - style as error
          return (
            <span 
              key={index} 
              className="inline-block bg-red-100 text-red-800 px-1 rounded text-sm font-medium border border-red-200"
              title="Invalid username"
            >
              {part}
            </span>
          );
        }
      }
      return part;
    });
  }, [usernameMap]);

  // Simple inline styled input that shows mentions with CSS
  const InlineStyledInput = useCallback(({ 
    value, 
    onChange, 
    placeholder, 
    className, 
    field 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string; 
    className: string;
    field: string;
  }) => {
    const [isFocused, setIsFocused] = useState(false);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      
      // Check for @ mentions and handle them
      const atIndex = newValue.lastIndexOf('@');
      if (atIndex !== -1) {
        const afterAt = newValue.slice(atIndex + 1);
        const spaceIndex = afterAt.indexOf(' ');
        const endIndex = spaceIndex !== -1 ? spaceIndex : afterAt.length;
        const usernamePart = afterAt.slice(0, endIndex);
        
        if (usernamePart.length > 0) {
          const exactMatch = usernameMap.get(usernamePart.toLowerCase());
          
          if (exactMatch) {
            // Don't show dropdown for exact matches
            setShowUserSearch(false);
            setActiveMentionField(null);
            setMentionPosition(null);
            setUserSearchQuery("");
          } else {
            // Show dropdown for search
            setShowUserSearch(true);
            setUserSearchQuery(usernamePart);
            setActiveMentionField(field);
            setMentionPosition({ start: atIndex, end: atIndex + usernamePart.length + 1 });
          }
        } else {
          setShowUserSearch(false);
        }
      } else {
        setShowUserSearch(false);
      }
    };
    
    // Create CSS classes for inline mention styling
    const getInputClassName = () => {
      let baseClass = className;
      
      // Add mention styling if there are @ mentions
      if (value.includes('@')) {
        baseClass += ' mention-styled';
      }
      
      return baseClass;
    };
    
    return (
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={getInputClassName()}
        />
        
        {/* Inline mention styling overlay */}
        {isFocused && value.includes('@') && (
          <div 
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              padding: 'inherit',
              border: 'none',
              background: 'transparent',
              color: 'transparent'
            }}
          >
            {renderTextWithMentions(value)}
          </div>
        )}
      </div>
    );
  }, [usernameMap, setShowUserSearch, setActiveMentionField, setMentionPosition, setUserSearchQuery, renderTextWithMentions]);

  // React Mentions textarea with fallback
  const MentionsTextarea = useCallback(({ 
    value, 
    onChange, 
    placeholder, 
    className, 
    field,
    rows = 2
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string; 
    className: string;
    field: string;
    rows?: number;
  }) => {
    // Ensure value is always a string
    const safeValue = value || '';
    
    // Convert guild members to the format React Mentions expects
    const mentionData = useMemo(() => {
      if (!guildMembers || guildMembers.length === 0) {
        console.log('🔍 No guild members available for mentions');
        return [];
      }
      
      const validMembers = guildMembers.filter(member => {
        const isValid = member && member.discordUserId;
        if (!isValid) {
          console.warn('🔍 Invalid member filtered out:', member);
        }
        return isValid;
      });
      
      const result = validMembers.map(member => ({
        id: member.discordUserId,
        display: member.username || member.displayName || member.nickname || 'Unknown'
      }));
      

      
      return result;
    }, [guildMembers]);

    // React Mentions with proper data validation
    const handleMentionsChange = (event: any, newValue: string, newPlainTextValue: string, mentions: any[]) => {
      onChange(newValue);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    // Ensure we have absolutely clean data for React Mentions
    const cleanMentionData = useMemo(() => {
      if (!mentionData || mentionData.length === 0) return [];
      
      return mentionData
        .filter(item => {
          // Strict validation - only allow perfect data
          return item && 
                 item.id && 
                 item.display && 
                 typeof item.id === 'string' && 
                 typeof item.display === 'string' &&
                 item.id.trim() !== '' && 
                 item.display.trim() !== '' &&
                 !item.id.includes('undefined') && 
                 !item.display.includes('undefined') &&
                 !item.id.includes('null') && 
                 !item.display.includes('null');
        })
        .map(item => ({
          id: String(item.id).trim(),
          display: String(item.display).trim()
        }));
    }, [mentionData]);

    const canUseReactMentions = cleanMentionData.length > 0;

    

    if (canUseReactMentions) {
      // Custom mentions implementation since React Mentions keeps crashing
      const [showMentions, setShowMentions] = useState(false);
      const [mentionQuery, setMentionQuery] = useState("");
      const [cursorPosition, setCursorPosition] = useState(0);
      
      const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        
        // Check if we should show mentions dropdown
        const lastAtSymbol = value.lastIndexOf('@', cursorPos - 1);
        if (lastAtSymbol !== -1 && lastAtSymbol < cursorPos) {
          const query = value.slice(lastAtSymbol + 1, cursorPos);
          setMentionQuery(query);
          setShowMentions(true);
          setCursorPosition(cursorPos);
        } else {
          setShowMentions(false);
        }
        
        onChange(value);
      };
      
      const insertMention = (userId: string, username: string) => {
        const beforeMention = safeValue.slice(0, cursorPosition - mentionQuery.length - 1);
        const afterMention = safeValue.slice(cursorPosition);
        // Insert with a clear, visual format that shows it's a real mention
        const newValue = beforeMention + `@${username} ` + afterMention;
        
        onChange(newValue);
        setShowMentions(false);
        setMentionQuery("");
      };
      
      // Optimized mentions filtering with debouncing
      const filteredMentions = useMemo(() => {
        if (!mentionQuery || mentionQuery.length < 2) return [];
        
        // Only filter if query is 2+ characters to reduce processing
        const query = mentionQuery.toLowerCase();
        const results = [];
        
        // Manual loop is faster than filter for small datasets
        for (let i = 0; i < cleanMentionData.length && results.length < 8; i++) {
          const item = cleanMentionData[i];
          if (item.display.toLowerCase().includes(query)) {
            results.push(item);
          }
        }
        
        return results;
      }, [mentionQuery, cleanMentionData]);
      
      // Auto-resize textarea with aggressive debouncing
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
      
      useEffect(() => {
        // Clear any existing timeout
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        
        // Much longer debounce to reduce reflows
        resizeTimeoutRef.current = setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
          }
        }, 200); // 200ms delay - much longer debounce
        
        // Cleanup timeout on unmount
        return () => {
          if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current);
            resizeTimeoutRef.current = null;
          }
        };
      }, [safeValue]);

      return (
        <div className="relative">
          {/* Auto-expanding textarea with styled mentions */}
          <textarea
            ref={textareaRef}
            value={safeValue ?? ""}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={className}
            rows={rows}
            style={{ 
              minHeight: `${rows * 1.5}rem`,
              resize: 'none',
              overflow: 'hidden'
            }}
          />
          
          {/* Show styled mentions below the textarea - optimized */}
          {(() => {
            if (!safeValue || !safeValue.includes('@')) return null;
            
            // Memoize the mentions parsing to avoid expensive regex on every render
            const mentions = safeValue.match(/@\w+/g) || [];
            if (mentions.length === 0) return null;
            
            return (
              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                <div className="text-gray-600 mb-1">Mentions:</div>
                <div className="flex flex-wrap gap-1">
                  {mentions.map((mention, index) => {
                    const username = mention.slice(1);
                    // Use a Map for O(1) lookup instead of find()
                    const user = cleanMentionData.find(item => 
                      item.display.toLowerCase() === username.toLowerCase()
                    );
                    
                    if (user) {
                      return (
                        <span key={index} className="inline-flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-200">
                          <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
                          {mention}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })()}
          
          {/* Custom mentions dropdown */}
          {showMentions && filteredMentions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {filteredMentions.map((item) => (
                <div
                  key={item.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => insertMention(item.id, item.display)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                      {item.display.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.display}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // Fallback to regular textarea
    return (
      <div className="relative">
        <textarea
          value={safeValue}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          className={className}
          rows={rows}
          style={{ 
            minHeight: `${rows * 1.5}rem`,
            resize: 'vertical'
          }}
        />
        
        

      </div>
    );
  }, [guildMembers]);



  return (
    <>
      <style jsx>{`
        .mention-styled {
          background: linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.1) 100%);
        }
        
        .mention-styled:focus {
          background: linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.15) 100%);
        }



        /* React Mentions styling - clean and simple */

      `}</style>
      
      <div className="flex gap-6 h-full">
                                                                                                               {/* Left Column: Form */}
            <div className="space-y-6 h-full flex-1 min-h-[700px] flex flex-col" style={{ minHeight: '700px' }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editing ? `Edit: ${editing.title || 'Untitled'}` : 'Create New Message'}
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {editing && (
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={startNew}>
                {editing ? 'New Message' : 'Clear Form'}
              </Button>
            </div>
          </div>

                                                                                                  {/* Editor */}
              <div className="rounded-xl border p-4 bg-card space-y-4 flex-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <LayoutGridIcon className="w-4 h-4"/> Compose an embed-style message.
            </div>
            
                         {/* Channel selector */}
             <div className="space-y-2">
               <label className="block text-sm font-medium">Channels</label>
               <div className="relative channel-selector">
                 <button
                   type="button"
                   onClick={() => setChannelSelectorOpen(!channelSelectorOpen)}
                   className="w-full px-3 py-2 border rounded-md bg-background text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                 >
                   <span className="text-sm">
                     {selectedChannels.length === 0 
                       ? "Select channels..." 
                       : `${selectedChannels.length} channel${selectedChannels.length !== 1 ? 's' : ''} selected`
                     }
                   </span>
                   <svg className={`w-4 h-4 transition-transform ${channelSelectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                   </svg>
                 </button>
                 
                 {channelSelectorOpen && (
                   <div className="absolute z-[9999] w-full mt-1 bg-white border rounded-md shadow-xl max-h-96 overflow-hidden">
                     <div className="grid grid-cols-2 gap-0 h-full">
                       {/* Current Server Section */}
                       <div className="border-r border-gray-200 p-3">
                         <div className="flex items-center gap-2 mb-3">
                           <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                           <span className="text-sm font-semibold text-gray-700">Current Server</span>
                           <span className="text-xs text-gray-500">({channels.length} channels)</span>
                         </div>
                         
                         {/* Search for current server */}
                         <div className="mb-3">
                           <input
                             type="text"
                             placeholder="Search channels..."
                             value={currentServerSearch}
                             onChange={(e) => setCurrentServerSearch(e.target.value)}
                             className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                           />
                         </div>
                         
                         {/* Current server channels */}
                         <div className="space-y-1 max-h-48 overflow-y-auto">
                           {filteredCurrentServerChannels.map(ch => (
                             <label key={ch.id} className="flex items-center space-x-2 cursor-pointer px-2 py-1 hover:bg-gray-50 rounded text-sm">
                               <input
                                 type="checkbox"
                                 checked={selectedChannels.some(sc => sc.guildId === guildId && sc.channelId === ch.id)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setSelectedChannels(prev => [...prev, {
                                       guildId: guildId,
                                       channelId: ch.id,
                                       guildName: "Current Server",
                                       channelName: ch.name
                                     }]);
                                   } else {
                                     setSelectedChannels(prev => prev.filter(sc => !(sc.guildId === guildId && sc.channelId === ch.id)));
                                   }
                                 }}
                                 className="rounded border-gray-300"
                               />
                               <span className="truncate">#{ch.name}</span>
                             </label>
                           ))}
                         </div>
                       </div>
                       
                       {/* Grouped Servers Section */}
                       <div className="p-3">
                         <div className="flex items-center gap-2 mb-3">
                           <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                           <span className="text-sm font-semibold text-gray-700">Grouped Servers</span>
                           <span className="text-xs text-gray-500">({groups.reduce((acc, g) => acc + (g.guilds?.length || 0), 0)} servers)</span>
                         </div>
                         
                         {/* Search for grouped servers */}
                         <div className="mb-3">
                           <input
                             type="text"
                             placeholder="Search across all servers..."
                             value={groupedServersSearch}
                             onChange={(e) => setGroupedServersSearch(e.target.value)}
                             className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                           />
                         </div>
                         
                         {/* Grouped servers (collapsed by default) */}
                         <div className="space-y-2 max-h-48 overflow-y-auto">
                           {filteredGroupedServersChannels.map(group => (
                             <div key={group.id} className="space-y-2">
                               <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded">
                                 <span className="text-xs font-medium text-gray-600">{group.name}</span>
                                 <span className="text-xs text-gray-400">({group.guilds?.length || 0} servers)</span>
                               </div>
                               
                               {group.guilds?.map((guild: any) => (
                                 <div key={guild.id} className="ml-3 space-y-1">
                                   <button
                                     type="button"
                                     onClick={() => toggleGuildExpansion(guild.id)}
                                     className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-gray-50 rounded text-xs font-medium text-gray-500"
                                   >
                                     <svg className={`w-3 h-3 transition-transform ${expandedGuilds.has(guild.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
                                     </svg>
                                     {guild.name} ({guild.channels?.length || 0} channels)
                                   </button>
                                   
                                   {/* Channels list (collapsed by default) */}
                                   <div className={`ml-3 space-y-1 ${expandedGuilds.has(guild.id) ? '' : 'hidden'}`}>
                                     {guild.channels?.map((channel: any) => (
                                       <label key={channel.id} className="flex items-center space-x-2 cursor-pointer px-2 py-1 hover:bg-gray-50 rounded text-xs">
                                         <input
                                           type="checkbox"
                                           checked={selectedChannels.some(sc => sc.guildId === guild.id && sc.channelId === channel.id)}
                                           onChange={(e) => {
                                             if (e.target.checked) {
                                               setSelectedChannels(prev => [...prev, {
                                                 guildId: guild.id,
                                                 channelId: channel.id,
                                                 guildName: guild.name,
                                                 channelName: channel.name
                                               }]);
                                             } else {
                                               setSelectedChannels(prev => prev.filter(sc => !(sc.guildId === guild.id && sc.channelId === channel.id)));
                                             }
                                           }}
                                           className="rounded border-gray-300"
                                         />
                                         <span className="truncate">#{channel.name}</span>
                                       </label>
                                     ))}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                     
                     {/* Quick actions footer */}
                     <div className="border-t border-gray-200 p-3 bg-gray-50">
                       <div className="flex gap-2">
                         <button
                           type="button"
                           onClick={() => {
                             const allChannels = [
                               ...channels.map(ch => ({
                                 guildId: guildId,
                                 channelId: ch.id,
                                 guildName: "Current Server",
                                 channelName: ch.name
                               })),
                               ...groups.flatMap(group => 
                                 group.guilds?.flatMap((guild: any) => 
                                   guild.channels?.map((channel: any) => ({
                                     guildId: guild.id,
                                     channelId: channel.id,
                                     guildName: guild.name,
                                     channelName: channel.name
                                   })) || []
                                 ) || []
                               )
                             ];
                             setSelectedChannels(allChannels);
                           }}
                           className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                         >
                           Select All
                         </button>
                         <button
                           type="button"
                           onClick={() => setSelectedChannels([])}
                           className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                         >
                           Clear All
                         </button>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
               
               {/* Selected channels display */}
               {selectedChannels.length > 0 && (
                 <div className="space-y-2">
                   <div className="text-xs text-muted-foreground">Selected channels:</div>
                   <div className="flex flex-wrap gap-2">
                     {selectedChannels.map((channel, index) => (
                       <span
                         key={`${channel.guildId}-${channel.channelId}`}
                         className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-full"
                       >
                         <span className="font-medium">{channel.guildName === "Current Server" ? "Current" : channel.guildName}</span>
                         <span className="text-blue-600">#{channel.channelName}</span>
                         <button
                           type="button"
                           onClick={() => setSelectedChannels(prev => prev.filter((_, i) => i !== index))}
                           className="ml-1 hover:bg-blue-100 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                         >
                           ×
                         </button>
                       </span>
                     ))}
                   </div>
                 </div>
               )}
             </div>

            {/* Inline editor only */}
            <div className="flex items-center justify-between mb-0">
              <label className="block text-sm font-medium">Embed Editor</label>
            </div>

            {/* Preview container */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2" />
              <div className="rounded-lg border bg-background p-3">
                {/* Simulated Discord message container */}
                <div className="flex items-start gap-3">
                  {/* Circular color picker trigger */}
                  <button
                    type="button"
                    onClick={() => { setTempColor(color); setColorModalOpen(true); }}
                    className="relative h-9 w-9 rounded-full border-2 border-border cursor-pointer overflow-hidden shadow-sm hover:shadow transition"
                    title="Set embed color"
                  >
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundImage: 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                    />
                    <span
                      className="absolute inset-1 rounded-full border"
                      style={{ backgroundColor: color }}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                                         {/* Username + timestamp */}
                     <div className="mb-1 text-sm flex items-center gap-3">
                       <span className="font-semibold">ServerMate Bot</span>
                       {showTimestamp && (
                         <span className="ml-2 text-xs text-muted-foreground">Just now</span>
                       )}
                     </div>

                    {/* Embed card */}
                    <div className="relative rounded-md border bg-card p-3" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                      {/* Thumbnail on the right */}
                      <div className="absolute right-3 top-3 w-24">
                        {thumbnailUrl ? (
                          <div className="relative">
                            <img src={thumbnailUrl} alt="thumb" className="w-20 h-20 rounded object-cover border" />
                            <button
                              type="button"
                              onClick={() => {
                                setTempThumbnailUrl(thumbnailUrl);
                                setThumbnailModalOpen(true);
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                              title="Remove thumbnail"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempThumbnailUrl("");
                              setThumbnailModalOpen(true);
                            }}
                            className="w-20 h-20 rounded border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            title="Add thumbnail"
                          >
                            <ImageIcon className="w-6 h-6" />
                          </button>
                        )}
                      </div>

                      {/* Author row */}
                      <div className={`flex items-center gap-2 text-xs text-muted-foreground mb-2 w-full`}>
                                                 <button
                           type="button"
                           onClick={() => {
                             setTempAuthorIconUrl(authorIconUrl);
                             setAuthorIconModalOpen(true);
                           }}
                           className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors overflow-hidden"
                           title="Set author icon"
                         >
                          {authorIconUrl ? (
                            <img src={authorIconUrl} alt="author" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </button>
                                                 <div className="relative">
                           <InlineStyledInput
                             value={authorName}
                             onChange={setAuthorName}
                             placeholder="Author name"
                             className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                             field="authorName"
                           />
                           {showUserSearch && activeMentionField === 'authorName' && (
                             <div className="absolute z-[9999] bg-background border rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto min-w-64" 
                                  style={{
                                    top: '100%',
                                    left: '0',
                                    marginTop: '4px'
                                  }}>
                               <div className="text-xs text-muted-foreground mb-2 px-2">
                                 Select user to mention:
                               </div>
                               {filteredUsers.length > 0 ? (
                                 filteredUsers.map((user) => (
                                   <button
                                     key={user.discordUserId}
                                     onClick={() => {
                                       console.log("🔍 User clicked:", user);
                                       console.log("🔍 user.discordUserId:", user.discordUserId, "type:", typeof user.discordUserId);
                                       insertUserMention(user.username || user.displayName || user.nickname, user.discordUserId);
                                     }}
                                     className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm flex items-center gap-2"
                                   >
                                     <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                       {user.username?.charAt(0)?.toUpperCase() || '?'}
                                     </div>
                                     <div>
                                       <div className="font-medium">{user.username}</div>
                                       {user.displayName && user.displayName !== user.username && (
                                         <div className="text-xs text-muted-foreground">{user.displayName}</div>
                                       )}
                                     </div>
                                   </button>
                                 ))
                               ) : (
                                 <div className="px-2 py-2 text-sm text-muted-foreground">
                                   No users found matching "{userSearchQuery}"
                                 </div>
                               )}
                               <button
                                 onClick={() => setShowUserSearch(false)}
                                 className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm text-muted-foreground mt-1"
                               >
                                 Cancel
                               </button>
                             </div>
                           )}
                         </div>
                      </div>

                      {/* Title / Description */}
                      <div className="text-xs text-muted-foreground mb-2">
                        💡 Tip: Type @username to mention users (e.g., @sutto)
                      </div>
                      
                      {/* Title Input */}
                      <div className="relative">
                        <InlineStyledInput
                          value={title}
                          onChange={setTitle}
                          placeholder="Embed title"
                          className="font-semibold leading-snug mb-2 w-[24rem] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          field="title"
                        />
                         {showUserSearch && activeMentionField === 'title' && (
                           <div className="absolute z-[9999] bg-background border rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto min-w-64" 
                                style={{
                                  top: '100%',
                                  left: '0',
                                  marginTop: '4px'
                                }}>
                             <div className="text-xs text-muted-foreground mb-2 px-2">
                               Select user to mention:
                             </div>
                             {filteredUsers.length > 0 ? (
                               filteredUsers.map((user) => (
                                 <button
                                   key={user.discordUserId}
                                   onClick={() => insertUserMention(user.username || user.displayName || user.nickname, user.discordUserId)}
                                   className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm flex items-center gap-2"
                                 >
                                   <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                     {user.username?.charAt(0)?.toUpperCase() || '?'}
                                   </div>
                                   <div>
                                     <div className="font-medium">{user.username}</div>
                                     {user.displayName && user.displayName !== user.username && (
                                       <div className="text-xs text-muted-foreground">{user.displayName}</div>
                                     )}
                                   </div>
                                 </button>
                               ))
                             ) : (
                               <div className="px-2 py-2 text-sm text-muted-foreground">
                                 No users found matching "{userSearchQuery}"
                               </div>
                             )}
                             <button
                               onClick={() => setShowUserSearch(false)}
                               className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm text-muted-foreground mt-1"
                             >
                               Cancel
                             </button>
                           </div>
                         )}
                       </div>
                                             <div className="relative">
                                                   <MentionsTextarea
                             value={description}
                             onChange={setDescription}
                             placeholder="Embed description"
                             className="text-sm whitespace-pre-wrap text-muted-foreground px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                             field="description"
                            rows={2}
                           />
                         {showUserSearch && activeMentionField === 'description' && (
                           <div className="absolute z-[9999] bg-background border rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto min-w-64" 
                                style={{
                                  top: '100%',
                                  left: '0',
                                  marginTop: '4px'
                                }}>
                             <div className="text-xs text-muted-foreground mb-2 px-2">
                               Select user to mention:
                             </div>
                             {filteredUsers.length > 0 ? (
                               filteredUsers.map((user) => (
                                 <button
                                   key={user.discordUserId}
                                   onClick={() => insertUserMention(user.username || user.displayName || user.nickname, user.discordUserId)}
                                   className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm flex items-center gap-2"
                                 >
                                   <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                     {user.username?.charAt(0)?.toUpperCase() || '?'}
                                   </div>
                                   <div>
                                     <div className="font-medium">{user.username}</div>
                                     {user.displayName && user.displayName !== user.username && (
                                       <div className="text-xs text-muted-foreground">{user.displayName}</div>
                                     )}
                                   </div>
                                 </button>
                               ))
                             ) : (
                               <div className="px-2 py-2 text-sm text-muted-foreground">
                                 No users found matching "{userSearchQuery}"
                               </div>
                             )}
                             <button
                               onClick={() => setShowUserSearch(false)}
                               className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm text-muted-foreground mt-1"
                             >
                               Cancel
                             </button>
                           </div>
                         )}
                       </div>
                      


                      {/* Large image below */}
                      <div className="mt-3">
                        {imageUrl ? (
                          <div className="relative">
                            <img src={imageUrl} alt="embed" className="w-full max-h-56 rounded object-cover border" />
                            <button
                              type="button"
                              onClick={() => {
                                setTempImageUrl(imageUrl);
                                setImageModalOpen(true);
                              }}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                              title="Remove image"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempImageUrl("");
                              setImageModalOpen(true);
                            }}
                            className="w-full h-32 rounded border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            title="Add large image"
                          >
                            <ImageIcon className="w-8 h-8" />
                          </button>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                                                 <button
                           type="button"
                           onClick={() => {
                             setTempFooterIconUrl(footerIconUrl);
                             setFooterIconModalOpen(true);
                           }}
                           className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors overflow-hidden"
                           title="Set footer icon"
                         >
                          {footerIconUrl ? (
                            <img src={footerIconUrl} alt="footer" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </button>
                                                 <div className="relative">
                           <InlineStyledInput
                             value={footerText}
                             onChange={setFooterText}
                             placeholder="Footer text"
                             className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm text-foreground bg-background"
                             field="footerText"
                           />
                           {showUserSearch && activeMentionField === 'footerText' && (
                             <div className="absolute z-[9999] bg-background border rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto min-w-64" 
                                  style={{
                                    top: '100%',
                                    left: '0',
                                    marginTop: '4px'
                                  }}>
                               <div className="text-xs text-muted-foreground mb-2 px-2">
                                 Select user to mention:
                               </div>
                               {filteredUsers.length > 0 ? (
                                 filteredUsers.map((user) => (
                                   <button
                                     key={user.discordUserId}
                                     onClick={() => insertUserMention(user.username || user.displayName || user.nickname, user.discordUserId)}
                                     className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm flex items-center gap-2"
                                   >
                                     <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                       {user.username?.charAt(0)?.toUpperCase() || '?'}
                                     </div>
                                     <div>
                                       <div className="font-medium">{user.username}</div>
                                       {user.displayName && user.displayName !== user.username && (
                                         <div className="text-xs text-muted-foreground">{user.displayName}</div>
                                       )}
                                     </div>
                                   </button>
                                 ))
                               ) : (
                                 <div className="px-2 py-2 text-sm text-muted-foreground">
                                   No users found matching "{userSearchQuery}"
                                 </div>
                               )}
                               <button
                                 onClick={() => setShowUserSearch(false)}
                                 className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm text-muted-foreground mt-1"
                               >
                                 Cancel
                               </button>
                             </div>
                           )}
                         </div>
                                                 {showTimestamp && <span className="ml-auto">Just now</span>}
                      </div>
                      
                      {/* Buttons preview */}
                      {enableButtons && buttons.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex flex-wrap gap-2">
                            {buttons.map((button, index) => (
                              <button
                                key={button.id}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  button.style === 'primary' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                                  button.style === 'secondary' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' :
                                  button.style === 'danger' ? 'bg-red-500 text-white hover:bg-red-600' :
                                  'bg-transparent text-blue-500 hover:bg-blue-50 underline'
                                }`}
                                title={`${button.label} - ${button.url}`}
                              >
                                {button.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timestamp toggle */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showTimestamp} onChange={e => setShowTimestamp(e.target.checked)} />
                <span className="text-sm font-medium">Show timestamp</span>
              </label>
            </div>

            {/* Button toggle */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={enableButtons} 
                  onChange={e => setEnableButtons(e.target.checked)} 
                />
                <span className="text-sm font-medium">Enable buttons</span>
              </label>
            </div>

            {/* Button management */}
            {enableButtons && (
              <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Message Buttons</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addButton}
                    className="text-xs"
                  >
                    + Add Button
                  </Button>
                </div>
                
                {buttons.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No buttons added yet. Click "Add Button" to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {buttons.map((button, index) => (
                      <div key={button.id} className="p-3 border border-gray-200 rounded bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">Button {index + 1}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeButton(button.id)}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Label</label>
                            <Input
                              value={button.label}
                              onChange={(e) => updateButton(button.id, 'label', e.target.value)}
                              placeholder="Button text"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Style</label>
                            <select
                              value={button.style}
                              onChange={(e) => updateButton(button.id, 'style', e.target.value)}
                              className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="primary">Primary</option>
                              <option value="secondary">Secondary</option>
                              <option value="danger">Danger</option>
                              <option value="link">Link</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">URL</label>
                          <Input
                            value={button.url}
                            onChange={(e) => updateButton(button.id, 'url', e.target.value)}
                            placeholder="https://example.com"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

                         {/* Publish button */}
             <Button
               onClick={doPublish}
               disabled={selectedChannels.length === 0 || publishing}
               className="w-full bg-gradient-to-r from-blue-500/90 to-blue-400/80 text-white shadow-md hover:shadow-lg hover:from-blue-600/90 hover:to-blue-500/80 focus-visible:ring-blue-400/40"
             >
               <SendIcon className="w-4 h-4 mr-2" /> {publishing ? 'Publishing…' : (editing ? 'Update Message' : `Publish to ${selectedChannels.length} Channel${selectedChannels.length !== 1 ? 's' : ''}`)}
             </Button>
            {publishMsg && <div className={`text-sm ${publishMsg.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>{publishMsg}</div>}
          </div>
        </div>

                                                                                                                                                                                                                        {/* Right Column: Embedded Message List */}
             <div className="space-y-6 h-full flex-1">
           {/* Header - matching left column spacing */}
           <div className="flex items-center justify-between">
             <h3 className="text-lg font-semibold">Embedded Messages</h3>
             <Button variant="secondary" size="sm" onClick={refresh}>
               <RefreshCwIcon className="w-4 h-4 mr-1"/>Refresh
             </Button>
           </div>
           
                                                                                                            {/* List Container - matching left column styling */}
                                                               <div className="rounded-xl border p-4 bg-card space-y-4 flex flex-col h-full max-h-[700px]">
             {/* Search */}
             <div className="relative">
               <Input
                 placeholder="Search by title, description, or channel..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-8"
               />
               <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               {searchQuery && (
                 <button
                   onClick={() => setSearchQuery("")}
                   className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground"
                 >
                   <XIcon className="w-4 h-4" />
                 </button>
               )}
             </div>
             
             <div className="text-sm text-muted-foreground">
               {loading ? 'Loading…' : `${filteredConfigs.length} of ${configs.length} configs`}
             </div>
             
             {filteredConfigs.length === 0 && !editing && (
               <div className="text-sm text-muted-foreground text-center py-8">
                 {searchQuery ? (
                   <div>
                     <div>No messages found matching "{searchQuery}"</div>
                     <button 
                       onClick={() => setSearchQuery("")}
                       className="text-blue-500 hover:text-blue-600 mt-2 underline"
                     >
                       Clear search
                     </button>
                   </div>
                 ) : (
                   'No embedded message configurations found.'
                 )}
               </div>
             )}
             
                                                                                                               <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                               {filteredConfigs.map(c => (
                  <div key={c.id} className="rounded border p-4 bg-card" style={{ borderLeftWidth: '4px', borderLeftColor: c.color ? `#${c.color.toString(16).padStart(6, '0')}` : '#5865F2' }}>
                   <div className="flex items-start justify-between mb-3">
                     <div className="min-w-0 flex-1">
                       <div className="font-semibold truncate text-base">
                         {c.title || '(Untitled)'}
                       </div>
                                               <div className="text-sm text-muted-foreground mt-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {c.description || 'No description'} 
                        </div>
                        
                        {/* Show buttons if enabled */}
                        {c.enableButtons && c.buttons && c.buttons.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">Buttons:</div>
                            <div className="flex flex-wrap gap-1">
                              {c.buttons.map((button, index) => (
                                <span
                                  key={button.id}
                                  className={`px-2 py-1 text-xs rounded border ${
                                    button.style === 'primary' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                    button.style === 'secondary' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                    button.style === 'danger' ? 'bg-red-100 text-red-800 border-red-200' :
                                    'bg-transparent text-blue-600 border-blue-200'
                                  }`}
                                  title={`${button.label} - ${button.url}`}
                                >
                                  {button.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                                                 <div className="text-xs text-muted-foreground mt-1">
                           {/* Show channels information */}
                           {c.channels && c.channels.length > 0 ? (
                             <div>
                               <div className="font-medium">Channels:</div>
                               <div className="flex flex-wrap gap-1 mt-1">
                                 {c.channels.map((channel, index) => (
                                   <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-full">
                                     <span className="font-medium">{channel.guildName === "Current Server" ? "Current" : channel.guildName}</span>
                                     <span className="text-blue-600">#{channel.channelName}</span>
                                   </span>
                                 ))}
                               </div>
                             </div>
                           ) : (
                             // Fallback for legacy single-channel messages
                             <div>
                               Channel: {channels.find(ch => String(ch.id) === String(c.channelId))?.name || `#${c.channelId}`}
                             </div>
                           )}
                         </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Created by: {c.createdBy || 'ServerMate Bot'}
                        </div>
                     </div>
                     <div className="flex items-center gap-2 ml-3">
                       <Button size="sm" onClick={() => startEdit(c)}>
                         Edit
                       </Button>
                       <Button 
                         size="sm" 
                         variant="secondary" 
                         onClick={() => toggle(c, !(c.enabled !== false))}
                       >
                         {(c.enabled !== false) ? 'Disable' : 'Enable'}
                       </Button>
                       <Button 
                         size="sm" 
                         className="bg-red-600 hover:bg-red-700" 
                         onClick={() => doDelete(c)}
                       >
                         <Trash2Icon className="w-4 h-4 mr-1"/>Delete
                       </Button>
                     </div>
                   </div>
                   
                                                           {/* Footer with status, dates, and Discord link */}
                     <div className="flex items-center justify-between text-xs mt-2">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${c.enabled !== false ? 'bg-green-500' : 'bg-gray-400'}`} />
                         <span className={c.enabled !== false ? 'text-green-600' : 'text-gray-500'}>
                           {c.enabled !== false ? 'Active' : 'Disabled'}
                         </span>
                         {c.createdAt && (
                           <span className="text-muted-foreground">
                             • Created: {new Date(c.createdAt).toLocaleDateString()}
                           </span>
                         )}
                         {c.updatedAt && (
                           <span className="text-muted-foreground">
                             • Updated: {new Date(c.updatedAt).toLocaleDateString()}
                           </span>
                         )}
                       </div>
                       
                                                                       {/* Discord message link */}
                        {c.messageId && (
                          <a 
                            href={`discord://discord.com/channels/${guildId}/${c.channelId}/${c.messageId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 underline flex items-center gap-1"
                            title="Open in Discord app (falls back to browser if app not available)"
                          >
                            <HashIcon className="w-3 h-3" />
                            View in Discord
                          </a>
                        )}
                                               
                     </div>
                 </div>
               ))}
             </div>
           </div>
         </div>
      </div>

      {/* Modals */}
      <Dialog open={colorModalOpen} onOpenChange={(o: boolean) => { if (!o) setColorModalOpen(false); }}>
        <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
          <DialogHeader>
            <DialogTitle>Pick embed color</DialogTitle>
            <DialogDescription>Choose a color for the embed accent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="color" value={tempColor} onChange={e => setTempColor(e.target.value)} />
            <Input value={tempColor} onChange={e => setTempColor(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=> setColorModalOpen(false)}>Cancel</Button>
            <Button onClick={() => { setColor(tempColor); setColorModalOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={thumbnailModalOpen} onOpenChange={(o: boolean) => { if (!o) setThumbnailModalOpen(false); }}>
        <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
          <DialogHeader>
            <DialogTitle>Set Thumbnail Image</DialogTitle>
            <DialogDescription>Enter the URL for the image. This will be displayed in the embed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <Input
                value={tempThumbnailUrl}
                onChange={(e) => setTempThumbnailUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full"
              />
            </div>
            {tempThumbnailUrl && (
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="border rounded p-2 bg-muted/30">
                  <img src={tempThumbnailUrl} alt="preview" className="max-w-full max-h-32 object-contain mx-auto" onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=> { setTempThumbnailUrl(''); setThumbnailModalOpen(false); }}>Cancel</Button>
            <Button onClick={()=> { setThumbnailUrl(tempThumbnailUrl); setThumbnailModalOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

             <Dialog open={imageModalOpen} onOpenChange={(o: boolean) => { if (!o) setImageModalOpen(false); }}>
         <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
           <DialogHeader>
             <DialogTitle>Set Large Image</DialogTitle>
             <DialogDescription>Enter the URL for the image. This will be displayed in the embed.</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium mb-2">Image URL</label>
               <Input
                 value={tempImageUrl}
                 onChange={(e) => setTempImageUrl(e.target.value)}
                 placeholder="https://example.com/image.png"
                 className="w-full"
               />
             </div>
             {tempImageUrl && (
               <div>
                 <label className="block text-sm font-medium mb-2">Preview</label>
                 <div className="border rounded p-2 bg-muted/30">
                   <img src={tempImageUrl} alt="preview" className="max-w-full max-h-32 object-contain mx-auto" onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} />
                 </div>
               </div>
             )}
           </div>
           <DialogFooter>
             <Button variant="secondary" onClick={()=> { setTempImageUrl(''); setImageModalOpen(false); }}>Cancel</Button>
             <Button onClick={()=> { setImageUrl(tempImageUrl); setImageModalOpen(false); }}>Save</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Author Icon Modal */}
       <Dialog open={authorIconModalOpen} onOpenChange={(o: boolean) => { if (!o) setAuthorIconModalOpen(false); }}>
         <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
           <DialogHeader>
             <DialogTitle>Set Author Icon</DialogTitle>
             <DialogDescription>Enter the URL for the author icon. This will be displayed next to the author name.</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium mb-2">Icon URL</label>
               <Input
                 value={tempAuthorIconUrl}
                 onChange={(e) => setTempAuthorIconUrl(e.target.value)}
                 placeholder="https://example.com/icon.png"
                 className="w-full"
               />
             </div>
             {tempAuthorIconUrl && (
               <div>
                 <label className="block text-sm font-medium mb-2">Preview</label>
                 <div className="border rounded p-2 bg-muted/30">
                   <img src={tempAuthorIconUrl} alt="preview" className="w-16 h-16 rounded-full object-cover mx-auto" onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} />
                 </div>
               </div>
             )}
           </div>
           <DialogFooter>
             <Button variant="secondary" onClick={()=> { setTempAuthorIconUrl(''); setAuthorIconModalOpen(false); }}>Cancel</Button>
             <Button onClick={()=> { setAuthorIconUrl(tempAuthorIconUrl); setAuthorIconModalOpen(false); }}>Save</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Footer Icon Modal */}
       <Dialog open={footerIconModalOpen} onOpenChange={(o: boolean) => { if (!o) setFooterIconModalOpen(false); }}>
         <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
           <DialogHeader>
             <DialogTitle>Set Footer Icon</DialogTitle>
             <DialogDescription>Enter the URL for the footer icon. This will be displayed next to the footer text.</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium mb-2">Icon URL</label>
               <Input
                 value={tempFooterIconUrl}
                 onChange={(e) => setTempFooterIconUrl(e.target.value)}
                 placeholder="https://example.com/icon.png"
                 className="w-full"
               />
             </div>
             {tempFooterIconUrl && (
               <div>
                 <label className="block text-sm font-medium mb-2">Preview</label>
                 <div className="border rounded p-2 bg-muted/30">
                   <img src={tempFooterIconUrl} alt="preview" className="w-16 h-16 rounded-full object-cover mx-auto" onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} />
                 </div>
               </div>
             )}
           </div>
           <DialogFooter>
             <Button variant="secondary" onClick={()=> { setTempFooterIconUrl(''); setFooterIconModalOpen(false); }}>Cancel</Button>
             <Button onClick={()=> { setFooterIconUrl(tempFooterIconUrl); setFooterIconModalOpen(false); }}>Save</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 }


