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
import { CheckCircle, XCircle, AlertCircle, Settings, Bot } from "lucide-react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';
import { timezones } from '@/lib/timezones';

interface GeneralSettings {
  welcome_message: string;
  prefix: string;
  timezone: string;
  auto_role: string;
  modlog_channel: string;
}

export default function GeneralSettingsPage() {
  return (
    <AuthErrorBoundary>
      <GeneralSettingsPageContent undefined />
    </AuthErrorBoundary>
  );
}

function GeneralSettingsPageContent() {
  
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GeneralSettings>({
    welcome_message: "",
    prefix: "!",
    timezone: "UTC",
    auto_role: "",
    modlog_channel: ""
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
          welcome_message: "Welcome to the server!",
          prefix: "!",
          timezone: "UTC",
          auto_role: "",
          modlog_channel: ""
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
            <h2 className="text-xl font-semibold">General Settings - UPDATED</h2>
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
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Settings
            </CardTitle>
            <CardDescription>
              Configure fundamental server preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Command Prefix</Label>
                <Input
                  id="prefix"
                  value={settings.prefix}
                  onChange={(e) => handleInputChange('prefix', e.target.value)}
                  placeholder="!"
                  maxLength={3}
                />
                <p className="text-xs text-muted-foreground">
                  The prefix used for bot commands (e.g., !help)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used for scheduling and time-based features
                </p>
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
              <p className="text-xs text-muted-foreground">
                Message sent to new members when they join the server
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Modlog Channel Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Modlog Channel
            </CardTitle>
            <CardDescription>
              Configure where ServerMate sends system messages and logs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modlog_channel">Modlog Channel</Label>
              <Input
                id="modlog_channel"
                value={settings.modlog_channel}
                onChange={(e) => handleInputChange('modlog_channel', e.target.value)}
                placeholder="Channel ID or name (e.g., #modlog)"
              />
              <p className="text-xs text-muted-foreground">
                This channel will receive system messages from ServerMate including moderation logs, 
                feature notifications, and other important updates.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Assign Role */}
        <Card>
          <CardHeader>
            <CardTitle>Auto-Assign Role</CardTitle>
            <CardDescription>
              Automatically assign roles to new members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auto_role">Auto-Assign Role</Label>
              <Input
                id="auto_role"
                value={settings.auto_role}
                onChange={(e) => handleInputChange('auto_role', e.target.value)}
                placeholder="Role ID or name"
              />
              <p className="text-xs text-muted-foreground">
                Role to automatically assign to new members when they join the server
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Setup Guide */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <AlertCircle className="h-5 w-5" />
              Quick Setup Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-green-700 font-medium">
                Follow these steps to complete your ServerMate setup:
              </p>
              <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                <li><strong>Set Role Permissions</strong> - Go to Role Permissions tab to configure who can access the web app</li>
                <li><strong>Enable Features</strong> - Go to Features tab to turn on the features you want to use</li>
                <li><strong>Configure Commands</strong> - Set up individual command permissions in the Features tab</li>
                <li><strong>Set Modlog Channel</strong> - Choose where ServerMate sends system messages (above)</li>
              </ol>
              <p className="text-xs text-green-600 mt-2">
                💡 Use the <code>/setup</code> command in Discord for a quick setup link anytime!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );

}
