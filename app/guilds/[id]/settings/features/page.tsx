"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Section from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  MessageSquare, 
  Shield, 
  Users, 
  Settings, 
  Zap, 
  Crown,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface Feature {
  feature_name: string;
  display_name: string;
  description: string;
  minimum_package: 'free' | 'premium';
  is_active: boolean;
  enabled: boolean;
}

interface GuildFeatures {
  [key: string]: boolean;
}

interface FeaturesResponse {
  guildId: string;
  features: GuildFeatures;
}

export default function GuildFeaturesSettings() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [guildFeatures, setGuildFeatures] = useState<GuildFeatures>({});
  const [globalSlashCommands, setGlobalSlashCommands] = useState(true);
  const [globalCustomCommands, setGlobalCustomCommands] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load features and guild settings
  useEffect(() => {
    if (!guildId || !session) return;
    
    const loadFeatures = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch features from API
        const response = await fetch(`/api/guilds/${guildId}/features`);
        if (!response.ok) {
          throw new Error(`Failed to load features: ${response.statusText}`);
        }
        
        const data: FeaturesResponse = await response.json();
        
        // Transform API response to Feature objects
        const featureList: Feature[] = [];
        Object.entries(data.features).forEach(([key, enabled]) => {
          if (key.endsWith('_package')) return; // Skip package keys
          
          const packageKey = `${key}_package`;
          const packageType = data.features[packageKey] || 'free';
          
          featureList.push({
            feature_name: key,
            display_name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            description: getFeatureDescription(key),
            minimum_package: packageType as 'free' | 'premium',
            is_active: true,
            enabled: enabled
          });
        });
        
        setFeatures(featureList);
        setGuildFeatures(data.features);
        
        // Set global toggles based on feature status
        setGlobalSlashCommands(data.features.slash_commands !== false);
        setGlobalCustomCommands(data.features.custom_commands !== false);
        
      } catch (err: any) {
        console.error('Failed to load features:', err);
        setError(err.message || 'Failed to load features');
      } finally {
        setLoading(false);
      }
    };
    
    loadFeatures();
  }, [guildId, session]);

  // Get feature description
  const getFeatureDescription = (featureName: string): string => {
    const descriptions: { [key: string]: string } = {
      verification_system: 'Automated user verification system with customizable requirements',
      feedback_system: 'Collect and manage user feedback, bug reports, and suggestions',
      moderation: 'Basic moderation commands and tools for server management',
      reaction_roles: 'Assign roles through reactions on messages',
      custom_commands: 'Create custom bot commands with custom responses',
      embedded_messages: 'Create and manage embedded messages for announcements',
      fdg_donator_sync: 'Sync with FDG donator system for premium features',
      custom_prefix: 'Set custom bot command prefix for your server',
      fivem_esx: 'FiveM ESX framework integration and commands',
      fivem_qbcore: 'FiveM QBCore framework integration and commands',
      creator_alerts: 'Get notified about creator activities and updates',
      bot_customisation: 'Customize bot appearance, behavior, and responses',
      custom_groups: 'Create and manage custom user groups and permissions',
      premium_members: 'Manage premium member benefits and exclusive features'
    };
    
    return descriptions[featureName] || 'Feature description not available';
  };

  // Handle feature toggle
  const handleFeatureToggle = useCallback(async (featureName: string, enabled: boolean) => {
    try {
      setSaving(true);
      setError(null);
      
      // Update local state immediately for better UX
      setGuildFeatures(prev => ({
        ...prev,
        [featureName]: enabled
      }));
      
      // Update features list
      setFeatures(prev => prev.map(f => 
        f.feature_name === featureName 
          ? { ...f, enabled }
          : f
      ));
      
      // Save to database
      const response = await fetch(`/api/guilds/${guildId}/features`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature_name: featureName,
          enabled: enabled
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update feature: ${response.statusText}`);
      }
      
      setSuccess(`Feature "${featureName}" ${enabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Failed to update feature:', err);
      setError(err.message || 'Failed to update feature');
      
      // Revert local state on error
      setGuildFeatures(prev => ({
        ...prev,
        [featureName]: !enabled
      }));
      setFeatures(prev => prev.map(f => 
        f.feature_name === featureName 
          ? { ...f, enabled: !enabled }
          : f
      ));
    } finally {
      setSaving(false);
    }
  }, [guildId]);

  // Handle global slash commands toggle
  const handleGlobalSlashCommandsToggle = useCallback(async (enabled: boolean) => {
    await handleFeatureToggle('slash_commands', enabled);
    setGlobalSlashCommands(enabled);
  }, [handleFeatureToggle]);

  // Handle global custom commands toggle
  const handleGlobalCustomCommandsToggle = useCallback(async (enabled: boolean) => {
    await handleFeatureToggle('custom_commands', enabled);
    setGlobalCustomCommands(enabled);
  }, [handleFeatureToggle]);

  // Save all changes
  const handleSaveAll = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Save all feature changes
      const response = await fetch(`/api/guilds/${guildId}/features/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          features: guildFeatures
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save changes: ${response.statusText}`);
      }
      
      setSuccess('All changes saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Failed to save changes:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [guildId, guildFeatures]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading features...</p>
        </div>
      </div>
    );
  }

  return (
    <Section title="Feature Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Feature Management</h2>
            <p className="text-muted-foreground">
              Enable or disable features for your server
            </p>
          </div>
          <Button 
            onClick={handleSaveAll} 
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
                Save All Changes
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

        {/* Global Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Global Settings
            </CardTitle>
            <CardDescription>
              Control overall feature availability for your server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Global Slash Commands Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Global Slash Commands</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable all slash commands for the server
                  </p>
                </div>
              </div>
              <Switch
                checked={globalSlashCommands}
                onCheckedChange={handleGlobalSlashCommandsToggle}
                disabled={saving}
              />
            </div>

            {/* Global Custom Commands Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium">Global Custom Commands</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable all custom commands for the server
                  </p>
                </div>
              </div>
              <Switch
                checked={globalCustomCommands}
                onCheckedChange={handleGlobalCustomCommandsToggle}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Individual Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Individual Features
            </CardTitle>
            <CardDescription>
              Toggle specific features on or off
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {features.map((feature) => (
                <div key={feature.feature_name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getFeatureIcon(feature.feature_name)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{feature.display_name}</h3>
                          <Badge variant={feature.minimum_package === 'premium' ? 'default' : 'secondary'}>
                            {feature.minimum_package === 'premium' ? (
                              <Crown className="h-3 w-3 mr-1" />
                            ) : null}
                            {feature.minimum_package}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={feature.enabled}
                    onCheckedChange={(enabled) => handleFeatureToggle(feature.feature_name, enabled)}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Feature Status Summary
            </CardTitle>
            <CardDescription>
              Overview of enabled and disabled features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {features.filter(f => f.enabled).length}
                </div>
                <div className="text-sm text-green-700">Features Enabled</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {features.filter(f => !f.enabled).length}
                </div>
                <div className="text-sm text-red-700">Features Disabled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

// Helper function to get feature icons
function getFeatureIcon(featureName: string) {
  const iconClass = "h-5 w-5";
  
  switch (featureName) {
    case 'verification_system':
      return <Shield className={`${iconClass} text-blue-600`} />;
    case 'feedback_system':
      return <MessageSquare className={`${iconClass} text-green-600`} />;
    case 'moderation':
      return <Shield className={`${iconClass} text-red-600`} />;
    case 'reaction_roles':
      return <Users className={`${iconClass} text-purple-600`} />;
    case 'custom_commands':
      return <Bot className={`${iconClass} text-indigo-600`} />;
    case 'embedded_messages':
      return <MessageSquare className={`${iconClass} text-orange-600`} />;
    case 'fdg_donator_sync':
      return <Crown className={`${iconClass} text-yellow-600`} />;
    case 'custom_prefix':
      return <Settings className={`${iconClass} text-gray-600`} />;
    case 'fivem_esx':
      return <Zap className={`${iconClass} text-blue-600`} />;
    case 'fivem_qbcore':
      return <Zap className={`${iconClass} text-green-600`} />;
    case 'creator_alerts':
      return <AlertCircle className={`${iconClass} text-purple-600`} />;
    case 'bot_customisation':
      return <Settings className={`${iconClass} text-indigo-600`} />;
    case 'custom_groups':
      return <Users className={`${iconClass} text-pink-600`} />;
    case 'premium_members':
      return <Crown className={`${iconClass} text-yellow-600`} />;
    default:
      return <Zap className={`${iconClass} text-gray-600`} />;
  }
}
