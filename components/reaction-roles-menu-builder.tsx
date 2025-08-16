"use client";

import React, { useEffect, useMemo, useState } from "react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HashIcon, ImageIcon, SendIcon, Trash2Icon, EditIcon, ToggleLeftIcon, ToggleRightIcon, SaveIcon, XIcon, RefreshCwIcon, LayoutGridIcon, CheckIcon, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ReactionRolesMenuBuilder({ premium }: { premium: boolean }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#5865F2");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorIconUrl, setAuthorIconUrl] = useState("");
  const [footerText, setFooterText] = useState("");
  const [footerIconUrl, setFooterIconUrl] = useState("");
  const [showTimestamp, setShowTimestamp] = useState(true);
  // Inline editing is always on now; no toggle
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [placeholder, setPlaceholder] = useState("Select roles");
  const [minValues, setMinValues] = useState(0);
  const [maxValues, setMaxValues] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  
  // Role search state
  const [roleSearch, setRoleSearch] = useState("");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Existing configs
  const [configs, setConfigs] = useState<any[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Editor state for existing message
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("#5865F2");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editPlaceholder, setEditPlaceholder] = useState("Select roles");
  const [editMinValues, setEditMinValues] = useState(0);
  const [editMaxValues, setEditMaxValues] = useState(1);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Bot customization state
  const [customBotName, setCustomBotName] = useState("");
  const [customBotAvatar, setCustomBotAvatar] = useState("");

  const guildId = useMemo(() => {
    const m = typeof window !== 'undefined' ? window.location.pathname.match(/guilds\/(\d+)/) : null;
    return m?.[1] || "";
  }, []);

  // Color picker modal state
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [tempColor, setTempColor] = useState(color);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [chRes, rRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/channels`).then(r => r.json()),
          fetch(`/api/guilds/${guildId}/roles`).then(r => r.json())
        ]);
        if (Array.isArray(chRes.channels)) setChannels(chRes.channels.filter((c: any) => c.type === 0));
        else if (Array.isArray(chRes)) setChannels(chRes.filter((c: any) => c.type === 0));
        if (Array.isArray(rRes.roles)) setRoles(rRes.roles);
        else if (Array.isArray(rRes)) setRoles(rRes);
      } catch (e: any) {
        setError(e?.message || "failed");
      } finally { setLoading(false); }
    })();
  }, [guildId]);

  // Load bot customization settings
  useEffect(() => {
    if (guildId) {
      loadBotCustomisation();
    }
  }, [guildId]);

  const loadBotCustomisation = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-customisation`);
      if (res.ok) {
        const data = await res.json();
        setCustomBotName(data.botName || "");
        setCustomBotAvatar(data.botAvatarUrl || "");
      }
    } catch (error) {
      console.error("Failed to load bot customisation:", error);
    }
  };

  const refreshConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const res = await fetch(`/proxy/guilds/${guildId}/reaction-roles`);
      const data = await res.json();
      setConfigs(Array.isArray(data?.configs) ? data.configs : []);
    } catch { /* noop */ } finally { setLoadingConfigs(false); }
  };

  useEffect(() => { if (guildId) void refreshConfigs(); }, [guildId]);
  
  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showRoleDropdown && !(event.target as Element).closest('.role-search-container')) {
        setShowRoleDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRoleDropdown]);

  const toggleRole = (rid: string) => {
    setSelectedRoleIds(prev => prev.includes(rid) ? prev.filter(x => x !== rid) : [...prev, rid]);
  };

  const doPublish = async () => {
    setPublishMsg(null);
    if (!premium) { setPublishMsg("Premium required"); return; }
    if (!guildId) { setPublishMsg("Missing guildId"); return; }
    if (!channelId) { setPublishMsg("Pick a channel"); return; }
    if (selectedRoleIds.length === 0) { setPublishMsg("Pick at least one role"); return; }
    try {
      setPublishing(true);
      const body = {
        channelId,
        title,
        description,
        color: parseInt(color.replace('#',''), 16) || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        imageUrl: imageUrl || undefined,
        author: (authorName || authorIconUrl) ? { name: authorName || undefined, iconUrl: authorIconUrl || undefined } : undefined,
        footer: (footerText || footerIconUrl) ? { text: footerText || undefined, iconUrl: footerIconUrl || undefined } : undefined,
        timestamp: showTimestamp ? Date.now() : undefined,
        roleIds: selectedRoleIds,
        placeholder: placeholder || undefined,
        minValues,
        maxValues: Math.max(1, Math.min(selectedRoleIds.length, maxValues))
      };
      if (typeof window !== 'undefined') {
        // Debug client-side payload
        try { console.debug('[ServerHub] publish-menu payload', body); } catch {}
      }
      const res = await fetch(`/api/guilds/${guildId}/reaction-roles/publish-menu`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (typeof window !== 'undefined') {
        try { console.debug('[ServerHub] publish-menu response', res.status, data); } catch {}
      }
      if (!res.ok) {
        setPublishMsg(data?.error || `Failed (${res.status})`);
        try {
          const { toast } = await import("@/hooks/use-toast");
          toast({ title: "Publish failed", description: data?.error || `${res.status}`, variant: "destructive", duration: 5000 });
        } catch {}
        return;
      }
      setPublishMsg("Published ✅");
      try {
        const { toast } = await import("@/hooks/use-toast");
        toast({ title: "Published", description: "Role menu sent to channel", variant: "success", duration: 4000 });
      } catch {}
      await refreshConfigs();
      // reset form
      setTitle(""); setDescription(""); setSelectedRoleIds([]);
      setThumbnailUrl(""); setImageUrl("");
      setAuthorName(""); setAuthorIconUrl(""); setFooterText(""); setFooterIconUrl(""); setShowTimestamp(true);
      setPlaceholder("Select roles"); setMinValues(0); setMaxValues(1);
    } catch (e: any) {
      setPublishMsg(e?.message || "Publish failed");
    } finally { setPublishing(false); }
  };

  const doDelete = async (messageId: string) => {
    try {
      setDeleting(true);
      const res = await fetch(`/proxy/guilds/${guildId}/reaction-roles/${messageId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || `Delete failed (${res.status})`);
        try {
          const { toast } = await import("@/hooks/use-toast");
          toast({ title: "Delete failed", description: data?.error || `${res.status}`, variant: "destructive", duration: 5000 });
        } catch {}
        return;
      }
      await refreshConfigs();
      if (editingId === messageId) setEditingId(null);
      try {
        const { toast } = await import("@/hooks/use-toast");
        toast({ title: "Deleted", description: "Reaction role message removed", variant: "success", duration: 4000 });
      } catch {}
    } catch (e: any) { alert(e?.message || 'Delete failed'); }
    finally { setDeleting(false); }
  };

  const startEdit = (c: any) => {
    setEditingId(c.messageId);
    setEditTitle(c.embed?.title || "");
    setEditDescription(c.embed?.description || "");
    setEditColor(`#${((c.embed?.color ?? 0x5865F2) >>> 0).toString(16).padStart(6,'0')}`);
    setEditThumbnailUrl(c.embed?.thumbnailUrl || "");
    setEditImageUrl(c.embed?.imageUrl || "");
    setEditPlaceholder(c.menu?.placeholder || "Select roles");
    setEditMinValues(typeof c.menu?.minValues === 'number' ? c.menu.minValues : 0);
    setEditMaxValues(typeof c.menu?.maxValues === 'number' ? c.menu.maxValues : Math.max(1, (c.mappings || []).length || 1));
    setEditRoleIds((c.mappings || []).map((m: any) => m.roleId));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSavingEdit(false);
  };

  const toggleEnabled = async (c: any, enable: boolean) => {
    try {
      const res = await fetch(`/proxy/guilds/${guildId}/reaction-roles/${c.messageId}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: enable })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || `Toggle failed (${res.status})`);
        try {
          const { toast } = await import("@/hooks/use-toast");
          toast({ title: "Toggle failed", description: data?.error || `${res.status}`, variant: "destructive", duration: 5000 });
        } catch {}
        return;
      }
      await refreshConfigs();
      try {
        const { toast } = await import("@/hooks/use-toast");
        toast({ title: enable ? "Enabled" : "Disabled", description: "Reaction role message updated", variant: "success", duration: 3000 });
      } catch {}
    } catch (e: any) { alert(e?.message || 'Toggle failed'); }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      setSavingEdit(true);
      const body: any = {
        title: editTitle,
        description: editDescription,
        color: parseInt(editColor.replace('#',''), 16) || undefined,
        thumbnailUrl: editThumbnailUrl || undefined,
        imageUrl: editImageUrl || undefined,
        roleIds: editRoleIds,
        placeholder: editPlaceholder || undefined,
        minValues: editMinValues,
        maxValues: Math.max(1, Math.min(editRoleIds.length || 1, editMaxValues))
      };
      const res = await fetch(`/proxy/guilds/${guildId}/reaction-roles/${editingId}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || `Save failed (${res.status})`);
        try {
          const { toast } = await import("@/hooks/use-toast");
          toast({ title: "Save failed", description: data?.error || `${res.status}`, variant: "destructive", duration: 5000 });
        } catch {}
        return;
      }
      setEditingId(null);
      await refreshConfigs();
      try {
        const { toast } = await import("@/hooks/use-toast");
        toast({ title: "Saved", description: "Changes have been saved", variant: "success", duration: 3000 });
      } catch {}
    } catch (e: any) { alert(e?.message || 'Save failed'); }
    finally { setSavingEdit(false); }
  };

     const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
   const [tempThumbnailUrl, setTempThumbnailUrl] = useState("");
   const [imageModalType, setImageModalType] = useState<'thumbnail' | 'author' | 'image' | 'footer'>('thumbnail');
   
   // Filtered roles for search
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return [];
    return [...roles]
      .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0))
      .filter((r: any) => 
        r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.roleId.toLowerCase().includes(roleSearch.toLowerCase())
      );
  }, [roles, roleSearch]);

     const handleImageSave = () => {
     switch (imageModalType) {
       case 'thumbnail':
         setThumbnailUrl(tempThumbnailUrl);
         break;
       case 'author':
         setAuthorIconUrl(tempThumbnailUrl);
         break;
       case 'image':
         setImageUrl(tempThumbnailUrl);
         break;
       case 'footer':
         setFooterIconUrl(tempThumbnailUrl);
         break;
     }
     setThumbnailModalOpen(false);
   };
 
   const handleImageRemove = () => {
     switch (imageModalType) {
       case 'thumbnail':
         setThumbnailUrl("");
         break;
       case 'author':
         setAuthorIconUrl("");
         break;
       case 'image':
         setImageUrl("");
         break;
       case 'footer':
         setFooterIconUrl("");
         break;
     }
     setTempThumbnailUrl("");
     setThumbnailModalOpen(false);
   };

  return (
    <Section title="Role Menu Publisher">
      {!premium && (
        <div className="text-sm text-red-600 mb-4">Premium required to publish role menus.</div>
      )}

      {/* Builder */}
      <div className="rounded-xl border p-4 bg-card space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><LayoutGridIcon className="w-4 h-4"/> Compose an embed and publish a Role Select Menu to a channel.</div>
                 <div className="space-y-6">
            {/* Main content: Single column stacked - half width */}
            <div className="w-1/2 space-y-6">
              {/* Channel selector (match role search width) */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">Channel</label>
                <div className="relative w-full">
                  <div className="flex items-center gap-2">
                    <HashIcon className="w-4 h-4 text-muted-foreground" />
                    <Select value={channelId} onChange={e => setChannelId((e.target as HTMLSelectElement).value)} className="w-full">
                      <option value="" disabled>Pick channel…</option>
                      {channels.map((c: any) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </Select>
                  </div>
                </div>
              </div>

                              {/* Role selector - search bar with dropdown */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium">Roles</label>
                  <div className="flex flex-wrap gap-1 mb-2 min-h-[1.5rem]">
                    {selectedRoleIds.length === 0 && (
                      <span className="text-xs text-muted-foreground">None selected</span>
                    )}
                    {selectedRoleIds.map((rid) => {
                      const r = roles.find((x: any) => x.roleId === rid);
                      const color = r?.color || '#e5e7eb';
                      return (
                        <button
                          key={rid}
                          type="button"
                          onClick={() => toggleRole(rid)}
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs hover:opacity-90"
                          style={{ backgroundColor: `${color}20`, borderColor: color }}
                          title="Remove"
                        >
                          {r?.iconUrl ? (
                            <img src={r.iconUrl} alt="" className="w-3.5 h-3.5 rounded-sm" />
                          ) : r?.unicodeEmoji ? (
                            <span className="text-sm leading-none">{r.unicodeEmoji}</span>
                          ) : (
                            <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: color + '20', borderColor: color }} />
                          )}
                          <span className="truncate max-w-[140px]">{r?.name || rid}</span>
                          <XIcon className="w-3 h-3" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative w-full role-search-container">
                    <Input
                      placeholder="Search roles..."
                      className="w-full"
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                      onFocus={() => setShowRoleDropdown(true)}
                    />
                    {showRoleDropdown && roleSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-50 max-h-48 overflow-auto bg-white text-gray-900 border border-gray-200">
                        {filteredRoles.map((r: any) => {
                          const isOn = selectedRoleIds.includes(r.roleId);
                          const color = r.color || '#e5e7eb';
                          return (
                            <button
                              key={r.roleId}
                              type="button"
                              onClick={() => {
                                toggleRole(r.roleId);
                                setRoleSearch("");
                                setShowRoleDropdown(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 transition ${isOn ? 'bg-primary/10' : 'hover:bg-gray-100'}`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {r.iconUrl ? (
                                  <img src={r.iconUrl} alt="" className="w-4 h-4 rounded-sm" />
                                ) : r.unicodeEmoji ? (
                                  <span className="text-base leading-none">{r.unicodeEmoji}</span>
                                ) : (
                                  <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: color + '20', borderColor: color }} />
                                )}
                                <span className="truncate" title={r.roleId}>{r.name}</span>
                              </span>
                              {isOn && <CheckIcon className="w-4 h-4 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                        <span className="font-semibold">{customBotName || "ServerHub Bot"}</span>
                        {showTimestamp && (
                          <span className="ml-2 text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</span>
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
                                    setImageModalType('thumbnail');
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
                                  setImageModalType('thumbnail');
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
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImageModalType('author');
                                    setTempThumbnailUrl(authorIconUrl);
                                    setThumbnailModalOpen(true);
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
                              </>
                          </div>
 
                                                   {/* Title / Description */}
                          <>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Embed title" className="font-semibold leading-snug mb-2 w-[24rem]" />
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Embed description" rows={2} className="text-sm whitespace-pre-wrap text-muted-foreground" />
                          </>

                                                 {/* Large image below */}
                         <div className="mt-3">
                           {imageUrl ? (
                             <div className="relative">
                               <img src={imageUrl} alt="embed" className="w-full max-h-56 rounded object-cover border" />
                               <button
                                 type="button"
                                 onClick={() => {
                                   setImageModalType('image');
                                   setTempThumbnailUrl(imageUrl);
                                   setThumbnailModalOpen(true);
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
                                 setImageModalType('image');
                                 setTempThumbnailUrl("");
                                 setThumbnailModalOpen(true);
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
                           <>
                                                                <button
                                    type="button"
                                    onClick={() => {
                                      setImageModalType('footer');
                                      setTempThumbnailUrl(footerIconUrl);
                                      setThumbnailModalOpen(true);
                                    }}
                                    className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors overflow-hidden"
                                    title="Set footer icon"
                                  >
                                    {footerIconUrl ? (
                                      <img src={footerIconUrl} alt="footer" className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-3 h-3" />
                                    )}
                                  </button>
                                  <input className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm text-foreground bg-background" placeholder="Footer text" value={footerText} onChange={(e)=>setFooterText(e.target.value)} />
                             </>
                            {showTimestamp && <span className="ml-auto">{new Date().toLocaleString()}</span>}
                          </div>

                      </div>

                      {/* Select menu preview removed by request */}
                    </div>
                  </div>
                </div>
              </div>

               {/* Min/Max/Placeholder settings removed by request */}

               {/* Publish button */}
               <Button
                 onClick={doPublish}
                 disabled={publishing || !premium}
                 className="w-full bg-gradient-to-r from-blue-500/90 to-blue-400/80 text-white shadow-md hover:shadow-lg hover:from-blue-600/90 hover:to-blue-500/80 focus-visible:ring-blue-400/40"
               >
                 <SendIcon className="w-4 h-4 mr-2" /> {publishing ? 'Publishing…' : 'Publish as Role Menu'}
               </Button>
               {publishMsg && <div className={`text-sm ${publishMsg.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>{publishMsg}</div>}
            </div>
      </div>
    </div>

      {/* Management */}
      <div className="mt-8 rounded-xl border p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Published Reaction Role Messages</h3>
          <Button variant="secondary" onClick={refreshConfigs}><RefreshCwIcon className="w-4 h-4 mr-2"/>Refresh</Button>
        </div>
        {loadingConfigs ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : configs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No reaction role messages found.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {configs.map((c: any) => (
              <div key={c.messageId} className="rounded-lg border bg-background p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{c.embed?.title || '(Untitled)'}</div>
                    <div className="text-xs text-muted-foreground truncate">in #{channels.find((x:any)=>x.id===c.channelId)?.name || c.channelId} • msg {c.messageId}</div>
                    <div className="mt-1 text-xs"><b>Enabled:</b> {c.enabled === null ? 'unknown' : c.enabled ? 'yes' : 'no'}</div>
                    <div className="text-xs"><b>Roles:</b> {c.mappings?.map((m:any)=>m.roleId).join(', ') || '—'}</div>
                    {c.createdBy && (
                      <div className="text-xs text-muted-foreground mt-1"><b>Created by:</b> {c.createdBy.username || c.createdBy.id || 'unknown'}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" className="shadow-sm hover:shadow" onClick={() => startEdit(c)}><EditIcon className="w-4 h-4 mr-1"/>Edit</Button>
                    {c.enabled ? (
                      <Button size="sm" variant="secondary" className="shadow-sm hover:shadow" onClick={() => toggleEnabled(c, false)}><ToggleLeftIcon className="w-4 h-4 mr-1"/>Disable</Button>
                    ) : (
                      <Button size="sm" variant="secondary" className="shadow-sm hover:shadow" onClick={() => toggleEnabled(c, true)}><ToggleRightIcon className="w-4 h-4 mr-1"/>Enable</Button>
                    )}
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow"
                      onClick={() => setConfirmDelete({ id: c.messageId, title: c.embed?.title })}
                      aria-label="Delete"
                    >
                      <Trash2Icon className="w-4 h-4 mr-1 text-white" />
                      Delete
                    </Button>
                  </div>
                </div>

                {editingId === c.messageId && (
                  <div className="mt-3 border rounded p-3 space-y-3 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Color</label>
                        <Input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Textarea rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
                        <Input value={editThumbnailUrl} onChange={e => setEditThumbnailUrl(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Image URL</label>
                        <Input value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Placeholder</label>
                        <Input value={editPlaceholder} onChange={e => setEditPlaceholder(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Min</label>
                        <Input type="number" value={editMinValues} onChange={e => setEditMinValues(Number(e.target.value)||0)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Max</label>
                        <Input type="number" value={editMaxValues} onChange={e => setEditMaxValues(Number(e.target.value)||1)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Roles</label>
                      <div className="border rounded p-2 h-48 overflow-auto bg-background">
                        {[...roles].sort((a:any,b:any)=> (b.position??0)-(a.position??0)).map((r: any) => {
                          const isOn = editRoleIds.includes(r.roleId);
                          const color = r.color || '#e5e7eb';
                          return (
                            <button
                              key={r.roleId}
                              type="button"
                              onClick={() => setEditRoleIds(prev => prev.includes(r.roleId) ? prev.filter(x => x !== r.roleId) : [...prev, r.roleId])}
                              className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded cursor-pointer transition ${isOn ? 'bg-primary/10' : 'hover:bg-muted'}`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {r.iconUrl ? (
                                  <img src={r.iconUrl} alt="" className="w-4 h-4 rounded-sm" />
                                ) : r.unicodeEmoji ? (
                                  <span className="text-base leading-none">{r.unicodeEmoji}</span>
                                ) : (
                                  <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: color + '20', borderColor: color }} />
                                )}
                                <span className="truncate" title={r.roleId}>{r.name}</span>
                              </span>
                              {isOn && <CheckIcon className="w-4 h-4 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={saveEdit} disabled={savingEdit}><SaveIcon className="w-4 h-4 mr-1"/>{savingEdit ? 'Saving…' : 'Save Changes'}</Button>
                      <Button variant="secondary" onClick={cancelEdit}><XIcon className="w-4 h-4 mr-1"/>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
             <Dialog open={!!confirmDelete} onOpenChange={(o: boolean) => { if (!o) setConfirmDelete(null); }}>
         <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
           <DialogHeader>
             <DialogTitle>Delete reaction role message?</DialogTitle>
             <DialogDescription>
               This will also delete the Discord message. {confirmDelete?.title ? `(${confirmDelete.title})` : ''}
             </DialogDescription>
           </DialogHeader>
           <DialogFooter>
             <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
             <Button
               className="bg-red-600 hover:bg-red-700 text-white"
               onClick={async () => { if (confirmDelete) { await doDelete(confirmDelete.id); setConfirmDelete(null); } }}
               disabled={deleting}
             >
               <Trash2Icon className="w-4 h-4 mr-2" /> {deleting ? 'Deleting…' : 'Delete'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

               {/* Image URL Modal */}
        <Dialog open={thumbnailModalOpen} onOpenChange={(o: boolean) => { if (!o) setThumbnailModalOpen(false); }}>
          <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
            <DialogHeader>
              <DialogTitle>
                {imageModalType === 'thumbnail' && 'Set Thumbnail Image'}
                {imageModalType === 'author' && 'Set Author Icon'}
                {imageModalType === 'image' && 'Set Large Image'}
                {imageModalType === 'footer' && 'Set Footer Icon'}
              </DialogTitle>
              <DialogDescription>
                Enter the URL for the image. This will be displayed in the embed.
              </DialogDescription>
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
                    <img 
                      src={tempThumbnailUrl} 
                      alt="preview" 
                      className="max-w-full max-h-32 object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleImageRemove}>Remove</Button>
              <Button onClick={handleImageSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

       {/* Color Picker Modal */}
       <Dialog open={colorModalOpen} onOpenChange={(o: boolean) => { if (!o) setColorModalOpen(false); }}>
         <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
           <DialogHeader>
             <DialogTitle>Pick embed color</DialogTitle>
             <DialogDescription>Choose a color for the embed accent.</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <input
               type="color"
               value={tempColor}
               onChange={(e) => setTempColor(e.target.value)}
               className="h-12 w-full rounded border"
               title="Color"
             />
             <div>
               <label className="block text-sm font-medium mb-1">Hex</label>
               <Input value={tempColor} onChange={(e) => setTempColor(e.target.value)} />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setColorModalOpen(false)}>Cancel</Button>
             <Button onClick={() => { setColor(tempColor); setColorModalOpen(false); }}>Save</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

     </Section>
   );
 }
