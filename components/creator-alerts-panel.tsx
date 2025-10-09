"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit2, Plus, Save, Tv, AlertCircle, Youtube, Twitter } from "lucide-react";
import Image from "next/image";

type Platform = "twitch" | "youtube" | "x" | "tiktok" | "kick";

type AlertRule = {
  id: string;
  platform: Platform;
  channelOrUser: string;
  discordUserId?: string;
  roleId?: string; // Role to assign to the creator when they go live
  mentionRoleIds?: string[]; // Roles to mention/ping in the notification
  channelId?: string;
  customMessage?: string;
  notes?: string;
  enabled: boolean;
};

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: any; logoUrl?: string }> = {
  twitch: { 
    label: "Twitch", 
    color: "#9146FF", 
    icon: Tv,
    logoUrl: "https://assets.streamelements.com/logo/twitch.svg"
  },
  youtube: { 
    label: "YouTube", 
    color: "#FF0000", 
    icon: Youtube,
    logoUrl: "https://www.youtube.com/s/desktop/d743f786/img/favicon_96x96.png"
  },
  x: { 
    label: "X", 
    color: "#111111", 
    icon: Twitter
  },
  tiktok: { 
    label: "TikTok", 
    color: "#00F2EA", 
    icon: Tv
  },
  kick: { 
    label: "Kick", 
    color: "#0077B6", 
    icon: Tv
  },
};

export default function CreatorAlertsPanel({ guildId }: { guildId: string }) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [form, setForm] = useState<Partial<AlertRule>>({ 
    platform: "twitch", 
    enabled: true,
    customMessage: "[user] has just gone live!",
    mentionRoleIds: []
  });

  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [discordUsers, setDiscordUsers] = useState<{ id: string; username: string; displayName?: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [profileImages, setProfileImages] = useState<Record<string, string>>({});
  
  const MAX_FREE_ALERTS = 2;
  const canCreateMore = isPremium || rules.length < MAX_FREE_ALERTS;

  const fetchTwitchProfileImage = async (username: string) => {
    // Skip if already fetched
    if (profileImages[username]) return;
    
    try {
      const res = await fetch(`/api/twitch/profile-image?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profileImageUrl) {
          setProfileImages(prev => ({ ...prev, [username]: data.profileImageUrl }));
        }
      }
    } catch (error) {
      console.error(`Failed to fetch profile image for ${username}:`, error);
    }
  };

  useEffect(() => {
    if (!guildId) return;

    (async () => {
      try {
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
          const data = await chRes.json();
          const list = (Array.isArray(data?.channels) ? data.channels : []).map((c: any) => ({ id: c.id, name: c.name }));
          setChannels(list);
        }
      } catch {}
      try {
        const alertsRes = await fetch(`/api/guilds/${guildId}/creator-alerts`);
        if (alertsRes.ok) {
          const data = await alertsRes.json();
          const alertRules = data.rules || [];
          setRules(alertRules);
          
          // Fetch profile images for Twitch creators
          const twitchCreators = alertRules.filter((r: AlertRule) => r.platform === 'twitch');
          for (const creator of twitchCreators) {
            fetchTwitchProfileImage(creator.channelOrUser);
          }
        }
      } catch {}
      try {
        const premiumRes = await fetch(`/api/guilds/${guildId}/premium-status`);
        if (premiumRes.ok) {
          const data = await premiumRes.json();
          setIsPremium(data.isPremium || false);
        }
      } catch {}
    })();
  }, [guildId]);

  const handleSave = async () => {
    if (!form.platform || !form.channelOrUser || !form.channelId) {
      alert("Please fill all required fields");
      return;
    }
    
    // Check limits for new alerts (not editing)
    if (!editing && !canCreateMore) {
      alert(`Free tier is limited to ${MAX_FREE_ALERTS} creator alerts. Upgrade to Premium for unlimited alerts!`);
      return;
    }

    try {
      const method = editing ? "PUT" : "POST";
      const url = editing 
        ? `/api/guilds/${guildId}/creator-alerts/${editing.id}`
        : `/api/guilds/${guildId}/creator-alerts`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        if (editing) {
          setRules((prev) => prev.map((r) => (r.id === editing.id ? data.rule : r)));
        } else {
          setRules((prev) => [...prev, data.rule]);
        }
        setForm({ platform: "twitch", enabled: true, customMessage: "[user] has just gone live!", mentionRoleIds: [] });
        setEditing(null);
      }
    } catch (error) {
      console.error("Failed to save alert rule:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this alert rule?")) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/creator-alerts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete alert rule:", error);
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setEditing(rule);
    setForm(rule);
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Get notified when your favorite creators go live on Twitch, YouTube, Kick, TikTok, or X
        </p>
      </div>

      {/* Limit Warning Banner */}
      {!isPremium && rules.length >= MAX_FREE_ALERTS && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 mb-1">Free Tier Limit Reached</p>
              <p className="text-sm text-amber-800 mb-3">
                You've reached the maximum of {MAX_FREE_ALERTS} creator alerts for free servers. Upgrade to Premium for unlimited creator alerts!
              </p>
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Upgrade to Premium
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Create/Edit Form */}
        <Card className={!canCreateMore && !editing ? "opacity-60" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editing ? "Edit Alert Rule" : "Create New Alert"}
            </h3>
            {!isPremium && (
              <Badge variant="outline" className="text-xs">
                {rules.length}/{MAX_FREE_ALERTS} Free Alerts
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={form.platform || "twitch"}
                onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
                disabled={!canCreateMore && !editing}
              >
                {Object.entries(PLATFORM_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Creator Username *</Label>
              <Input
                placeholder="e.g., shroud, @PewDiePie, xqc"
                value={form.channelOrUser || ""}
                onChange={(e) => setForm({ ...form, channelOrUser: e.target.value })}
                disabled={!canCreateMore && !editing}
              />
              <p className="text-xs text-gray-500">
                Platform-specific format (see docs)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notification Channel *</Label>
              <Select
                value={form.channelId || ""}
                onChange={(e) => setForm({ ...form, channelId: e.target.value })}
                disabled={!canCreateMore && !editing}
              >
                <option value="">Select a channel...</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    # {ch.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role to Assign Creator (Optional)</Label>
              <Select
                value={form.roleId || ""}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                disabled={!canCreateMore && !editing}
              >
                <option value="">None</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500">
                Assign this role to the creator when they go live (requires Discord user mapping)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Roles to Mention (Optional)</Label>
              {form.mentionRoleIds && form.mentionRoleIds.length > 0 && (
                <span className="text-xs text-gray-500">{form.mentionRoleIds.length} selected</span>
              )}
            </div>
            {form.mentionRoleIds && form.mentionRoleIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded border">
                {form.mentionRoleIds.map(roleId => {
                  const role = roles.find(r => r.id === roleId);
                  return (
                    <Badge key={roleId} variant="secondary" className="flex items-center gap-1">
                      @{role?.name || roleId}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, mentionRoleIds: form.mentionRoleIds?.filter(id => id !== roleId) })}
                        className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors"
                        disabled={!canCreateMore && !editing}
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <Select
              value=""
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId && !(form.mentionRoleIds || []).includes(selectedId)) {
                  setForm({ ...form, mentionRoleIds: [...(form.mentionRoleIds || []), selectedId] });
                }
              }}
              disabled={!canCreateMore && !editing}
            >
              <option value="">+ Add role to mention...</option>
              {roles
                .filter(role => !(form.mentionRoleIds || []).includes(role.id))
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    @{role.name}
                  </option>
                ))}
            </Select>
            <p className="text-xs text-gray-500">
              Roles will be pinged when the notification is posted
            </p>
          </div>

          <div className="space-y-2">
            <Label>Custom Message</Label>
            <Input
              placeholder="[user] has just gone live!"
              value={form.customMessage || ""}
              onChange={(e) => setForm({ ...form, customMessage: e.target.value })}
              disabled={!canCreateMore && !editing}
            />
            <p className="text-xs text-gray-500">
              Use [user] as placeholder for creator name
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input
              placeholder="Internal notes..."
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              disabled={!canCreateMore && !editing}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled ?? true}
              onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
              disabled={!canCreateMore && !editing}
            />
            <Label>Enabled</Label>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!canCreateMore && !editing}
            >
              <Save className="h-4 w-4 mr-2" />
              {editing ? "Update" : "Create"} Alert
            </Button>
            {editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setForm({ platform: "twitch", enabled: true, customMessage: "[user] has just gone live!", mentionRoleIds: [] });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Right Column - Existing Rules */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Active Alert Rules ({rules.length})</h3>
        {rules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Tv className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No alert rules configured yet</p>
              <p className="text-sm">Create your first alert above to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {rules.map((rule) => {
              const meta = PLATFORM_META[rule.platform];
              const channel = channels.find((c) => c.id === rule.channelId);
              const role = roles.find((r) => r.id === rule.roleId);

              const profileImage = rule.platform === 'twitch' ? profileImages[rule.channelOrUser] : null;
              const PlatformIcon = meta.icon;

              return (
                <Card key={rule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Profile Image or Platform Icon */}
                      <div className="relative w-12 h-12 flex-shrink-0">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt={rule.channelOrUser}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                            <PlatformIcon className="h-6 w-6" style={{ color: meta.color }} />
                          </div>
                        )}
                        {/* Platform badge overlay */}
                        <div 
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          <PlatformIcon className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{rule.channelOrUser}</p>
                          {!rule.enabled && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Off
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <p className="truncate">#{channel?.name || "Unknown"}</p>
                          {rule.mentionRoleIds && rule.mentionRoleIds.length > 0 && (
                            <p className="truncate">
                              🔔 {rule.mentionRoleIds.map(id => {
                                const r = roles.find(ro => ro.id === id);
                                return `@${r?.name || id}`;
                              }).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

