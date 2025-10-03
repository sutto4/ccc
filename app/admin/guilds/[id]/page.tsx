"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Settings, RefreshCw, Bot, Brain, Clock, BarChart3 } from "lucide-react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';
import { useCommandMappingsQuery } from "@/hooks/use-command-mapping-query";

interface Feature {
  feature_key: string;
  feature_name: string;
  description: string;
  minimum_package: 'free' | 'premium';
  is_active: boolean;
  total_guilds: number;
  enabled_guilds: number;
  disabled_guilds: number;
}

interface GuildFeature {
  feature_name: string;
  feature_key: string;
  enabled: boolean;
  package_override?: 'free' | 'premium';
}

interface Guild {
  guild_id: string;
  guild_name: string;
  guild_icon_url?: string;
  premium: boolean;
  owner_name?: string;
  member_count?: number;
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
      <AdminGuildSettingsPageContent undefined />
    </AuthErrorBoundary>
  );
}

function AdminGuildSettingsPageContent() {
  
  const params = useParams<{ id: string }>();
  const guildId = params?.id;
  
  const [guild, setGuild] = useState<Guild | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [guildFeatures, setGuildFeatures] = useState<GuildFeature[]>([]);
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
  const [aiConfigOriginal, setAiConfigOriginal] = useState<AIConfig>({
    enabled: false,
    model: 'gpt-3.5-turbo',
    max_tokens_per_request: 1000,
    max_messages_per_summary: 50,
    custom_prompt: null,
    rate_limit_per_hour: 10,
    rate_limit_per_day: 100
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiHasChanges, setAiHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
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
      console.log('Fetching guild data for guildId:', guildId);
      setLoading(true);
      
      // Fetch guild info
      const guildResponse = await fetch(`/api/admin/guilds/${guildId}`);
      if (!guildResponse.ok) throw new Error('Failed to fetch guild info');
      const guildData = await guildResponse.json();
      setGuild(guildData.guild);

      // Fetch all features
      const featuresResponse = await fetch('/api/admin/features');
      if (!featuresResponse.ok) throw new Error('Failed to fetch features');
      const featuresData = await featuresResponse.json();
      setFeatures(featuresData.features || []);

      // Fetch guild features
      const guildFeaturesResponse = await fetch(`/api/guilds/${guildId}/features`);
      if (!guildFeaturesResponse.ok) throw new Error('Failed to fetch guild features');
      const guildFeaturesData = await guildFeaturesResponse.json();
      
      // Transform guild features data
      
      // Create a mapping from display names to feature keys for API calls
      const displayNameToFeatureKeyMap: Record<string, string> = {
        'Ban Syncing': 'ban_sync',
        'Bot Customisation': 'bot_customisation',
        'Creator Alerts': 'creator_alerts',
        'Custom Commands': 'custom_commands',
        'Custom Dot Command Prefix': 'custom_prefix',
        'Custom Groups': 'custom_groups',
        'Embedded Messages': 'embedded_messages',
        'FDG Donator Sync': 'fdg_donator_sync',
        'Feedback Collection': 'feedback_system',
        'FiveM ESX Integration': 'fivem_esx',
        'FiveM QBcore Integration': 'fivem_qbcore',
        'Moderation Tools': 'moderation',
        'Reaction Roles': 'reaction_roles',
        'User Verification System': 'verification_system',
        'AI Message Summarization': 'ai_summarization'
      };
      
      const transformedFeatures = featuresData.features.map((feature: Feature) => {
        // The guild features API now returns feature keys, so we need to use the mapped key
        const featureKey = displayNameToFeatureKeyMap[feature.feature_name];
        const guildFeature = featureKey ? guildFeaturesData.features[featureKey] : undefined;
        return {
          feature_name: feature.feature_name,
          feature_key: featureKey, // Store the actual feature key for API calls
          enabled: guildFeature === true,
          package_override: undefined // We'll add this functionality later
        };
      });
      
      setGuildFeatures(transformedFeatures);
      
      // Fetch current command states
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

      // Find the guild feature to get the actual feature key for the API call
      const guildFeature = guildFeatures.find(f => f.feature_name === displayName);
      
      if (!guildFeature) {
        console.error(`Feature not found: ${displayName}`);
        throw new Error(`Feature not found: ${displayName}`);
      }
      
      const requestBody = {
        feature_name: guildFeature.feature_key, // Use the actual feature key, not display name
        enabled: enabled
      };
      
      
      const response = await fetch(`/api/guilds/${guildId}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('API response status:', response.status);
      console.log('API response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to update feature: ${errorText}`);
      }
      
      // Update local state
      setGuildFeatures(prev => 
        prev.map(f => 
          f.feature_name === displayName 
            ? { ...f, enabled } 
            : f
        )
      );
      
      // Automatically enable/disable associated commands using DB-driven mappings
      const commandsToUpdate = (commandMappings || [])
        .filter((cmd: any) => cmd.feature_key === guildFeature.feature_key)
        .map((cmd: any) => ({
          command_name: cmd.command_name,
          feature_name: guildFeature.feature_key,
          enabled
        }));
      
      // Update commands if any were found
      if (commandsToUpdate.length > 0) {
        console.log(`🚨🚨🚨 AUTO-UPDATING ${commandsToUpdate.length} COMMANDS FOR FEATURE ${displayName}! 🚨🚨🚨`);
        
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
      const changes: Partial<AIConfig> = {};
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
      
      // Update original config to match current
      setAiConfigOriginal(aiConfig);
      setAiHasChanges(false);
      
      setSuccess('AI configuration saved successfully');
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
      <Section title="Admin Guild Settings">
        <div className="text-center py-8">Loading...</div>
      </Section>
    );
  }

  if (!guild) {
    return (
      <Section title="Admin Guild Settings">
        <div className="text-center py-8 text-red-600">Guild not found</div>
      </Section>
    );
  }

  return (
    <Section title={`Admin Settings - ${guild.guild_name}`}>
      <div className="space-y-6">
        {/* Guild Info */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Guild Information
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Guild ID</p>
                <p className="font-mono text-sm">{guild.guild_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Owner</p>
                <p className="text-sm">{guild.owner_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Members</p>
                <p className="text-sm">{guild.member_count || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Premium Status</p>
                <div className="flex items-center gap-2">
                  {guild.premium ? (
                    <>
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Premium</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Free</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Feature Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Feature Management
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enable/disable features for this guild. You can override premium requirements.
                </p>
              </div>
              <Button
                onClick={setupDefaultFeatures}
                disabled={saving}
                variant="outline"
                size="sm"
              >
                Setup Default Features
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {features.map((feature) => {
                // Since both admin features and guild features use display names, we can match directly
                const guildFeature = guildFeatures.find(f => f.feature_name === feature.feature_name);
                const isEnabled = guildFeature?.enabled || false;
                
                return (
                  <div key={feature.feature_name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{feature.feature_name}</h4>
                        {feature.minimum_package === 'premium' && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          feature.minimum_package === 'premium' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {feature.minimum_package}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`feature-${feature.feature_name}`}
                          checked={isEnabled}
                          disabled={saving}
                          onChange={(e) => toggleFeature(feature.feature_name, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`feature-${feature.feature_name}`} className="text-sm">
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Command Management */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Command Management
            </h3>
            <p className="text-sm text-muted-foreground">
              Enable/disable individual slash commands for this guild. These settings override global feature toggles.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {commandMappingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading commands...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Group commands by feature */}
                  {Object.entries(
                    commandMappings.reduce((acc: Record<string, any[]>, cmd: any) => {
                      const feature = cmd.feature_key;
                      if (!acc[feature]) acc[feature] = [];
                      acc[feature].push(cmd);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([featureName, commands]) => (
                    <div key={featureName} className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        {featureName === 'moderation' ? 'Moderation' : 
                         featureName === 'utilities' ? 'Utilities' : 
                         featureName === 'sticky_messages' ? 'Sticky Messages' :
                         featureName}
                      </h4>
                      {commands.map((cmd: any) => (
                        <div key={cmd.command_name} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">/{cmd.command_name}</p>
                            <p className="text-xs text-muted-foreground">{cmd.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`cmd-${cmd.command_name}`}
                              checked={commandStates[cmd.command_name] || false}
                              onChange={(e) => {
                                setCommandStates(prev => ({
                                  ...prev,
                                  [cmd.command_name]: e.target.checked
                                }));
                              }}
                              className="w-4 h-4"
                            />
                          <label htmlFor={`cmd-${cmd.command_name}`} className="text-xs">
                              {commandStates[cmd.command_name] ? 'Enabled' : 'Disabled'}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={async () => {
                    try {
                      console.log('🚨🚨🚨 ADMIN SAVE COMMAND SETTINGS CLICKED! 🚨🚨🚨');
                      console.log('=== SAVE COMMAND SETTINGS CLICKED ===');
                      setSaving(true);
                      
                      // Get all command checkboxes and their current state
                      const commandUpdates = [];
                      
                      // Process command checkboxes using database-driven commands
                      for (const cmd of commandMappings) {
                        const checkbox = document.getElementById(`cmd-${cmd.command_name}`) as HTMLInputElement;
                        if (checkbox) {
                          const isChecked = checkbox.checked;
                          commandUpdates.push({
                            command_name: cmd.command_name,
                            feature_name: cmd.feature_name,
                            enabled: isChecked
                          });
                        }
                      }
                      
                      console.log('🚨🚨🚨 COMMAND UPDATES TO PROCESS! 🚨🚨🚨');
                      console.log('Command updates to process:', commandUpdates);
                      
                      // Process each command update
                      if (commandUpdates.length > 0) {
                        console.log('🚨🚨🚨 PROCESSING COMMAND UPDATES! 🚨🚨🚨');
                        
                        const response = await fetch(`/api/guilds/${guildId}/commands`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ commands: commandUpdates })
                        });
                        
                        if (!response.ok) {
                          const errorText = await response.text();
                          console.error('Failed to update commands:', errorText);
                          throw new Error(`Failed to update commands: ${errorText}`);
                        }
                        
                        console.log('🚨🚨🚨 COMMAND UPDATES SUCCESS! 🚨🚨🚨');
                        console.log(`Successfully updated ${commandUpdates.length} commands`);
                      }
                      
                      console.log('🚨🚨🚨 SHOWING SUCCESS MESSAGE! 🚨🚨🚨');
                      setSuccess(`Successfully updated ${commandUpdates.length} commands!`);
                      setTimeout(() => setSuccess(null), 3000);
                      
                    } catch (error) {
                      console.error('Error saving command settings:', error);
                      setError(`Failed to save settings: ${error.message}`);
                      setTimeout(() => setError(null), 5000);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  variant="outline"
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Command Settings'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration Management */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI Configuration Management
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure AI-powered message summarization settings for this guild
            </p>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Loading AI configuration...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="font-medium">Enable AI Summarization</h4>
                      <p className="text-sm text-muted-foreground">
                        Allow users to use /summarise commands
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={aiConfig.enabled}
                    onCheckedChange={(enabled) => handleAIConfigChange({ enabled })}
                    disabled={aiSaving}
                  />
                </div>

                {/* AI Model Selection */}
                <div className="space-y-2">
                  <Label htmlFor="ai-model">AI Model</Label>
                  <Select
                    id="ai-model"
                    value={aiConfig.model}
                    onChange={(e) => handleAIConfigChange({ model: e.target.value })}
                    disabled={aiSaving}
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Cheaper)</option>
                    <option value="gpt-4">GPT-4 (Higher Quality, More Expensive)</option>
                  </Select>
                </div>

                {/* Max Tokens and Messages */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-max-tokens">Max Tokens per Request</Label>
                        <Input
                          id="ai-max-tokens"
                          type="number"
                          min="100"
                          max="4000"
                          value={aiConfig.max_tokens_per_request}
                          onChange={(e) => handleAIConfigChange({ max_tokens_per_request: parseInt(e.target.value) })}
                          disabled={aiSaving}
                        />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-max-messages">Max Messages per Summary</Label>
                    <Input
                      id="ai-max-messages"
                      type="number"
                      min="1"
                      max="100"
                      value={aiConfig.max_messages_per_summary}
                      onChange={(e) => handleAIConfigChange({ max_messages_per_summary: parseInt(e.target.value) })}
                      disabled={aiSaving}
                    />
                  </div>
                </div>

                {/* Custom Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="ai-custom-prompt">Custom Prompt (Optional)</Label>
                  <Textarea
                    id="ai-custom-prompt"
                    placeholder="Enter a custom prompt to guide the AI's summarization behavior..."
                    value={aiConfig.custom_prompt || ''}
                    onChange={(e) => handleAIConfigChange({ custom_prompt: e.target.value || null })}
                    disabled={aiSaving}
                    rows={3}
                  />
                </div>

                {/* Rate Limiting */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Rate Limiting
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ai-rate-hour">Requests per Hour</Label>
                      <Input
                        id="ai-rate-hour"
                        type="number"
                        min="1"
                        max="100"
                        value={aiConfig.rate_limit_per_hour}
                        onChange={(e) => handleAIConfigChange({ rate_limit_per_hour: parseInt(e.target.value) })}
                        disabled={aiSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-rate-day">Requests per Day</Label>
                      <Input
                        id="ai-rate-day"
                        type="number"
                        min="1"
                        max="1000"
                        value={aiConfig.rate_limit_per_day}
                        onChange={(e) => handleAIConfigChange({ rate_limit_per_day: parseInt(e.target.value) })}
                        disabled={aiSaving}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {aiHasChanges ? (
                      <span className="text-orange-600">You have unsaved changes</span>
                    ) : (
                      <span>All changes saved</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {aiHasChanges && (
                      <Button
                        onClick={() => {
                          setAiConfig(aiConfigOriginal);
                          setAiHasChanges(false);
                        }}
                        disabled={aiSaving}
                        variant="outline"
                        size="sm"
                      >
                        Cancel Changes
                      </Button>
                    )}
                    <Button
                      onClick={saveAIConfig}
                      disabled={aiSaving || !aiHasChanges}
                      variant="default"
                      size="sm"
                    >
                      {aiSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Back to Admin */}
        <div className="flex justify-start">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Admin
          </Button>
        </div>
      </div>
    </Section>
  );

}
