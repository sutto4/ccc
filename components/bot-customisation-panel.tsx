"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Save, AlertCircle, CheckCircle, Bot, Type } from "lucide-react";

type BotCustomization = {
  bot_name: string;
};

export default function BotCustomisationPanel({ guildId }: { guildId: string }) {
  const [customization, setCustomization] = useState<BotCustomization>({
    bot_name: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!guildId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/bot-customization`);
        if (res.ok) {
          const data = await res.json();
          if (data.customization) {
            setCustomization(data.customization);
          }
        }
      } catch (error) {
        console.error('Failed to load bot customization:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-customization`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customization),
      });

      if (res.ok) {
        setSaveMessage({ type: 'success', text: 'Bot customization saved! Changes may take a few minutes to apply.' });
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        const data = await res.json();
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save customization' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset bot customization to defaults?')) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-customization`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCustomization({ bot_name: '' });
        setSaveMessage({ type: 'success', text: 'Bot customization reset to defaults!' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to reset customization' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading bot customization...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Customize the bot's nickname for this server (Premium Feature)
        </p>
      </div>


      {saveMessage && (
        <div className={`rounded-lg p-4 ${
          saveMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {saveMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={`text-sm font-medium ${
              saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {saveMessage.text}
            </p>
          </div>
        </div>
      )}

      {/* Customization Form */}
      <div className="max-w-md">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Bot Nickname</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Bot Nickname
              </Label>
              <Input
                type="text"
                placeholder="Leave empty for default bot name"
                value={customization.bot_name}
                onChange={(e) => setCustomization({ ...customization, bot_name: e.target.value })}
                maxLength={32}
              />
              <p className="text-xs text-gray-500">
                The display name for the bot in this server only (max 32 characters)
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Nickname'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleReset} 
                disabled={saving}
              >
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Important Information</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              <strong>Nickname:</strong> Sets the bot's nickname in this server only. Requires bot to have "Change Nickname" permission.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              <strong>Delay:</strong> Changes may take a few minutes to apply due to Discord's rate limits and caching.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              <strong>Premium:</strong> This feature requires an active premium subscription for your server.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              <strong>Avatar:</strong> Bot avatars cannot be customized per-server due to Discord API limitations. Only global avatar changes are supported.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

