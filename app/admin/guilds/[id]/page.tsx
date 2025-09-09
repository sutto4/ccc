"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Crown, Shield, Settings } from "lucide-react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

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

export default async function AdminGuildSettingsPage(undefined) {
  return (
    <AuthErrorBoundary>
      <AdminGuildSettingsPageContent undefined />
    </AuthErrorBoundary>
  );
}

async function AdminGuildSettingsPageContent(undefined) {
  
  const params = useParams<{ id: string }>();
  const guildId = params?.id;
  
  const [guild, setGuild] = useState<Guild | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [guildFeatures, setGuildFeatures] = useState<GuildFeature[]>([]);
  const [commandStates, setCommandStates] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    console.log('Admin page loaded, guildId:', guildId);
    if (guildId) {
      fetchGuildData();
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
        'User Verification System': 'verification_system'
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
      
      // Automatically enable/disable associated commands
      const commandsToUpdate = [];
      
      // Define command-to-feature mapping
      const commandFeatureMap: Record<string, string> = {
        'warn': 'moderation',
        'kick': 'moderation', 
        'ban': 'moderation',
        'mute': 'moderation',
        'role': 'moderation',
        'setmodlog': 'moderation',
        'custom': 'utilities',
        'sendverify': 'utilities',
        'setverifylog': 'utilities',
        'feedback': 'utilities',
        'embed': 'utilities'
      };
      
      // Find commands that belong to this feature
      Object.entries(commandFeatureMap).forEach(([commandName, featureName]) => {
        if (featureName === guildFeature.feature_key) {
          commandsToUpdate.push({
            command_name: commandName,
            feature_name: featureName,
            enabled: enabled
          });
        }
      });
      
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Moderation Commands */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Moderation</h4>
                  {[
                    { name: 'warn', description: 'Warn a user for breaking rules' },
                    { name: 'kick', description: 'Kick a user from the server' },
                    { name: 'ban', description: 'Ban a user from the server' },
                    { name: 'mute', description: 'Mute a user in the server' },
                    { name: 'role', description: 'Manage user roles' },
                    { name: 'setmodlog', description: 'Set moderation log channel' }
                  ].map((cmd) => (
                    <div key={cmd.name} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">/{cmd.name}</p>
                        <p className="text-xs text-muted-foreground">{cmd.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`cmd-${cmd.name}`}
                          checked={commandStates[cmd.name] || false}
                          onChange={(e) => {
                            setCommandStates(prev => ({
                              ...prev,
                              [cmd.name]: e.target.checked
                            }));
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`cmd-${cmd.name}`} className="text-xs">
                          {commandStates[cmd.name] ? 'Enabled' : 'Disabled'}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Utility Commands */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Utilities</h4>
                  {[
                    { name: 'custom', description: 'Execute custom commands' },
                    { name: 'sendverify', description: 'Send verification message' },
                    { name: 'setverifylog', description: 'Set verification log channel' },
                    { name: 'feedback', description: 'Submit feedback' },
                    { name: 'embed', description: 'Send embedded messages' }
                  ].map((cmd) => (
                    <div key={cmd.name} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">/{cmd.name}</p>
                        <p className="text-xs text-muted-foreground">{cmd.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`cmd-${cmd.name}`}
                          checked={commandStates[cmd.name] || false}
                          onChange={(e) => {
                            setCommandStates(prev => ({
                              ...prev,
                              [cmd.name]: e.target.checked
                            }));
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`cmd-${cmd.name}`} className="text-xs">
                          {commandStates[cmd.name] ? 'Enabled' : 'Disabled'}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={async () => {
                    try {
                      console.log('🚨🚨🚨 ADMIN SAVE COMMAND SETTINGS CLICKED! 🚨🚨🚨');
                      console.log('=== SAVE COMMAND SETTINGS CLICKED ===');
                      setSaving(true);
                      
                      // Get all command checkboxes and their current state
                      const commandUpdates = [];
                      
                      // Process command checkboxes
                      const allCommands = [
                        { name: 'warn', description: 'Warn a user for breaking rules', feature: 'moderation' },
                        { name: 'kick', description: 'Kick a user from the server', feature: 'moderation' },
                        { name: 'ban', description: 'Ban a user from the server', feature: 'moderation' },
                        { name: 'mute', description: 'Mute a user in the server', feature: 'moderation' },
                        { name: 'role', description: 'Manage user roles', feature: 'moderation' },
                        { name: 'setmodlog', description: 'Set moderation log channel', feature: 'moderation' },
                        { name: 'custom', description: 'Execute custom commands', feature: 'utilities' },
                        { name: 'sendverify', description: 'Send verification message', feature: 'utilities' },
                        { name: 'setverifylog', description: 'Set verification log channel', feature: 'utilities' },
                        { name: 'feedback', description: 'Submit feedback', feature: 'utilities' },
                        { name: 'embed', description: 'Send embedded messages', feature: 'utilities' }
                      ];
                      
                      for (const cmd of allCommands) {
                        const checkbox = document.getElementById(`cmd-${cmd.name}`) as HTMLInputElement;
                        if (checkbox) {
                          const isChecked = checkbox.checked;
                          commandUpdates.push({
                            command_name: cmd.name,
                            feature_name: cmd.feature,
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
