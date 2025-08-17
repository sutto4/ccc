"use client";

import React, { useEffect, useMemo, useState } from "react";
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
};

export default function EmbeddedMessagesBuilder({ premium }: { premium: boolean }) {
  const params = useParams<{ id: string }>();
  const guildId = params.id;
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [configs, setConfigs] = useState<EmbeddedMessageConfig[]>([]);
  const [editing, setEditing] = useState<EmbeddedMessageConfig | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [tempColor, setTempColor] = useState("#5865F2");
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [authorIconModalOpen, setAuthorIconModalOpen] = useState(false);
  const [footerIconModalOpen, setFooterIconModalOpen] = useState(false);
  const [tempThumbnailUrl, setTempThumbnailUrl] = useState("");
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [tempAuthorIconUrl, setTempAuthorIconUrl] = useState("");
  const [tempFooterIconUrl, setTempFooterIconUrl] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Form fields
  const [channelId, setChannelId] = useState("");
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

  const authHeader = useMemo(() => (
    (session as any)?.accessToken ? { Authorization: `Bearer ${(session as any).accessToken}` } : {}
  ), [(session as any)?.accessToken]) as HeadersInit;

  // Filter configs based on search query
  const filteredConfigs = useMemo(() => {
    if (!searchQuery.trim()) return configs;
    
    const query = searchQuery.toLowerCase();
    return configs.filter(config => {
      const title = (config.title || '').toLowerCase();
      const description = (config.description || '').toLowerCase();
             const channelName = channels.find(ch => String(ch.id) === String(config.channelId))?.name?.toLowerCase() || '';
      
      return title.includes(query) || 
             description.includes(query) || 
             channelName.includes(query);
    });
  }, [configs, searchQuery, channels]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [chRes, cRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/channels`, { headers: authHeader }).then(r => r.json()),
          fetch(`/api/proxy/guilds/${guildId}/embedded-messages`, { headers: authHeader }).then(r => r.json()).catch(() => ({ configs: [] })),
        ]);
        if (!alive) return;
        const ch = Array.isArray(chRes?.channels) ? chRes.channels : Array.isArray(chRes) ? chRes : [];
        setChannels(ch);
        setConfigs(Array.isArray(cRes?.configs) ? cRes.configs : []);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [guildId, authHeader]);

  const startNew = () => {
    setEditing(null);
    setChannelId("");
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
  };

  const startEdit = (config: EmbeddedMessageConfig) => {
    setEditing(config);
    setChannelId(String(config.channelId || ""));
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
  };

  const cancelEdit = () => {
    setEditing(null);
    startNew();
  };

  const refresh = async () => {
    const cRes = await fetch(`/api/proxy/guilds/${guildId}/embedded-messages`, { headers: authHeader }).then(r => r.json()).catch(()=>({ configs: [] }));
    console.log('🔍 Refresh response:', cRes);
    const configsArray = Array.isArray(cRes?.configs) ? cRes.configs : [];
    console.log('🔍 Configs array:', configsArray);
    console.log('🔍 First config messageId:', configsArray[0]?.messageId);
    setConfigs(configsArray);
  };

  const doPublish = async () => {
    setPublishMsg(null);
    if (!guildId) { setPublishMsg("Missing guildId"); return; }
    if (!channelId) { setPublishMsg("Pick a channel"); return; }
    
    try {
      setPublishing(true);
      const body = {
        channelId,
        title: title || undefined,
        description: description || undefined,
        color: color ? parseInt(color.replace('#', ''), 16) : undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        imageUrl: imageUrl || undefined,
        author: (authorName || authorIconUrl) ? { name: authorName || undefined, iconUrl: authorIconUrl || undefined } : undefined,
        footer: (footerText || footerIconUrl) ? { text: footerText || undefined, iconUrl: footerIconUrl || undefined } : undefined,
        timestamp: showTimestamp ? Date.now() : undefined,
        enabled: true,
        createdBy: (session?.user as any)?.name || (session?.user as any)?.username || 'ServerMate Bot',
      };

             const isUpdate = editing && editing.id && editing.id !== "";
      const url = isUpdate 
        ? `/api/proxy/guilds/${guildId}/embedded-messages/${editing.id}`
        : `/api/proxy/guilds/${guildId}/embedded-messages`;
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json', ...authHeader }, 
        body: JSON.stringify(body)
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPublishMsg(data?.error || `Failed (${res.status})`); return; }
      
      const actionType = isUpdate ? "embedded-message.update" : "embedded-message.create";
      const toastTitle = isUpdate ? "Updated" : "Published";
      const toastDescription = isUpdate ? "Embedded message updated" : "Embedded message sent";
      
      toast({ title: toastTitle, description: toastDescription, duration: 3000 });
      await logAction({ 
        guildId, 
        userId: (session?.user as any)?.id || "", 
        actionType, 
        user: { id: (session?.user as any)?.id || "" }, 
        actionData: { title: title, id: editing?.id } 
      });
      
             // Clear editing state and form
       setEditing(null);
       startNew();
       
       // Update local state with the new messageId if it's a new message
       if (!isUpdate && data.messageId) {
         setConfigs(prev => prev.map(c => 
           c.id === data.id ? { ...c, messageId: data.messageId } : c
         ));
       }
       
       // Refresh the list
       await refresh();
       
       // Debug: Log the response to see what we got back
       console.log('🔍 Publish response:', data);
       console.log('🔍 Configs after refresh:', configs);
      
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
      console.log('🔍 Deleting config:', { id: c.id, guildId, url: `/api/proxy/guilds/${guildId}/embedded-messages/${c.id}` });
      const res = await fetch(`/api/proxy/guilds/${guildId}/embedded-messages/${c.id}`, { method: 'DELETE', headers: authHeader });
      if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || `Failed (${res.status})`);
      toast({ title: "Deleted", description: "Embedded message sent", duration: 3000 });
      await logAction({ guildId, userId: (session?.user as any)?.id || "", actionType: "embedded-message.delete", user: { id: (session?.user as any)?.id || "" }, actionData: { id: c.id } });
      setConfigs(prev => prev.filter(x => x.id !== c.id));
    } catch (e:any) {
      console.log('❌ Delete failed:', e);
      toast({ title: "Delete failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  };

  return (
    <Section title="Embedded Messages">
      <p className="text-muted-foreground mb-6">Create rich embed-style messages for your Discord channels.</p>
                                                                                                               <div className="flex flex-col lg:flex-row gap-6">
                                                                                                           {/* Left Column: Form */}
            <div className="space-y-6 h-full flex-1 min-h-[700px] flex flex-col" style={{ minHeight: '700px' }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editing ? `Edit: ${editing.title || 'Untitled'}` : 'Create New Message'}
            </h3>
            <div className="flex gap-2">
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
              <label className="block text-sm font-medium">Channel</label>
              <select value={channelId} onChange={e => setChannelId(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-background">
                <option value="">Select a channel</option>
                {channels.map(ch => (
                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                ))}
              </select>
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
                      <div className={`flex items-center gap-2 text-xs text-muted-foreground mb-2 w-[24rem]`}>
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
                        <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Author name" className="flex-1" />
                      </div>

                      {/* Title / Description */}
                      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Embed title" className="font-semibold leading-snug mb-2 w-[24rem]" />
                      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Embed description" rows={2} className="text-sm whitespace-pre-wrap text-muted-foreground" />

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
                        <input 
                          className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm text-foreground bg-background" 
                          placeholder="Footer text" 
                          value={footerText} 
                          onChange={(e)=>setFooterText(e.target.value)} 
                        />
                                                 {showTimestamp && <span className="ml-auto">Just now</span>}
                      </div>
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

            {/* Publish button */}
            <Button
              onClick={doPublish}
              disabled={!channelId || publishing}
              className="w-full bg-gradient-to-r from-blue-500/90 to-blue-400/80 text-white shadow-md hover:shadow-lg hover:from-blue-600/90 hover:to-blue-500/80 focus-visible:ring-blue-400/40"
            >
              <SendIcon className="w-4 h-4 mr-2" /> {publishing ? 'Publishing…' : (editing ? 'Update Message' : 'Publish as Embedded Message')}
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
                        <div className="text-xs text-muted-foreground mt-1">
                          Channel: {channels.find(ch => String(ch.id) === String(c.channelId))?.name || `#${c.channelId}`}
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
    </Section>
  );
}


