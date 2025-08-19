"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, XCircle, Palette, Bot, MessageSquare, Settings } from "lucide-react";

interface BotCustomization {
  bot_name: string;
  bot_avatar: string;
  embed_color: string;
  response_style: 'friendly' | 'professional' | 'casual' | 'formal';
  auto_responses: boolean;
  welcome_dm: boolean;
  welcome_message: string;
  goodbye_message: string;
  log_level: 'minimal' | 'normal' | 'verbose';
  command_cooldown: number;
  max_response_length: number;
}

export default function BotCustomizationPage() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BotCustomization>({
    bot_name: "Discord Bot",
    bot_avatar: "",
    embed_color: "#5865F2",
    response_style: 'friendly',
    auto_responses: true,
    welcome_dm: false,
    welcome_message: "Welcome to the server! I'm here to help.",
    goodbye_message: "Thanks for being part of our community!",
    log_level: 'normal',
    command_cooldown: 3,
    max_response_length: 2000
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    if (!guildId || !session) return;
    
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // TODO: Replace with actual API call when endpoint is created
        // const response = await fetch(`/api/guilds/${guildId}/bot-customization`);
        // if (!response.ok) throw new Error(`Failed to load settings: ${response.statusText}`);
        // const data = await response.json();
        // setSettings(data);
        
        // For now, use placeholder data
        setSettings({
          bot_name: "Discord Bot",
          bot_avatar: "",
          embed_color: "#5865F2",
          response_style: 'friendly',
          auto_responses: true,
          welcome_dm: false,
          welcome_message: "Welcome to the server! I'm here to help.",
          goodbye_message: "Thanks for being part of our community!",
          log_level: 'normal',
          command_cooldown: 3,
          max_response_length: 2000
        });
        
      } catch (err: any) {
        console.error('Failed to load settings:', err);
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [guildId, session]);

  // Handle input changes
  const handleInputChange = (field: keyof BotCustomization, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // TODO: Replace with actual API call when endpoint is created
      // const response = await fetch(`/api/guilds/${guildId}/bot-customization`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });
      // if (!response.ok) throw new Error(`Failed to save settings: ${response.statusText}`);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Bot customization saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bot customization...</p>
        </div>
      </div>
    );
  }

  return (
    <Section title="Bot Customization">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Bot Customization</h2>
            <p className="text-muted-foreground">
              Customize your bot's appearance and behavior
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Bot Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot Identity
            </CardTitle>
            <CardDescription>
              Customize how your bot appears to users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bot_name">Bot Name</Label>
                <Input
                  id="bot_name"
                  value={settings.bot_name}
                  onChange={(e) => handleInputChange('bot_name', e.target.value)}
                  placeholder="Enter bot name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bot_avatar">Bot Avatar URL</Label>
                <Input
                  id="bot_avatar"
                  value={settings.bot_avatar}
                  onChange={(e) => handleInputChange('bot_avatar', e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="embed_color">Embed Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="embed_color"
                  value={settings.embed_color}
                  onChange={(e) => handleInputChange('embed_color', e.target.value)}
                  placeholder="#5865F2"
                  className="w-32"
                />
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: settings.embed_color }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Response Settings
            </CardTitle>
            <CardDescription>
              Configure how your bot responds to users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="response_style">Response Style</Label>
                <Select value={settings.response_style} onValueChange={(value) => handleInputChange('response_style', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="command_cooldown">Command Cooldown (seconds)</Label>
                <Input
                  id="command_cooldown"
                  type="number"
                  min="0"
                  max="60"
                  value={settings.command_cooldown}
                  onChange={(e) => handleInputChange('command_cooldown', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_response_length">Max Response Length</Label>
              <Input
                id="max_response_length"
                type="number"
                min="100"
                max="4000"
                value={settings.max_response_length}
                onChange={(e) => handleInputChange('max_response_length', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Automation Settings
            </CardTitle>
            <CardDescription>
              Configure automatic bot responses and behaviors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Auto Responses</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic responses to common messages
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.auto_responses}
                onCheckedChange={(checked) => handleInputChange('auto_responses', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium">Welcome DM</h3>
                  <p className="text-sm text-muted-foreground">
                    Send welcome message to new members via DM
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.welcome_dm}
                onCheckedChange={(checked) => handleInputChange('welcome_dm', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome_message">Welcome Message</Label>
              <Textarea
                id="welcome_message"
                value={settings.welcome_message}
                onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                placeholder="Message to send to new members"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goodbye_message">Goodbye Message</Label>
              <Textarea
                id="goodbye_message"
                value={settings.goodbye_message}
                onChange={(e) => handleInputChange('goodbye_message', e.target.value)}
                placeholder="Message to send when members leave"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Logging Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Logging Settings</CardTitle>
            <CardDescription>
              Configure bot logging and monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="log_level">Log Level</Label>
              <Select value={settings.log_level} onValueChange={(value) => handleInputChange('log_level', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal - Only errors and important events</SelectItem>
                  <SelectItem value="normal">Normal - Standard logging (recommended)</SelectItem>
                  <SelectItem value="verbose">Verbose - Detailed logging for debugging</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              See how your bot will appear with current settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-10 h-10 rounded-full border-2"
                  style={{ backgroundColor: settings.embed_color }}
                />
                <div>
                  <div className="font-medium">{settings.bot_name}</div>
                  <div className="text-xs text-muted-foreground">Bot</div>
                </div>
              </div>
              <div 
                className="p-3 rounded-lg text-sm"
                style={{ 
                  backgroundColor: settings.embed_color + '20',
                  borderLeft: `4px solid ${settings.embed_color}`
                }}
              >
                This is how your bot's embeds will look with the current color settings.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
