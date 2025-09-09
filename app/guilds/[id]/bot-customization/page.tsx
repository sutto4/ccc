"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

interface BotCustomizationSettings {
  bot_name: string;
  bot_avatar: string;
}

export default function BotCustomizationPage({ params }: { params: Promise<{ id: string }> }) {
  const [settings, setSettings] = useState<BotCustomizationSettings>({
    bot_name: "Discord Bot",
    bot_avatar: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const [guildId, setGuildId] = useState<string>("");

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params;
      setGuildId(id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (guildId) {
      loadSettings();
    }
  }, [guildId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/bot-customization`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error('Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/guilds/${guildId}/bot-customization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || "Settings saved successfully!");
      } else {
        const error = await response.json();
        setMessage(error.error || "Failed to save settings");
      }
    } catch (error) {
      setMessage("Error saving settings");
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setAvatarError(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bot Customization</h1>
            <p className="text-muted-foreground">
              Customize how your bot appears in this server
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Bot Identity" subtitle="Customize your bot's appearance" />
              <CardContent className="space-y-4">
                {/* Bot Name */}
                <div className="space-y-2">
                  <Label htmlFor="bot-name">Bot Name</Label>
                  <Input
                    id="bot-name"
                    value={settings.bot_name}
                    onChange={(e) => setSettings(prev => ({ ...prev, bot_name: e.target.value }))}
                    placeholder="Enter bot name"
                    maxLength={32}
                  />
                  <p className="text-sm text-muted-foreground">
                    {settings.bot_name.length}/32 characters
                  </p>
                </div>

                {/* Bot Avatar */}
                <div className="space-y-2">
                  <Label htmlFor="bot-avatar">Bot Avatar URL</Label>
                  <Input
                    id="bot-avatar"
                    value={settings.bot_avatar}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, bot_avatar: e.target.value }));
                      setAvatarError(false);
                    }}
                    placeholder="https://example.com/avatar.png"
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter a direct image URL (PNG, JPG, GIF)
                  </p>
                </div>

                {/* Save Button */}
                <Button 
                  onClick={saveSettings} 
                  disabled={saving || !settings.bot_name.trim()}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>

                {message && (
                  <div className={`p-3 rounded-md text-sm ${
                    message.includes("successfully") 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Current Bot Preview" subtitle="How your bot will appear" />
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {settings.bot_avatar && !avatarError ? (
                      <img
                        src={settings.bot_avatar}
                        alt="Bot Avatar Preview"
                        className="w-16 h-16 rounded-full"
                        onError={handleAvatarError}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 text-2xl">🤖</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {settings.bot_name || "Discord Bot"}
                    </h3>
                    <p className="text-sm text-muted-foreground">Bot</p>
                  </div>
                </div>

                {avatarError && (
                  <div className="p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm">
                    ⚠️ Unable to load avatar preview. Please check the URL is correct and accessible.
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>• Bot name changes will be applied immediately</p>
                  <p>• Avatar changes will update the bot's global profile picture</p>
                  <p>• Changes apply to this server only (for name) or globally (for avatar)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
