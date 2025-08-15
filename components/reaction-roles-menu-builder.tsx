"use client";

import React, { useEffect, useMemo, useState } from "react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HashIcon, ImageIcon, SendIcon, Trash2Icon, EditIcon, ToggleLeftIcon, ToggleRightIcon, SaveIcon, XIcon, RefreshCwIcon, LayoutGridIcon, CheckIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [placeholder, setPlaceholder] = useState("Select roles");
  const [minValues, setMinValues] = useState(0);
  const [maxValues, setMaxValues] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

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

  const guildId = useMemo(() => {
    const m = typeof window !== 'undefined' ? window.location.pathname.match(/guilds\/(\d+)/) : null;
    return m?.[1] || "";
  }, []);

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

  const refreshConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const res = await fetch(`/proxy/guilds/${guildId}/reaction-roles`);
      const data = await res.json();
      setConfigs(Array.isArray(data?.configs) ? data.configs : []);
    } catch { /* noop */ } finally { setLoadingConfigs(false); }
  };

  useEffect(() => { if (guildId) void refreshConfigs(); }, [guildId]);

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
        roleIds: selectedRoleIds,
        placeholder: placeholder || undefined,
        minValues,
        maxValues: Math.max(1, Math.min(selectedRoleIds.length, maxValues))
      };
      const res = await fetch(`/proxy/guilds/${guildId}/reaction-roles/publish-menu`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
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
      setThumbnailUrl(""); setImageUrl(""); setPlaceholder("Select roles"); setMinValues(0); setMaxValues(1);
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

  return (
    <Section title="Role Menu Publisher">
      {!premium && (
        <div className="text-sm text-red-600 mb-4">Premium required to publish role menus.</div>
      )}

      {/* Builder */}
      <div className="rounded-xl border p-4 bg-card space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><LayoutGridIcon className="w-4 h-4"/> Compose an embed and publish a Role Select Menu to a channel.</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1"><HashIcon className="w-4 h-4"/>Channel</label>
              <Select className="w-full" value={channelId} onChange={e => setChannelId((e.target as HTMLSelectElement).value)}>
                <option value="" disabled>Pick a text channel…</option>
                {channels.map((c: any) => <option key={c.id} value={c.id}>#{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Embed title" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Embed description" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <Input type="color" value={color} onChange={e => setColor(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1"><ImageIcon className="w-4 h-4"/>Thumbnail URL</label>
                <Input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Placeholder</label>
                <Input value={placeholder} onChange={e => setPlaceholder(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min</label>
                <Input type="number" value={minValues} onChange={e => setMinValues(Number(e.target.value)||0)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max</label>
                <Input type="number" value={maxValues} onChange={e => setMaxValues(Number(e.target.value)||1)} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Roles</label>
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
            <div className="border rounded p-2 h-64 overflow-auto bg-background">
              {[...roles].sort((a:any,b:any)=> (b.position??0)-(a.position??0)).map((r: any) => {
                const isOn = selectedRoleIds.includes(r.roleId);
                const color = r.color || '#e5e7eb';
                return (
                  <button
                    key={r.roleId}
                    type="button"
                    onClick={() => toggleRole(r.roleId)}
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
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent>
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
    </Section>
  );
}
