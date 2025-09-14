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
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

type Platform = "twitch" | "youtube" | "x" | "tiktok" | "kick";

type AlertRule = {
  id: string;
  platform: Platform;
  channelOrUser: string;
  discordUserId?: string; // New field for Discord user mapping
  roleId: string;
  channelId?: string;
  customMessage?: string; // Custom message for alerts
  notes?: string;
  enabled: boolean;
};

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: string }> = {
  twitch: { label: "Twitch", color: "#9146FF", icon: "🎮" },
  youtube: { label: "YouTube", color: "#FF0000", icon: "📺" },
  x: { label: "X", color: "#111111", icon: "🐦" },
  tiktok: { label: "TikTok", color: "#00F2EA", icon: "📱" },
  kick: { label: "Kick", color: "#0077B6", icon: "👋" },
};

export default function CreatorAlertsPage() {
  return (
    <AuthErrorBoundary>
      <CreatorAlertsPageContent undefined />
    </AuthErrorBoundary>
  );
}

function CreatorAlertsPageContent() {
  
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";

  // Local-only state for UI scaffolding
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [form, setForm] = useState<Partial<AlertRule>>({ 
    platform: "twitch", 
    enabled: true,
    customMessage: "[user] has just gone live!"
  });

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
        } else if (rolesRes.status === 401) {
          console.log('Authentication expired, redirecting to signin');
          window.location.href = '/signin';
        }
      } catch {}
      try {
        const chRes = await fetch(`/api/guilds/${guildId}/channels`);
        if (chRes.ok) {
          const { channels } = await chRes.json();
          setChannels(channels || []);
        } else if (chRes.status === 401) {
          console.log('Authentication expired, redirecting to signin');
          window.location.href = '/signin';
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
              customMessage: r.custom_message || "[user] has just gone live!",
              notes: r.notes || "",
              enabled: !!r.enabled,
            }))
          );
        }
      } catch {}
    })();
  }, [guildId]);

  const resetForm = () => setForm({ 
    platform: "twitch", 
    enabled: true,
    customMessage: "[user] has just gone live!"
  });

  const startCreate = () => {
    setEditing(null);
    resetForm();
  };

  const startEdit = (r: AlertRule) => {
    setEditing(r);
    setForm({ ...r });
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/creator-alerts?id=${id}`, { 
        method: "DELETE" 
      });
      
      if (res.ok) {
        // Remove from local state only after successful API call
        setRules((prev) => prev.filter((r) => r.id !== id));
      } else {
        console.error('Failed to delete creator alert rule');
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error('Error deleting creator alert rule:', error);
      // Optionally show an error message to the user
    }
  };

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
      } else if (res.status === 401) {
        console.log('Authentication expired, redirecting to signin');
        window.location.href = '/signin';
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
    if (!form.platform || !form.channelOrUser) return;
    const payload = {
      platform: form.platform,
      creator: form.channelOrUser,
      discordUserId: form.discordUserId, // Include Discord user ID for role assignment
      roleId: form.roleId,
      channelId: form.channelId,
      customMessage: form.customMessage,
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
        <p className="text-muted-foreground">Get notified when creators go live! Send custom messages with stream thumbnails and profile images to Discord channels, optionally assign roles to members.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <Card>
          <CardHeader title={editing ? "Edit Alert" : "Create Alert"} subtitle="Choose a platform, creator handle, notification channel, and optionally assign a role." />
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
                <option value="kick">Kick</option>
              </Select>
            </div>

            {/* Creator identifier */}
            <div className="space-y-2">
              <Label>Channel / Username</Label>
              <Input
                placeholder={
                  form.platform === 'twitch' ? 'e.g. shroud or twitch.tv/shroud' :
                  form.platform === 'youtube' ? 'e.g. @PewDiePie or youtube.com/@PewDiePie' :
                  form.platform === 'kick' ? 'e.g. xqc or kick.com/xqc' :
                  form.platform === 'tiktok' ? 'e.g. @charlidamelio or tiktok.com/@charlidamelio' :
                  'e.g. username or channel'
                }
                value={form.channelOrUser || ""}
                onChange={(e) => setForm((f) => ({ ...f, channelOrUser: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {form.platform === 'twitch' ? 'Enter the Twitch username (without @)' :
                 form.platform === 'youtube' ? 'Enter the YouTube channel name or @handle' :
                 form.platform === 'kick' ? 'Enter the Kick username (without @)' :
                 form.platform === 'tiktok' ? 'Enter the TikTok username (without @)' :
                 'Enter the platform username'}
              </p>
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
              <Label>Assign Role (optional)</Label>
              <Select value={(form.roleId as string) || ""} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}>
                <option value="">
                  No role assignment
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty if you only want notifications without role assignment.
              </p>
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

            {/* Custom Message */}
            <div className="space-y-2">
              <Label>Custom Message</Label>
              <Input
                placeholder="[user] has just gone live!"
                value={form.customMessage || ""}
                onChange={(e) => setForm((f) => ({ ...f, customMessage: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                This replaces the default "@[user], you have a creator alert!" text. Use [user] as placeholder for the creator's name. Leave empty for default message.
              </p>
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                <strong>Note:</strong> The embedded post will include the stream thumbnail and creator's profile image automatically.
              </div>
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
                          {r.roleId ? (
                            <>Role: {roles.find((x) => x.id === r.roleId)?.name || r.roleId}</>
                          ) : (
                            <>No role assignment</>
                          )}
                          {r.discordUserId && r.roleId && (
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

    </div>
  );

}


