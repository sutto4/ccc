"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Shield, MessageSquare, Clock, Loader2 } from "lucide-react";
import { useBanSyncMock } from "../hooks/use-ban-sync-mock";
import SyncSettingsCard from "./sync-settings-card";
import { SyncSettings } from "../types/ban-sync";

interface ModerationSettingsProps {
  guildId: string;
  isPartOfGroup: boolean;
  groupName?: string;
}

export default function ModerationSettings({ guildId, isPartOfGroup, groupName }: ModerationSettingsProps) {
  const [reviewMode, setReviewMode] = useState(false);
  const [modLogChannel, setModLogChannel] = useState("");
  const [muteRole, setMuteRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banSyncEnabled, setBanSyncEnabled] = useState(false);
  const { getSyncSettings, saveSyncSettings } = useBanSyncMock();

  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    enabled: false,
    mode: "exempt",
    reviewerRoleIds: []
  });

  useEffect(() => {
    loadSettings();
  }, [guildId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('Loading moderation settings for guild:', guildId);

      // Load moderation settings
      const response = await fetch(`/api/guilds/${guildId}/moderation/settings`);
      console.log('API response status:', response.status);
      console.log('API response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        if (data.success) {
          setReviewMode(data.settings.reviewMode || false);
          setModLogChannel(data.settings.modLogChannel || "");
          setMuteRole(data.settings.muteRole || "");
          setBanSyncEnabled(data.settings.banSyncEnabled || false);
        }
      } else {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        // Fallback: use default settings
        console.log('Using fallback default settings');
        setReviewMode(false);
        setModLogChannel("");
        setMuteRole("");
        setBanSyncEnabled(false);
      }

      // Load ban sync settings
      const banSyncSettings = getSyncSettings(guildId);
      setSyncSettings(banSyncSettings);
    } catch (error) {
      console.error('Error loading moderation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSettingsSave = async (data: any) => {
    await saveSyncSettings(guildId, data);
    setSyncSettings(data);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/guilds/${guildId}/moderation/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewMode,
          modLogChannel,
          muteRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading moderation settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>General Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="review-mode">Review Mode</Label>
              <p className="text-sm text-muted-foreground">
                Require approval for moderation actions before they take effect
              </p>
            </div>
            <Switch
              id="review-mode"
              checked={reviewMode}
              onCheckedChange={setReviewMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ban Sync Settings */}
      {banSyncEnabled ? (
        <SyncSettingsCard
          guildId={guildId}
          initialEnabled={syncSettings.enabled}
          initialMode={syncSettings.mode}
          initialReviewerRoleIds={syncSettings.reviewerRoleIds}
          onSave={handleSyncSettingsSave}
          isPartOfGroup={isPartOfGroup}
          groupName={groupName}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Ban Sync Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Ban Sync is not enabled for this server.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Enable the "Ban Syncing" feature in server settings to access these controls.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Channel Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mod-log">Mod Log Channel</Label>
            <Input
              id="mod-log"
              placeholder="Enter channel ID or #channel-name"
              value={modLogChannel}
              onChange={(e) => setModLogChannel(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Channel where moderation actions will be logged
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Role Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mute-role">Mute Role</Label>
            <Input
              id="mute-role"
              placeholder="Enter role ID or @role-name"
              value={muteRole}
              onChange={(e) => setMuteRole(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Role applied to muted users
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
