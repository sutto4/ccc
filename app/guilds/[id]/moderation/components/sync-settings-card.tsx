"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { SyncMode, SyncSettingsData } from "../types/ban-sync";

interface SyncSettingsCardProps {
  guildId: string;
  initialEnabled: boolean;
  initialMode: SyncMode;
  initialReviewerRoleIds: string[];
  onSave: (data: SyncSettingsData) => Promise<void>;
  isPartOfGroup: boolean;
  groupName?: string;
}

const syncModeConfig = {
  auto: {
    label: "Automatic",
    description: "Ban sync happens automatically without review",
    icon: CheckCircle,
    color: "text-green-600"
  },
  review: {
    label: "Review Required",
    description: "All bans require reviewer approval before enforcement",
    icon: AlertCircle,
    color: "text-yellow-600"
  },
  exempt: {
    label: "Exempt",
    description: "This guild is exempt from ban sync",
    icon: XCircle,
    color: "text-gray-600"
  }
};

export default function SyncSettingsCard({
  guildId,
  initialEnabled,
  initialMode,
  initialReviewerRoleIds,
  onSave,
  isPartOfGroup,
  groupName
}: SyncSettingsCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [mode, setMode] = useState<SyncMode>(initialMode);
  const [reviewerRoleIds, setReviewerRoleIds] = useState<string[]>(initialReviewerRoleIds);
  const [newRoleId, setNewRoleId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        enabled,
        mode,
        reviewerRoleIds
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addReviewerRole = () => {
    if (newRoleId.trim() && !reviewerRoleIds.includes(newRoleId.trim())) {
      setReviewerRoleIds([...reviewerRoleIds, newRoleId.trim()]);
      setNewRoleId("");
    }
  };

  const removeReviewerRole = (roleId: string) => {
    setReviewerRoleIds(reviewerRoleIds.filter(id => id !== roleId));
  };

  const currentModeConfig = syncModeConfig[mode];
  const ModeIcon = currentModeConfig.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span>Ban Sync Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Group Membership Status */}
        {!isPartOfGroup ? (
          <div className="text-center py-6">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Server Not in Group</h3>
            <p className="text-muted-foreground mb-4">
              Ban sync is only available for servers that are part of a server group. 
              Contact your administrator to add this server to a group.
            </p>
          </div>
        ) : (
          <>
            {/* Group Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Server Group: {groupName || 'Unknown Group'}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Ban sync will synchronize with other servers in this group
              </p>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync-enabled">Enable Ban Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Synchronize bans across linked guilds in your group
                </p>
              </div>
              <Switch
                id="sync-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {enabled ? (
              <>
                {/* Sync Mode Selection */}
                <div className="space-y-3">
                  <Label>Sync Mode</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(syncModeConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      const isSelected = mode === key;
                      
                      return (
                        <div
                          key={key}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setMode(key as SyncMode)}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            <span className="font-medium">{config.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current Mode Info */}
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <ModeIcon className={`h-4 w-4 ${currentModeConfig.color}`} />
                  <span className="text-sm font-medium">
                    Current Mode: {currentModeConfig.label}
                  </span>
                </div>

                {/* Reviewer Roles (only for review mode) */}
                {mode === "review" && (
                  <div className="space-y-3">
                    <Label>Reviewer Roles</Label>
                    <p className="text-sm text-muted-foreground">
                      Users with these roles can approve or reject ban syncs
                    </p>
                    
                    {/* Add New Role */}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter role ID or @role-name"
                        value={newRoleId}
                        onChange={(e) => setNewRoleId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addReviewerRole()}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={addReviewerRole}
                        disabled={!newRoleId.trim()}
                      >
                        Add
                      </Button>
                    </div>

                    {/* Current Roles */}
                    {reviewerRoleIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {reviewerRoleIds.map((roleId) => (
                          <Badge key={roleId} variant="secondary" className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{roleId}</span>
                            <button
                              onClick={() => removeReviewerRole(roleId)}
                              className="ml-1 hover:text-red-600"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No reviewer roles configured
                      </p>
                    )}
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button 
                    variant="primary" 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </>
            ) : (
              /* Disabled State */
              <div className="text-center py-6">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Ban Sync Disabled</h3>
                <p className="text-muted-foreground mb-4">
                  Enable ban sync to start synchronizing bans across your group's servers.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
