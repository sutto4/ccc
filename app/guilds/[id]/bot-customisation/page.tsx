"use client";

import React, { useState, useEffect } from "react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, SaveIcon, RefreshCwIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

export default async function BotCustomisationPage(undefined) {
  return (
    <AuthErrorBoundary>
      <BotCustomisationPageContent undefined />
    </AuthErrorBoundary>
  );
}

async function BotCustomisationPageContent(undefined) {
  
  const { data: session } = useSession();
  const [botName, setBotName] = useState("");
  const [botAvatarUrl, setBotAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const guildId = typeof window !== 'undefined' ? window.location.pathname.match(/guilds\/(\d+)/)?.[1] : null;

  useEffect(() => {
    if (guildId) {
      loadBotSettings();
    }
  }, [guildId]);

  const loadBotSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-customisation`);
      if (res.ok) {
        const data = await res.json();
        setBotName(data.botName || "");
        setBotAvatarUrl(data.botAvatarUrl || "");
        setPreviewUrl(data.botAvatarUrl || "");
      }
    } catch (error) {
      console.error("Failed to load bot settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveBotSettings = async () => {
    if (!guildId) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-customisation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botName: botName.trim(),
          botAvatarUrl: botAvatarUrl.trim()
        })
      });

      if (res.ok) {
        setMessage("Bot settings saved successfully! ✅");
        setPreviewUrl(botAvatarUrl);
      } else {
        const error = await res.json();
        setMessage(`Failed to save: ${error.error || 'Unknown error'} ❌`);
      }
    } catch (error) {
      setMessage("Failed to save bot settings ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUrlChange = (url: string) => {
    setBotAvatarUrl(url);
    // Update preview immediately
    setPreviewUrl(url);
  };

  const handleImageError = () => {
    setPreviewUrl("");
  };

  if (loading) {
    return (
      <Section title="Bot Customisation">
        <div className="flex items-center justify-center py-8">
          <RefreshCwIcon className="w-6 h-6 animate-spin mr-2" />
          Loading bot settings...
        </div>
      </Section>
    );
  }

  return (
    <Section title="Bot Customisation">
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Customise how your bot appears when sending messages. These settings will apply to all bot messages in your server.
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Bot Name Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Bot Name</label>
              <Input
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Enter custom bot name..."
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will replace "ServerMate Bot" in all bot messages. Leave empty to use default.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bot Avatar URL</label>
              <Input
                value={botAvatarUrl}
                onChange={(e) => handleAvatarUrlChange(e.target.value)}
                placeholder="https://example.com/avatar.png"
                type="url"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a direct image URL for the bot's avatar. Leave empty to use default.
              </p>
            </div>

            <Button
              onClick={saveBotSettings}
              disabled={saving}
              className="w-full"
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Bot Settings'}
            </Button>

            {message && (
              <div className={`text-sm p-3 rounded-md ${
                message.includes('✅') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Preview</label>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start gap-3">
                  {/* Avatar Preview */}
                  <div className="flex-shrink-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Bot Avatar Preview"
                        className="w-10 h-10 rounded-full border-2 border-border"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Message Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 text-sm">
                      <span className="font-semibold">
                        {botName.trim() || "ServerMate Bot"}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      This is how your bot messages will appear with the custom name and avatar.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Note:</strong> Changes may take a few minutes to appear in Discord.</p>
              <p><strong>Premium Feature:</strong> This feature requires a premium subscription.</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );

}
