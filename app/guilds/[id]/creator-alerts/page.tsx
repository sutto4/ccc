"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit2, Plus, Save } from "lucide-react";

type Platform = "twitch" | "youtube" | "x" | "tiktok";

type AlertRule = {
  id: string;
  platform: Platform;
  channelOrUser: string;
  discordUserId?: string; // New field for Discord user mapping
  roleId: string;
  channelId?: string;
  notes?: string;
  enabled: boolean;
};

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: string }> = {
  twitch: { label: "Twitch", color: "#9146FF", icon: "T" },
  youtube: { label: "YouTube", color: "#FF0000", icon: "Y" },
  x: { label: "X", color: "#111111", icon: "X" },
  tiktok: { label: "TikTok", color: "#00F2EA", icon: "TT" },
};

export default function CreatorAlertsPage() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";

  // Local-only state for UI scaffolding
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [form, setForm] = useState<Partial<AlertRule>>({ platform: "twitch", enabled: true });

  // Mock roles list to wire dropdown UI; wiring will replace this
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [discordUsers, setDiscordUsers] = useState<{ id: string; username: string; displayName?: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // load roles (reuse roles endpoint already in app)
        const rolesRes = await fetch(`/api/guilds/${guildId}/roles`);
        if (rolesRes.ok) {
          const data = await rolesRes.json();
          const list = (Array.isArray(data) ? data : data.roles || []).map((r: any) => ({ id: r.roleId || r.id, name: r.name }));
          setRoles(list);
        }
      } catch {}
      try {
        const chRes = await fetch(`/api/guilds/${guildId}/channels`);
        if (chRes.ok) {
          const { channels } = await chRes.json();
          setChannels(channels || []);
        }
      } catch {}
      try {
        const rulesRes = await fetch(`/api/guilds/${guildId}/creator-alerts`);
        if (rulesRes.ok) {
          const { rules } = await rulesRes.json();
          setRules(
            (rules || []).map((r: any) => ({
              id: String(r.id),
              platform: r.platform,
              channelOrUser: r.creator,
              discordUserId: r.discord_user_id,
              roleId: r.role_id,
              channelId: r.channel_id,
              notes: r.notes || "",
              enabled: !!r.enabled,
            }))
          );
        }
      } catch {}
    })();
  }, [guildId]);

  const resetForm = () => setForm({ platform: "twitch", enabled: true });

  const startCreate = () => {
    setEditing(null);
    resetForm();
  };

  const startEdit = (r: AlertRule) => {
    setEditing(r);
    setForm({ ...r });
  };

  const remove = (id: string) => setRules((prev) => prev.filter((r) => r.id !== id));

  // Search Discord users by username
  const searchDiscordUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setDiscordUsers([]);
      return;
    }
    
    setSearching(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/members/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setDiscordUsers(data.members || []);
      } else {
        setDiscordUsers([]);
      }
    } catch (error) {
      console.error('Error searching Discord users:', error);
      setDiscordUsers([]);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDiscordUsers(searchQuery);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const submit = async () => {
    if (!form.platform || !form.channelOrUser || !form.roleId) return;
    const payload = {
      platform: form.platform,
      creator: form.channelOrUser,
      discordUserId: form.discordUserId, // Include Discord user ID for role assignment
      roleId: form.roleId,
      channelId: form.channelId,
      notes: form.notes,
      enabled: form.enabled,
    } as any;
    if (editing) {
      payload.id = editing.id;
      await fetch(`/api/guilds/${guildId}/creator-alerts`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setRules((prev) => prev.map((r) => (r.id === editing.id ? { ...editing, ...(form as AlertRule) } : r)));
    } else {
      const res = await fetch(`/api/guilds/${guildId}/creator-alerts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      const id = data?.id ? String(data.id) : Math.random().toString(36).slice(2);
      setRules((prev) => [
        ...prev,
        { id, platform: form.platform as Platform, channelOrUser: String(form.channelOrUser), roleId: String(form.roleId), notes: form.notes || "", enabled: !!form.enabled },
      ]);
    }
    startCreate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creator Alerts</h1>
        <p className="text-muted-foreground">Assign a role to members automatically when creators go live or start a stream/post.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <Card>
          <CardHeader title={editing ? "Edit Alert" : "Create Alert"} subtitle="Choose a platform, the creator handle/channel, and the role to assign." />
          <CardContent className="space-y-4">
            {/* Platform */}
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={(form.platform as string) || "twitch"}
                onChange={(e) => setForm((f) => ({ ...f, platform: (e.target.value as Platform) || "twitch" }))}
              >
                <option value="twitch">Twitch</option>
                <option value="youtube">YouTube</option>
                <option value="x">X (Twitter)</option>
                <option value="tiktok">TikTok</option>
              </Select>
            </div>

            {/* Creator identifier */}
            <div className="space-y-2">
              <Label>Channel / Username</Label>
              <Input
                placeholder="e.g. twitch.tv/streamer or @handle"
                value={form.channelOrUser || ""}
                onChange={(e) => setForm((f) => ({ ...f, channelOrUser: e.target.value }))}
              />
            </div>

            {/* Discord User Search */}
            <div className="space-y-2">
              <Label>Discord User (for role assignment)</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search for Discord user by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searching && (
                  <div className="text-xs text-muted-foreground">Searching...</div>
                )}
                {discordUsers.length > 0 && (
                  <div className="border rounded-md max-h-32 overflow-y-auto">
                    {discordUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                        onClick={() => {
                          setForm((f) => ({ ...f, discordUserId: user.id }));
                          setSearchQuery(user.displayName || user.username);
                          setDiscordUsers([]);
                        }}
                      >
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                          {(user.displayName || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.displayName || user.username}</div>
                          <div className="text-xs text-muted-foreground">@{user.username}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {form.discordUserId && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    ✅ Discord user selected for role assignment
                  </div>
                )}
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Assign Role</Label>
              <Select value={(form.roleId as string) || ""} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}>
                <option value="" disabled>
                  Select a role
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Channel */}
            <div className="space-y-2">
              <Label>Notification Channel</Label>
              <Select value={(form.channelId as string) || ""} onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}>
                <option value="" disabled>
                  Select a channel
                </option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Enabled & Notes */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">When enabled, the role is assigned live when activity is detected.</p>
              </div>
              <Switch checked={!!form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Short note for admins (not shown to users)"
                value={form.notes || ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={submit}>
                <Save className="h-4 w-4 mr-2" />
                {editing ? "Save Changes" : "Add Alert"}
              </Button>
              <Button variant="outline" onClick={startCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: List */}
        <Card>
          <CardHeader title="Configured Alerts" subtitle="Enable, edit, or remove alerts. Order has no effect for now." />
          <CardContent className="space-y-3">
            {rules.length === 0 ? (
              <div className="text-sm text-muted-foreground">No alerts configured yet.</div>
            ) : (
              rules.map((r) => {
                const meta = PLATFORM_META[r.platform];
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-md flex items-center justify-center text-white"
                        style={{ background: meta.color }}
                        title={meta.label}
                      >
                        <span className="text-xs font-bold">{meta.icon}</span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {meta.label} • {r.channelOrUser}
                          {!r.enabled && <Badge variant="secondary" className="ml-2">Disabled</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Role: {roles.find((x) => x.id === r.roleId)?.name || r.roleId}
                          {r.discordUserId && (
                            <span className="ml-2 text-green-600">• Role assignment enabled</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(r)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => remove(r.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming next */}
      <Card>
        <CardHeader title="Planned capabilities" subtitle="These will be wired when API/bot integration is added." />
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div>• Live polling and webhook ingest per platform.</div>
          <div>• Cooldowns and grace-periods to avoid rapid role flapping.</div>
          <div>• Per-platform API token management and connection testers.</div>
          <div>• Channel announcements and role auto-removal after offline.</div>
          <div>• Granular rule conditions (min viewers, categories, keywords).</div>
        </CardContent>
      </Card>
    </div>
  );
}


