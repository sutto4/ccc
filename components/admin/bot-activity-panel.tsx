"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Save, Bot, Activity, RefreshCw } from "lucide-react";

type ActivityType = "PLAYING" | "WATCHING" | "LISTENING" | "STREAMING";

type BotActivity = {
  text: string;
  type: ActivityType;
};

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "PLAYING", label: "Playing" },
  { value: "WATCHING", label: "Watching" },
  { value: "LISTENING", label: "Listening to" },
  { value: "STREAMING", label: "Streaming" },
];

export default function BotActivityPanel() {
  const [activity, setActivity] = useState<BotActivity>({
    text: "your servers",
    type: "WATCHING",
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/bot-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Bot activity updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update bot activity' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating bot activity' });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshUserCount = async () => {
    setRefreshing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/bot-activity/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Bot activity updated with latest user count!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to refresh user count' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while refreshing user count' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Bot Activity Settings</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Bot automatically shows "Watching [total users]" from all active guilds. Updates every hour.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`rounded-lg p-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Automatic User Count Display</p>
              <p className="mb-3">The bot automatically displays "Watching [X users]" where X is the total member count from all active guilds.</p>
              <Button
                onClick={handleRefreshUserCount}
                disabled={refreshing}
                size="sm"
                variant="outline"
                className="bg-green-100 border-green-300 text-green-800 hover:bg-green-200"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Update Now'}
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Manual Override (Optional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-type">Activity Type</Label>
              <Select
                id="activity-type"
                value={activity.type}
                onChange={(e) => setActivity({ ...activity, type: e.target.value as ActivityType })}
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-text">Activity Text</Label>
              <Input
                id="activity-text"
                type="text"
                placeholder="e.g., your servers, with users, commands"
                value={activity.text}
                onChange={(e) => setActivity({ ...activity, text: e.target.value })}
                maxLength={128}
              />
              <p className="text-xs text-gray-500">
                The text that appears after the activity type
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Current Status</p>
              <p className="font-mono mb-2">
                Watching [X users] (auto-updated)
              </p>
              <p className="text-xs text-blue-600">
                Bot automatically shows total user count from all active guilds. Updates every hour.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving || !activity.text.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Updating...' : 'Update Bot Activity'}
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Note:</strong> Changes apply globally across all servers where the bot is present.</p>
          <p><strong>Examples:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>Playing with users</li>
            <li>Watching your servers</li>
            <li>Listening to commands</li>
            <li>Streaming live coding</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
