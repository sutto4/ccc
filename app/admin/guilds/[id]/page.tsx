"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Shield, Settings, RefreshCw, Bot, Brain, Clock, BarChart3, Users, Database, Activity, AlertTriangle } from "lucide-react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';
import { useCommandMappingsQuery } from "@/hooks/use-command-mapping-query";
import { fetchWebAppFeatures, updateWebAppFeatures } from "@/lib/api";

interface Feature {
  key: string;
  name: string;
  description: string;
  minimumPackage: string;
  enabled: boolean;
  canEnable?: boolean;
}

interface Guild {
  guild_id: string;
  guild_name: string;
  guild_icon_url?: string;
  premium: boolean;
  owner_name?: string;
  member_count?: number;
  created_at: string;
}

interface AIConfig {
  enabled: boolean;
  model: string;
  max_tokens_per_request: number;
  max_messages_per_summary: number;
  custom_prompt: string | null;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
}

export default function AdminGuildSettingsPage() {
  return (
    <AuthErrorBoundary>
      <AdminGuildSettingsPageContent />
    </AuthErrorBoundary>
  );
}

function AdminGuildSettingsPageContent() {
  
  const params = useParams<{ id: string }>();
  const guildId = params?.id;
  
  const [guild, setGuild] = useState<Guild | null>(null);
  const [webAppFeatures, setWebAppFeatures] = useState<{
    features: Feature[];
    states: Record<string, boolean>;
    isPremium: boolean;
  }>({
    features: [],
    states: {},
    isPremium: false
  });
  const [commandStates, setCommandStates] = useState<Record<string, boolean>>({});
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    enabled: false,
    model: 'gpt-3.5-turbo',
    max_tokens_per_request: 1000,
    max_messages_per_summary: 50,
    custom_prompt: null,
    rate_limit_per_hour: 10,
    rate_limit_per_day: 100
  });
  const [aiConfigOriginal, setAiConfigOriginal] = useState<AIConfig>(aiConfig);
  const [aiHasChanges, setAiHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Use React Query for command mappings
  const { data: commandMappings = [], isLoading: commandMappingsLoading } = useCommandMappingsQuery();

  useEffect(() => {
    console.log('Admin page loaded, guildId:', guildId);
    if (guildId) {
      fetchGuildData();
      loadAIConfig();
    }
  }, [guildId]);

  const fetchGuildData = async () => {
    try {
      setLoading(true);
      
      // Fetch guild info
      const guildResponse = await fetch(`/api/admin/guilds/${guildId}`);
      if (!guildResponse.ok) throw new Error('Failed to fetch guild');
      const responseData = await guildResponse.json();
      console.log('🔍 ADMIN GUILD RESPONSE:', responseData);
      
      // The API returns { guild: { ... } }, so extract the guild object
      const guildData = responseData.guild || responseData;
      setGuild(guildData);

      // Fetch web app features (same as regular guild settings page)
      console.log('🔍 ADMIN LOADING WEB APP FEATURES...');
      const featuresData = await fetchWebAppFeatures(guildId);
      console.log('🔍 ADMIN FEATURES DATA:', featuresData);
      setWebAppFeatures(featuresData);

      // Fetch command states
      try {
        const commandsResponse = await fetch(`/api/guilds/${guildId}/commands`);
        if (commandsResponse.ok) {
          const commandsData = await commandsResponse.json();
          const commandStatesMap: Record<string, boolean> = {};
          commandsData.commands.forEach((cmd: any) => {
            commandStatesMap[cmd.name] = cmd.enabled;
          });
          setCommandStates(commandStatesMap);
          console.log('🚨🚨🚨 COMMAND STATES LOADED! 🚨🚨🚨', commandStatesMap);
        }
      } catch (err) {
        console.error('Error fetching command states:', err);
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (displayName: string, enabled: boolean) => {
    try {
      setSaving(true);

      // Find the feature to get the actual feature key for the API call
      const feature = webAppFeatures.features.find(f => f.name === displayName);
      
      if (!feature) {
        console.error(`Feature not found: ${displayName}`);
        throw new Error(`Feature not found: ${displayName}`);
      }
      
      console.log(`🔍 ADMIN TOGGLING FEATURE: ${feature.key} = ${enabled}`);
      
      // Use the same API function as the regular guild settings page
      await updateWebAppFeatures(guildId, {
        [feature.key]: enabled
      });

      // Update local features state (same as guild settings page)
      setWebAppFeatures(prev => ({
        ...prev,
        states: {
          ...prev.states,
          [feature.key]: enabled
        },
        features: prev.features.map(f => 
          f.key === feature.key ? { ...f, enabled } : f
        )
      }));

      // Get associated commands and update them
      const commandsToUpdate = commandMappings
        .filter((cmd: any) => cmd.feature_key === feature.key)
        .map((cmd: any) => ({
          command_name: cmd.command_name,
          feature_name: cmd.feature_name,
          enabled: enabled
        }));
      
      console.log(`🚨🚨🚨 UPDATING ${commandsToUpdate.length} COMMANDS FOR FEATURE ${feature.key} 🚨🚨🚨`);

      if (commandsToUpdate.length > 0) {
        const commandsResponse = await fetch(`/api/guilds/${guildId}/commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commands: commandsToUpdate })
        });
        
        if (!commandsResponse.ok) {
          const errorText = await commandsResponse.text();
          console.error('Failed to update commands:', errorText);
          throw new Error(`Failed to update associated commands: ${errorText}`);
        }
        
        // Update local command states
        setCommandStates(prev => {
          const updated = { ...prev };
          commandsToUpdate.forEach(cmd => {
            updated[cmd.command_name] = cmd.enabled;
          });
          return updated;
        });
        
        console.log(`🚨🚨🚨 SUCCESSFULLY UPDATED ${commandsToUpdate.length} COMMANDS! 🚨🚨🚨`);
      }
      
      setSuccess(`Feature ${displayName} ${enabled ? 'enabled' : 'disabled'} successfully! ${commandsToUpdate.length > 0 ? `(${commandsToUpdate.length} commands updated)` : ''}`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const setupDefaultFeatures = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/guilds/${guildId}/features/setup-defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to setup default features');
      
      setSuccess('Default features setup successfully!');
      setTimeout(() => setSuccess(null), 3000);
      fetchGuildData(); // Refresh features after setup
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const loadAIConfig = async () => {
    try {
      setAiLoading(true);
      const response = await fetch(`/api/guilds/${guildId}/ai/config`);
      if (!response.ok) {
        throw new Error(`Failed to load AI config: ${response.statusText}`);
      }
      const configData = await response.json();
      setAiConfig(configData);
      setAiConfigOriginal(configData); // Store original for comparison
      setAiHasChanges(false); // Reset changes flag
    } catch (err: any) {
      console.error('Failed to load AI config:', err);
      setError(err.message || 'Failed to load AI configuration');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIConfigChange = (updates: Partial<AIConfig>) => {
    const newConfig = { ...aiConfig, ...updates };
    setAiConfig(newConfig);
    
    // Check if there are changes compared to original
    const hasChanges = JSON.stringify(newConfig) !== JSON.stringify(aiConfigOriginal);
    setAiHasChanges(hasChanges);
  };

  const saveAIConfig = async () => {
    try {
      setAiSaving(true);
      
      // Calculate what has changed
      const changes: any = {};
      Object.keys(aiConfig).forEach(key => {
        const typedKey = key as keyof AIConfig;
        if (aiConfig[typedKey] !== aiConfigOriginal[typedKey]) {
          changes[typedKey] = aiConfig[typedKey];
        }
      });

      if (Object.keys(changes).length === 0) {
        setSuccess('No changes to save');
        setTimeout(() => setSuccess(null), 2000);
        return;
      }
      
      const response = await fetch(`/api/guilds/${guildId}/ai/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update AI config: ${response.statusText}`);
      }
      
      setAiConfigOriginal(aiConfig);
      setAiHasChanges(false);
      setSuccess('AI configuration saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Failed to save AI config:', error);
      setError(error.message || 'Failed to save AI configuration');
      setTimeout(() => setError(null), 5000);
      
      // Revert changes on error
      setAiConfig(aiConfigOriginal);
      setAiHasChanges(false);
    } finally {
      setAiSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Guild Settings</h1>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Guild Settings</h1>
        </div>
        <div className="text-center py-8 text-red-600">Guild not found</div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Settings - {guild.guild_name}</h1>
              </div>
      
      {/* Guild Overview Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
              </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{guild.guild_name}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-600">ID: {guild.guild_id}</span>
              <span className="text-sm text-gray-600">•</span>
              <span className="text-sm text-gray-600">{guild.member_count || 'Unknown'} members</span>
              <span className="text-sm text-gray-600">•</span>
              <span className="text-sm text-gray-600">Owner: {guild.owner_name || 'Unknown'}</span>
              {guild.premium && (
                <>
                  <span className="text-sm text-gray-600">•</span>
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </>
                  )}
                </div>
              </div>
            </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="features" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="commands" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Commands
          </TabsTrigger>
          <TabsTrigger value="ai-config" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Config
          </TabsTrigger>
          <TabsTrigger value="admin-tools" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Admin Tools
          </TabsTrigger>
        </TabsList>


        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Feature Management
                </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enable or disable features for this server
                </p>
              </div>
              <Button
                onClick={setupDefaultFeatures}
                disabled={saving}
                  className="flex items-center gap-2"
              >
                  <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                  Setup Defaults
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                    <p>Loading features...</p>
                  </div>
                )}
                {!loading && webAppFeatures.features.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No features found.</p>
                    <p className="text-xs mt-2">Check console for debug info</p>
                    <Button 
                      onClick={() => {
                        console.log('🔍 MANUALLY TESTING FEATURES...');
                        setWebAppFeatures({
                          features: [
                            {
                              key: 'moderation',
                              name: 'Moderation',
                              description: 'Moderation tools and commands',
                              minimumPackage: 'free',
                              enabled: true,
                              canEnable: true
                            },
                            {
                              key: 'verification_system',
                              name: 'Verification System',
                              description: 'User verification system',
                              minimumPackage: 'free',
                              enabled: false,
                              canEnable: true
                            }
                          ],
                          states: {
                            moderation: true,
                            verification_system: false
                          },
                          isPremium: false
                        });
                      }}
                      className="mt-4"
                      variant="outline"
                    >
                      Load Test Features
                    </Button>
                  </div>
                )}
                {!loading && webAppFeatures.features.length > 0 && (
                  <div className="space-y-6">
                    {/* Free Features */}
                    <div>
                      <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Free Features
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {webAppFeatures.features.filter(feature => feature.minimumPackage === 'free').map((feature) => {
                          const isEnabled = feature.enabled;
                          const canEnable = feature.canEnable;
                          
                          return (
                            <div key={feature.key} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} ${!canEnable ? 'opacity-60' : ''}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{feature.name}</p>
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    Free
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  disabled={!canEnable || saving}
                                  onChange={(e) => {
                                    if (!canEnable) {
                                      setError("This feature requires a premium subscription.");
                                      setTimeout(() => setError(null), 3000);
                                      return;
                                    }
                                    toggleFeature(feature.name, e.target.checked);
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className={`text-xs font-medium ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                  {isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Premium Features */}
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-700 mb-4 flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        Premium Features
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {webAppFeatures.features.filter(feature => feature.minimumPackage === 'premium').map((feature) => {
                          const isEnabled = feature.enabled;
                          const canEnable = feature.canEnable;
                          const isPremiumFeature = feature.minimumPackage === 'premium';
                          
                          return (
                            <div key={feature.key} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} ${!canEnable ? 'opacity-60' : ''}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{feature.name}</p>
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                    Premium
                                  </Badge>
                                  {!canEnable && isPremiumFeature && (
                                    <Badge variant="destructive" className="text-xs">
                                      Requires Premium
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  disabled={!canEnable || saving}
                                  onChange={(e) => {
                                    if (!canEnable) {
                                      setError("This feature requires a premium subscription.");
                                      setTimeout(() => setError(null), 3000);
                                      return;
                                    }
                                    toggleFeature(feature.name, e.target.checked);
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className={`text-xs font-medium ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                  {isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        {/* Commands Tab */}
        <TabsContent value="commands" className="space-y-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bot className="w-5 h-5" />
              Command Management
            </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage individual command states. Changes are applied immediately.
            </p>
          </CardHeader>
          <CardContent>
              {commandMappingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading commands...
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    commandMappings.reduce((acc: Record<string, any[]>, cmd: any) => {
                      const featureName = cmd.feature_key || 'other';
                      if (!acc[featureName]) acc[featureName] = [];
                      acc[featureName].push(cmd);
                      return acc;
                    }, {})
                  ).map(([featureName, commands]) => {
                    // Map feature names to display names
                    const getFeatureDisplayName = (name: string) => {
                      switch (name) {
                        case 'moderation': return '🛡️ Moderation';
                        case 'utilities': return '🔧 Utilities';
                        case 'sticky_messages': return '📌 Sticky Messages';
                        case 'verification_system': return '✅ Verification';
                        case 'feedback_system': return '💬 Feedback';
                        case 'embedded_messages': return '📝 Embedded Messages';
                        case 'reaction_roles': return '🎭 Reaction Roles';
                        case 'bot_customisation': return '🤖 Bot Customisation';
                        case 'custom_commands': return '⚙️ Custom Commands';
                        case 'ban_sync': return '🔄 Ban Sync';
                        case 'creator_alerts': return '📢 Creator Alerts';
                        case 'custom_prefix': return '🔤 Custom Prefix';
                        case 'custom_groups': return '👥 Custom Groups';
                        case 'fdg_donator_sync': return '💰 FDG Donator Sync';
                        default: return `🔹 ${name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
                      }
                    };

                    return (
                    <div key={featureName} className="space-y-3">
                      <h4 className="font-medium text-lg border-b pb-2 flex items-center gap-2">
                        {getFeatureDisplayName(featureName)}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {commands.map((cmd) => (
                          <div key={cmd.command_name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                              <p className="font-medium capitalize">{cmd.command_name}</p>
                            <p className="text-xs text-muted-foreground">{cmd.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={commandStates[cmd.command_name] || false}
                              onChange={(e) => {
                                setCommandStates(prev => ({
                                  ...prev,
                                  [cmd.command_name]: e.target.checked
                                }));
                              }}
                              className="w-4 h-4"
                            />
                              <span className={`text-xs font-medium ${commandStates[cmd.command_name] ? 'text-green-600' : 'text-gray-500'}`}>
                              {commandStates[cmd.command_name] ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </div>
                        ))}
                        </div>
                    </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const commandUpdates: any[] = [];
                      
                      for (const cmd of commandMappings) {
                        const checkbox = document.getElementById(`cmd-${cmd.command_name}`) as HTMLInputElement;
                        if (checkbox) {
                          const isChecked = checkbox.checked;
                          commandUpdates.push({
                            command_name: cmd.command_name,
                            feature_key: cmd.feature_key,
                            enabled: isChecked
                          });
                        }
                      }
                      
                      if (commandUpdates.length > 0) {
                        const response = await fetch(`/api/guilds/${guildId}/commands`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ commands: commandUpdates })
                        });
                        
                        if (!response.ok) {
                          const errorText = await response.text();
                          throw new Error(`Failed to update commands: ${errorText}`);
                        }
                      }
                      
                      setSuccess(`Successfully updated ${commandUpdates.length} commands!`);
                      setTimeout(() => setSuccess(null), 3000);
                      
                    } catch (error) {
                      setError(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      setTimeout(() => setError(null), 5000);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                  Save Command Changes
                </Button>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        {/* AI Config Tab */}
        <TabsContent value="ai-config" className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Configuration Management
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage AI message summarization settings for this guild.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {aiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading AI configuration...
                </div>
              ) : (
                <>
                  {/* AI Enabled Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">AI Message Summarization</h4>
                      <p className="text-sm text-muted-foreground">Enable or disable AI-powered message summarization</p>
                    </div>
                    <Switch
                      checked={aiConfig.enabled}
                      onCheckedChange={(checked) => handleAIConfigChange({ enabled: checked })}
                    />
                  </div>

                  {aiConfig.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Model Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="ai-model">AI Model</Label>
                        <select
                          id="ai-model"
                          value={aiConfig.model}
                          onChange={(e) => handleAIConfigChange({ model: e.target.value })}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        </select>
                      </div>

                      {/* Max Tokens Per Request */}
                      <div className="space-y-2">
                        <Label htmlFor="max-tokens">Max Tokens Per Request</Label>
                        <Input
                          id="max-tokens"
                          type="number"
                          min="100"
                          max="4000"
                          value={aiConfig.max_tokens_per_request}
                          onChange={(e) => handleAIConfigChange({ max_tokens_per_request: parseInt(e.target.value) })}
                        />
                      </div>

                      {/* Max Messages Per Summary */}
                      <div className="space-y-2">
                        <Label htmlFor="max-messages">Max Messages Per Summary</Label>
                        <Input
                          id="max-messages"
                          type="number"
                          min="10"
                          max="200"
                          value={aiConfig.max_messages_per_summary}
                          onChange={(e) => handleAIConfigChange({ max_messages_per_summary: parseInt(e.target.value) })}
                        />
                      </div>

                      {/* Rate Limits */}
                      <div className="space-y-2">
                        <Label htmlFor="rate-limit-hour">Rate Limit Per Hour</Label>
                        <Input
                          id="rate-limit-hour"
                          type="number"
                          min="1"
                          max="100"
                          value={aiConfig.rate_limit_per_hour}
                          onChange={(e) => handleAIConfigChange({ rate_limit_per_hour: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rate-limit-day">Rate Limit Per Day</Label>
                        <Input
                          id="rate-limit-day"
                          type="number"
                          min="10"
                          max="1000"
                          value={aiConfig.rate_limit_per_day}
                          onChange={(e) => handleAIConfigChange({ rate_limit_per_day: parseInt(e.target.value) })}
                        />
                      </div>

                      {/* Custom Prompt - Full Width */}
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="custom-prompt">Custom Prompt</Label>
                        <Textarea
                          id="custom-prompt"
                          placeholder="Enter a custom prompt for AI message summarization..."
                          value={aiConfig.custom_prompt || ''}
                          onChange={(e) => handleAIConfigChange({ custom_prompt: e.target.value })}
                          rows={4}
                        />
                      </div>
          </div>
        )}
        
                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={saveAIConfig}
                      disabled={aiSaving || !aiHasChanges}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${aiSaving ? 'animate-spin' : ''}`} />
                      Save AI Configuration
                    </Button>
          </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tools Tab */}
        <TabsContent value="admin-tools" className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Admin Tools
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Administrative actions for this guild
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Guild Reset</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Reset all features and commands to default state
                  </p>
                  <Button
                    onClick={setupDefaultFeatures}
                    disabled={saving}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
                    Reset to Defaults
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Navigation</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Return to admin dashboard
                  </p>
                  <Button
                    onClick={() => window.history.back()}
                    variant="outline"
                    className="w-full"
                  >
            ← Back to Admin
          </Button>
        </div>
      </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
          <div className="flex items-center gap-2 text-green-800">
            <Activity className="w-4 h-4" />
            <span className="font-medium">Success</span>
          </div>
          <p className="text-green-700 mt-1">{success}</p>
        </div>
      )}
    </div>
  );

}