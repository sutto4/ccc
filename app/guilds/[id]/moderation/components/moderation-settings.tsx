"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Shield, MessageSquare, Clock } from "lucide-react";
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
  const { getSyncSettings, saveSyncSettings } = useBanSyncMock();
  
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    enabled: false,
    mode: "exempt",
    reviewerRoleIds: []
  });

  useEffect(() => {
    const settings = getSyncSettings(guildId);
    setSyncSettings(settings);
  }, [guildId, getSyncSettings]);

  const handleSyncSettingsSave = async (data: any) => {
    await saveSyncSettings(guildId, data);
    setSyncSettings(data);
  };

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
      <SyncSettingsCard
        guildId={guildId}
        initialEnabled={syncSettings.enabled}
        initialMode={syncSettings.mode}
        initialReviewerRoleIds={syncSettings.reviewerRoleIds}
        onSave={handleSyncSettingsSave}
        isPartOfGroup={isPartOfGroup}
        groupName={groupName}
      />

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
        <Button variant="primary">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
