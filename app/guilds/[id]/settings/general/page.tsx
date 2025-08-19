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
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface GeneralSettings {
  server_name: string;
  welcome_message: string;
  prefix: string;
  language: string;
  timezone: string;
  auto_role: string;
  log_channel: string;
}

export default function GeneralSettingsPage() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GeneralSettings>({
    server_name: "",
    welcome_message: "",
    prefix: "!",
    language: "en",
    timezone: "UTC",
    auto_role: "",
    log_channel: ""
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
        // const response = await fetch(`/api/guilds/${guildId}/general`);
        // if (!response.ok) throw new Error(`Failed to load settings: ${response.statusText}`);
        // const data = await response.json();
        // setSettings(data);
        
        // For now, use placeholder data
        setSettings({
          server_name: "My Discord Server",
          welcome_message: "Welcome to the server!",
          prefix: "!",
          language: "en",
          timezone: "UTC",
          auto_role: "",
          log_channel: ""
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
  const handleInputChange = (field: keyof GeneralSettings, value: string) => {
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
      // const response = await fetch(`/api/guilds/${guildId}/general`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });
      // if (!response.ok) throw new Error(`Failed to save settings: ${response.statusText}`);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Settings saved successfully');
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
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <Section title="General Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">General Settings</h2>
            <p className="text-muted-foreground">
              Configure basic server settings and preferences
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

        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Settings</CardTitle>
            <CardDescription>
              Configure fundamental server preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="server_name">Server Name</Label>
                <Input
                  id="server_name"
                  value={settings.server_name}
                  onChange={(e) => handleInputChange('server_name', e.target.value)}
                  placeholder="Enter server name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prefix">Command Prefix</Label>
                <Input
                  id="prefix"
                  value={settings.prefix}
                  onChange={(e) => handleInputChange('prefix', e.target.value)}
                  placeholder="!"
                  maxLength={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome_message">Welcome Message</Label>
              <Textarea
                id="welcome_message"
                value={settings.welcome_message}
                onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                placeholder="Enter welcome message for new members"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
            <CardDescription>
              Configure language and timezone preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={settings.language} onValueChange={(value) => handleInputChange('language', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ru">Russian</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">Eastern Time</SelectItem>
                    <SelectItem value="CST">Central Time</SelectItem>
                    <SelectItem value="MST">Mountain Time</SelectItem>
                    <SelectItem value="PST">Pacific Time</SelectItem>
                    <SelectItem value="GMT">GMT</SelectItem>
                    <SelectItem value="CET">Central European Time</SelectItem>
                    <SelectItem value="JST">Japan Standard Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Settings</CardTitle>
            <CardDescription>
              Configure automatic server features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auto_role">Auto-Assign Role</Label>
                <Input
                  id="auto_role"
                  value={settings.auto_role}
                  onChange={(e) => handleInputChange('auto_role', e.target.value)}
                  placeholder="Role ID or name"
                />
                <p className="text-xs text-muted-foreground">
                  Role to automatically assign to new members
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="log_channel">Log Channel</Label>
                <Input
                  id="log_channel"
                  value={settings.log_channel}
                  onChange={(e) => handleInputChange('log_channel', e.target.value)}
                  placeholder="Channel ID or name"
                />
                <p className="text-xs text-muted-foreground">
                  Channel for bot logs and notifications
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-5 w-5" />
              Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700">
              These settings control the basic behavior of your server. Changes are applied immediately 
              and affect all bot interactions. Some settings may require bot permissions to function properly.
            </p>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
