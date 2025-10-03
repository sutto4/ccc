"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, FileText, Save, RefreshCw, CheckIcon, CreditCard, ExternalLink, Folder, Plus, X, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchRoles, fetchGuildCommandPermissions, fetchWebAppFeatures, updateWebAppFeatures } from "@/lib/api";
import { useCommandMappingsQuery } from "@/hooks/use-command-mapping-query";
import type { Role } from "@/lib/api";
import PremiumModal from "@/components/premium-modal";
import GuildPremiumBadge from "@/components/guild-premium-badge";
import GuildVIPBadge from "@/components/guild-vip-badge";
import ServerGroupsManager from "@/components/server-groups-manager";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

interface RolePermission {
  roleId: string;
  canUseApp: boolean;
}

export default function GuildSettingsPage() {
  return (
    <AuthErrorBoundary>
      <GuildSettingsPageContent />
    </AuthErrorBoundary>
  );
}

function GuildSettingsPageContent() {
  
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session, status } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<RolePermission[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commandPermissions, setCommandPermissions] = useState<any>(null);
  const [commandSettings, setCommandSettings] = useState<any>({});
  
  // Use React Query for command mappings
  const { data: commandMappings = [], isLoading: commandMappingsLoading } = useCommandMappingsQuery();
  const [webAppFeatures, setWebAppFeatures] = useState<{
    features: Array<{
      key: string;
      name: string;
      description: string;
      minimumPackage: string;
      enabled: boolean;
      canEnable: boolean;
    }>;
    states: Record<string, boolean>;
    isPremium: boolean;
  }>({ features: [], states: {}, isPremium: false });
  const { toast } = useToast();

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    serverName: "",
    language: "en",
    timezone: "UTC",
    autoRole: false,
    welcomeMessage: true,
    logChannel: ""
  });

  // Channels state
  const [channels, setChannels] = useState<Array<{ id: string; name: string; type: number }>>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Subscription state
  const [subscription, setSubscription] = useState({
    status: "loading", // loading, active, past_due, canceled, etc.
    package: "",
    currentPeriodEnd: "",
    cancelAtPeriodEnd: false,
    stripeCustomerId: "",
    stripeSubscriptionId: "",
    premium: false,
    group: {
      id: "",
      name: ""
    }
  });

  // Server allocation state
  const [serverAllocation, setServerAllocation] = useState({
    subscriptionId: "",
    planType: "",
    maxServers: 0,
    usedServers: 0,
    allocatedGuildIds: [] as string[],
    availableSlots: 0
  });

  // Guild names state for server allocation display
  const [guildNames, setGuildNames] = useState<Record<string, string>>({});

  // AI Settings state - removed, now handled in dedicated AI features page

  // Premium modal state
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [addServerModalOpen, setAddServerModalOpen] = useState(false);



  // State for available servers to add
  const [availableServers, setAvailableServers] = useState<{ id: string; name: string }[]>([]);
  const [loadingAvailableServers, setLoadingAvailableServers] = useState(false);
  const [addingServerId, setAddingServerId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated" || !session) {
      redirect("/signin");
    }

    if (session) {
      loadRoles();
      loadSubscription();
      loadChannels();
    }
  }, [status, session, guildId]);

  // Load server allocation when subscription is loaded
  useEffect(() => {
    if (subscription.stripeSubscriptionId && subscription.status === 'active') {
      loadServerAllocation();
    }
  }, [subscription.stripeSubscriptionId, subscription.status]);

  // Load permissions after roles are loaded
  useEffect(() => {
    if (roles.length > 0) {
      loadPermissions();
    }
  }, [roles, guildId]);

  const loadSubscription = async () => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/subscription`);
      if (response.ok) {
        const data = await response.json();
        console.log('Subscription data loaded:', data);
        
        // Map package names to display names
        const getPackageDisplayName = (packageName: string) => {
          switch (packageName?.toLowerCase()) {
            case 'solo':
              return 'Solo';
            case 'squad':
              return 'Squad';
            case 'city':
              return 'City';
            case 'enterprise':
              return 'Enterprise';
            case 'free':
            case 'none':
            case '':
            case null:
            case undefined:
              return 'Free';
            default:
              return packageName || 'Free';
          }
        };
        
        setSubscription({
          status: data.status || "inactive",
          package: getPackageDisplayName(data.package),
          currentPeriodEnd: data.currentPeriodEnd || "",
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          stripeCustomerId: data.stripeCustomerId || "",
          stripeSubscriptionId: data.stripeSubscriptionId || "",
          premium: data.premium || false,
          group: data.group || {
            id: "",
            name: ""
          }
        });
      } else {
        // Set default values if no subscription found
        setSubscription({
          status: "inactive",
          package: "Free",
          currentPeriodEnd: "",
          cancelAtPeriodEnd: false,
          stripeCustomerId: "",
          stripeSubscriptionId: "",
          premium: false,
          group: {
            id: "",
            name: ""
          }
        });
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      // Set default values on error
      setSubscription({
        status: "inactive",
        package: "Free",
        currentPeriodEnd: "",
        cancelAtPeriodEnd: false,
        stripeCustomerId: "",
        stripeSubscriptionId: "",
        premium: false,
        group: {
          id: "",
          name: ""
        }
      });
    }
  };

  const loadServerAllocation = async () => {
    if (!subscription.stripeSubscriptionId) {
      console.log('No stripeSubscriptionId, skipping server allocation load');
      return;
    }
    
    try {
      console.log('Loading server allocation for subscription:', subscription.stripeSubscriptionId);
      const response = await fetch(`/api/subscriptions/allocate?subscriptionId=${subscription.stripeSubscriptionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Server allocation data:', data);
        if (data.success) {
          // Map plan type to display name
          const getPlanTypeDisplayName = (planType: string) => {
            switch (planType?.toLowerCase()) {
              case 'solo':
                return 'Solo';
              case 'squad':
                return 'Squad';
              case 'city':
                return 'City';
              case 'enterprise':
                return 'Enterprise';
              default:
                return planType || 'Unknown';
            }
          };
          
          setServerAllocation({
            subscriptionId: data.allocation.subscriptionId,
            planType: getPlanTypeDisplayName(data.allocation.planType),
            maxServers: data.allocation.maxServers,
            usedServers: data.allocation.usedServers,
            allocatedGuildIds: data.allocation.allocatedGuildIds,
            availableSlots: data.allocation.maxServers - data.allocation.usedServers
          });
          
          // Fetch guild names for the allocated servers
          if (data.allocation.allocatedGuildIds.length > 0) {
            loadGuildNames(data.allocation.allocatedGuildIds);
          }
        }
      } else {
        console.log('Failed to load server allocation, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to load server allocation:', error);
    }
  };



  const loadGuildNames = async (guildIds: string[]) => {
    try {
      const guildNamesMap: Record<string, string> = {};
      
      // Fetch guild names for each allocated server
      for (const guildId of guildIds) {
        try {
          const response = await fetch(`/api/guilds/${guildId}`);
          if (response.ok) {
            const guildData = await response.json();
            guildNamesMap[guildId] = guildData.name || `Server ${guildId}`;
          } else {
            guildNamesMap[guildId] = `Server ${guildId}`;
          }
        } catch (error) {
          console.error(`Failed to fetch guild name for ${guildId}:`, error);
          guildNamesMap[guildId] = `Server ${guildId}`;
        }
      }
      
      setGuildNames(guildNamesMap);
    } catch (error) {
      console.error('Failed to load guild names:', error);
    }
  };

  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      const response = await fetch(`/api/guilds/${guildId}/channels`);
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      } else {
        console.error('Failed to load channels');
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadRoles = async () => {
    try {
      setLoading(true);
      // Try optimized roles API first, fallback to original
      let response = await fetch(`/api/guilds/${guildId}/roles-optimized`);
      
      if (!response.ok) {
        console.warn('[PERF] Optimized roles endpoint failed, trying original...');
        const fetchedRoles = await fetchRoles(guildId);
        setRoles(fetchedRoles);
        return;
      }
      
      const fetchedRoles = await response.json();
      
      console.log('Raw fetched roles:', fetchedRoles);
      console.log('Role structure:', fetchedRoles.map((r: any) => ({
        id: r.roleId,
        name: r.name,
        position: r.position,
        permissions: r.permissions,
        color: r.color
      })));
      
      // Since access control is now handled by the database, show all roles
      // The user will only see this if they have access to the guild
      const relevantRoles = fetchedRoles.filter((role: any) => {
        // Exclude @everyone role (position 0)
        if (role.position === 0) {
          return false;
        }
        
        // Exclude managed roles (like ServerMate, Server Booster)
        if (role.managed) {
          return false;
        }
        
        // Include all other roles - they can be configured for app access
        return true;
      });
      
      console.log('Filtered relevant roles:', relevantRoles);
      
      setRoles(relevantRoles);

      // Load command permissions
      try {
        console.log('🚨🚨🚨 LOADING COMMAND PERMISSIONS! 🚨🚨🚨');
        console.log('Loading command permissions for guild:', guildId);
        const commandPerms = await fetchGuildCommandPermissions(guildId);
        console.log('🚨🚨🚨 COMMAND PERMISSIONS LOADED! 🚨🚨🚨');
        console.log('Command permissions loaded:', commandPerms);
        setCommandPermissions(commandPerms);

        // Initialize command settings based on permissions
        const initialSettings: any = {};
        Object.keys(commandPerms.commands).forEach(cmd => {
          initialSettings[cmd] = commandPerms.commands[cmd].guildEnabled;
        });
        console.log('🚨🚨🚨 INITIAL COMMAND SETTINGS! 🚨🚨🚨');
        console.log('Initial command settings:', initialSettings);
        setCommandSettings(initialSettings);
      } catch (error) {
        console.error('🚨🚨🚨 ERROR LOADING COMMAND PERMISSIONS! 🚨🚨🚨');
        console.error('Error loading command permissions:', error);
        // Don't show error toast for command permissions as it's not critical
      }

      // Load web app features
      try {
        console.log('🚨🚨🚨 LOADING WEB APP FEATURES! 🚨🚨🚨');
        const features = await fetchWebAppFeatures(guildId);
        console.log('🚨🚨🚨 WEB APP FEATURES LOADED! 🚨🚨🚨');
        console.log('Web app features loaded:', features);
        console.log('Features type:', typeof features);
        console.log('Features keys:', Object.keys(features));
        setWebAppFeatures(features);
      } catch (error) {
        console.error('🚨🚨🚨 ERROR LOADING WEB APP FEATURES! 🚨🚨🚨');
        console.error('Error loading web app features:', error);
        // Set default empty state
        setWebAppFeatures({
          features: [],
          states: {},
          isPremium: false
        });
      }

      // Load AI configuration - removed, now handled in dedicated AI features page
      // loadAIConfig();
      // loadAIRolePermissions();

    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: "Error",
        description: "Failed to load server roles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/role-permissions`);
      
      if (response.ok) {
        const data = await response.json();
        const mergedPermissions = roles.map((role: Role) => {
          const existing = data.permissions.find((p: any) => p.roleId === role.roleId);
          return existing || {
            roleId: role.roleId,
            canUseApp: false
          };
        });
        setPermissions(mergedPermissions);
        setOriginalPermissions([...mergedPermissions]);
      } else {
        const initialPermissions = roles.map((role: Role) => ({
          roleId: role.roleId,
          canUseApp: false
        }));
        setPermissions(initialPermissions);
        setOriginalPermissions([...initialPermissions]);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      const initialPermissions = roles.map((role: Role) => ({
        roleId: role.roleId,
        canUseApp: false
      }));
      setPermissions(initialPermissions);
      setOriginalPermissions([...initialPermissions]);
    }
  };

  const updatePermission = (roleId: string, canUseApp: boolean) => {
    setPermissions(prev => 
      prev.map(p => 
        p.roleId === roleId ? { ...p, canUseApp } : p
      )
    );
    setSaved(false);
  };

  const hasUnsavedChanges = () => {
    if (permissions.length === 0 || originalPermissions.length === 0) return false;
    return permissions.some((perm, index) => 
      perm.canUseApp !== originalPermissions[index]?.canUseApp
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/guilds/${guildId}/role-permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        setOriginalPermissions([...permissions]);
        setSaved(true);
        toast({
          title: "Success",
          description: "Role permissions updated successfully",
        });
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Error",
        description: "Failed to save role permissions",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const selectAll = () => {
    setPermissions(prev => prev.map(p => ({ ...p, canUseApp: true })));
  };

  const clearAll = () => {
    setPermissions(prev => prev.map(p => ({ ...p, canUseApp: false })));
  };

  const updateGeneralSetting = (key: string, value: any) => {
    setGeneralSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveGeneralSettings = async () => {
    // Dummy save for now
    toast({
      title: "Success",
      description: "General settings saved successfully",
    });
  };

  const handleRemoveServer = async (guildIdToRemove: string) => {
    if (!confirm(`Are you sure you want to remove server ${guildNames[guildIdToRemove] || guildIdToRemove} from allocation?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/subscriptions/remove-server/${subscription.stripeSubscriptionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guildId: guildIdToRemove }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: `Server ${guildNames[guildIdToRemove] || guildIdToRemove} removed from allocation. Available slots: ${data.availableSlots}`,
          });
          loadServerAllocation(); // Reload allocation to update available slots and guild names
        } else {
          throw new Error('Failed to remove server from allocation');
        }
      } else {
        throw new Error('Failed to remove server from allocation');
      }
    } catch (error) {
      console.error('Error removing server from allocation:', error);
      toast({
        title: "Error",
        description: "Failed to remove server from allocation",
        variant: "destructive",
      });
    }
  };

  const handleAddServer = async (serverId: string) => {
    if (!serverId) {
      toast({
        title: "Error",
        description: "Please select a server to add.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingServerId(serverId);
      const response = await fetch(`/api/subscriptions/add-server/${subscription.stripeSubscriptionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverId: serverId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: `Server ${serverId} added to allocation. Available slots: ${data.availableSlots}`,
          });
          setAddServerModalOpen(false);
          loadServerAllocation(); // Reload allocation to update available slots and guild names
        } else {
          throw new Error('Failed to add server to allocation');
        }
      } else {
        throw new Error('Failed to add server to allocation');
      }
    } catch (error) {
      console.error('Error adding server to allocation:', error);
      toast({
        title: "Error",
        description: "Failed to add server to allocation",
        variant: "destructive",
      });
    } finally {
      setAddingServerId(null);
    }
  };

  const loadAvailableServers = async () => {
    try {
      setLoadingAvailableServers(true);
      // Get all guilds the user has access to - try optimized first
      let response = await fetch('/api/guilds-optimized');
      
      if (!response.ok) {
        console.warn('[PERF] Optimized guilds endpoint failed, trying original...');
        response = await fetch('/api/guilds');
      }
      
      if (response.ok) {
        const userGuilds = await response.json();
        
        // Filter out guilds that are already allocated to this subscription
        const allocatedGuildIds = serverAllocation.allocatedGuildIds || [];
        const availableGuilds = userGuilds.filter((guild: any) => 
          !allocatedGuildIds.includes(guild.id)
        );
        
        setAvailableServers(availableGuilds);
      }
    } catch (error) {
      console.error('Error loading available servers:', error);
      toast({
        title: "Error",
        description: "Failed to load available servers",
        variant: "destructive",
      });
    } finally {
      setLoadingAvailableServers(false);
    }
  };

  // AI-related functions removed - now handled in dedicated AI features page

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    redirect("/signin");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Server Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your server's bot settings and permissions.
        </p>
        {/* Group Information */}
        {subscription.group && subscription.group.name && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
            <Folder className="h-4 w-4 text-blue-500" />
            Part of group: <span className="font-semibold">{subscription.group.name}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="role-permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Permissions
          </TabsTrigger>
          <TabsTrigger value="commands-features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="server-groups" className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Server Groups
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader title="General Settings" subtitle="Basic server configuration and preferences." />
            <CardContent className="space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Settings</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      value={generalSettings.timezone}
                      onChange={(e) => updateGeneralSetting('timezone', e.target.value)}
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">America/New_York (Eastern Time)</option>
                      <option value="America/Chicago">America/Chicago (Central Time)</option>
                      <option value="America/Denver">America/Denver (Mountain Time)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                      <option value="Europe/London">Europe/London (Greenwich Mean Time)</option>
                      <option value="Europe/Paris">Europe/Paris (Central European Time)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (Japan Standard Time)</option>
                      <option value="Asia/Shanghai">Asia/Shanghai (China Standard Time)</option>
                      <option value="Australia/Sydney">Australia/Sydney (Australian Eastern Time)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Used for scheduling and time-based features
                    </p>
                  </div>
                </div>
              </div>

              {/* Modlog Channel */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Modlog Channel</h3>
                <div className="space-y-2">
                  <Label htmlFor="modlogChannel">Modlog Channel</Label>
                  <select
                    id="modlogChannel"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    value={generalSettings.logChannel}
                    onChange={(e) => updateGeneralSetting('logChannel', e.target.value)}
                    disabled={loadingChannels}
                  >
                    <option value="">{loadingChannels ? "Loading channels..." : "Select a channel..."}</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    This channel will receive system messages from ServerMate including moderation logs, 
                    feature notifications, and other important updates.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={saveGeneralSettings} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Permissions Tab */}
        <TabsContent value="role-permissions" className="space-y-4">
          <Card>
            <CardHeader title="Role Permissions" subtitle="Manage which roles can use the bot and access different features." />
            <CardContent>
              {roles.length > 0 ? (
                <div className="space-y-4">
                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Control which roles can access and use this app
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearAll}>
                        Clear All
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={savePermissions} 
                        disabled={saving || !hasUnsavedChanges()}
                        className={`min-w-[120px] transition-all duration-200 ${
                          saved 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : hasUnsavedChanges()
                              ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                              : 'bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : saved ? (
                          <>
                            <CheckIcon className="w-5 h-5 mr-2" />
                            Saved! ✓
                          </>
                        ) : hasUnsavedChanges() ? (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Save Changes
                          </>
                        ) : (
                          <>
                            <CheckIcon className="w-5 h-5 mr-2" />
                            No Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Unsaved Changes Indicator */}
                  {hasUnsavedChanges() && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium border border-yellow-200">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      You have unsaved changes
                    </div>
                  )}

                  {/* Permissions List */}
                  <div className="space-y-3">
                    {permissions.map((permission) => (
                      <div
                        key={permission.roleId}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                          permission.canUseApp 
                            ? 'bg-green-50 border-green-200 shadow-sm' 
                            : 'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ 
                              backgroundColor: roles.find((r: Role) => r.roleId === permission.roleId)?.color || '#e5e7eb' 
                            }}
                          />
                          <div>
                            <div className="font-medium">
                              {roles.find((r: Role) => r.roleId === permission.roleId)?.name || 'Unknown Role'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Role ID: {permission.roleId}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updatePermission(permission.roleId, !permission.canUseApp)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              permission.canUseApp ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={permission.canUseApp}
                            aria-label={`Toggle ${roles.find((r: Role) => r.roleId === permission.roleId)?.name || 'role'} access`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                permission.canUseApp ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-sm font-medium ${
                            permission.canUseApp ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {permission.canUseApp ? 'Access granted' : 'Access denied'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Info Box */}
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <div className="font-medium mb-1">How it works:</div>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Server owners always have full access</li>
                        <li>Users with enabled roles can access the app</li>
                        <li>Changes take effect immediately</li>
                        <li>You can modify these settings at any time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No roles found for this server.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader title="Subscription Management" subtitle="Manage your server's subscription and billing." />
            <CardContent className="space-y-6">
              {/* Current Subscription Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Current Subscription</h3>
                {subscription.status === "loading" ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    Loading subscription...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          subscription.status === 'active' ? 'bg-green-500' : 
                          subscription.status === 'past_due' ? 'bg-yellow-500' : 
                          subscription.status === 'canceled' ? 'bg-red-500' : 
                          subscription.status === 'inactive' ? 'bg-gray-500' : 'bg-blue-500'
                        }`} />
                        <span className="capitalize font-medium">
                          {subscription.status === 'active' ? 'Active' : 
                           subscription.status === 'past_due' ? 'Past Due' : 
                           subscription.status === 'canceled' ? 'Canceled' : 
                           subscription.status === 'inactive' ? 'Inactive' : subscription.status}
                        </span>
                        {/* Show VIP badge for global override premium, Premium badge for active subscriptions */}
                        {subscription.premium && subscription.status === 'active' && <GuildPremiumBadge />}
                        {subscription.premium && subscription.status !== 'active' && <GuildVIPBadge />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Package</Label>
                      <div className="font-medium">{subscription.package}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Next Billing Date</Label>
                      <div className="font-medium">
                        {subscription.currentPeriodEnd ? 
                          new Date(subscription.currentPeriodEnd).toLocaleDateString() : 
                          'N/A'
                        }
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Auto-Renewal</Label>
                      <div className="font-medium">
                        {subscription.cancelAtPeriodEnd ? 'Will cancel at period end' : 'Enabled'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Manage Subscription</h3>
                <div className="space-y-3">
                  {/* Upgrade Button - always show if no active subscription */}
                  {!subscription.stripeCustomerId && (
                    <Button 
                      onClick={() => setPremiumModalOpen(true)}
                      className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Upgrade Subscription
                    </Button>
                  )}
                  
                  {/* Stripe Customer Portal - show if they have a customer ID (even if inactive) */}
                  {subscription.stripeCustomerId && (
                    <Button 
                      onClick={async () => {
                        try {
                          // Create a customer portal session
                          const response = await fetch('/api/stripe/create-portal-session', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              customerId: subscription.stripeCustomerId,
                              returnUrl: window.location.href
                            }),
                          });
                          
                          if (response.ok) {
                            const { url } = await response.json();
                            if (url) {
                              window.open(url, '_blank');
                            }
                          } else {
                            // Fallback to direct Stripe billing portal
                            window.open(`https://billing.stripe.com/p/login/test`, '_blank');
                          }
                        } catch (error) {
                          console.error('Failed to create portal session:', error);
                          // Fallback to direct Stripe billing portal
                          window.open(`https://billing.stripe.com/p/login/test`, '_blank');
                        }
                      }}
                      className="w-full md:w-auto"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {subscription.status === 'active' ? 'Manage Billing & Subscription' : 'View Billing History'}
                    </Button>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    {subscription.stripeCustomerId 
                      ? subscription.status === 'active'
                        ? "Access your Stripe customer portal to update payment methods, view invoices, and manage your subscription."
                        : "Access your Stripe customer portal to view billing history, update payment methods, and manage your account."
                      : "Upgrade to unlock premium features like advanced role management, custom commands, and priority support."
                    }
                  </p>
                </div>
              </div>

              {/* Server Allocation Management */}
              {subscription.status === 'active' && subscription.stripeSubscriptionId && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Server Allocation</h3>
                  <div className="space-y-4">
                    {/* Allocation Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{serverAllocation.usedServers}</div>
                        <div className="text-sm text-gray-600">Servers Used</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{serverAllocation.availableSlots}</div>
                        <div className="text-sm text-gray-600">Available Slots</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{serverAllocation.maxServers}</div>
                        <div className="text-sm text-gray-600">Total Capacity</div>
                      </div>
                    </div>

                    {/* Current Allocation */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Currently Allocated Servers</h4>
                      {serverAllocation.allocatedGuildIds.length > 0 ? (
                        <div className="space-y-2">
                          {serverAllocation.allocatedGuildIds.map((guildId) => (
                            <div key={guildId} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="font-medium">{guildNames[guildId] || guildId}</span>
                                {guildId === params.id && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Current Server</span>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveServer(guildId)}
                                disabled={serverAllocation.usedServers <= 1}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No servers currently allocated
                        </div>
                      )}
                    </div>

                    {/* Add Server Button */}
                    {serverAllocation.availableSlots > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium">Add More Servers</h4>
                        <Button 
                          onClick={() => {
                            setAddServerModalOpen(true);
                            loadAvailableServers();
                          }}
                          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Server ({serverAllocation.availableSlots} slot{serverAllocation.availableSlots !== 1 ? 's' : ''} available)
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          You can allocate this subscription to {serverAllocation.availableSlots} more server{serverAllocation.availableSlots !== 1 ? 's' : ''}.
                        </p>
                      </div>
                    )}

                    {/* Plan Information */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <div className="font-medium mb-1">Plan Details</div>
                        <p className="text-blue-700">
                          You're on the <strong>{serverAllocation.planType}</strong> plan, which allows up to {serverAllocation.maxServers} Discord server{serverAllocation.maxServers !== 1 ? 's' : ''}.
                          You can reallocate servers anytime without additional charges.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Support Info */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">Need Help?</div>
                  <p className="text-blue-700">
                    If you have questions about your subscription or need to make changes, 
                    you can manage everything through the Stripe portal above, or contact our support team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Server Groups Tab */}
        <TabsContent value="server-groups" className="space-y-4">
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Server Groups
                </div>
              }
              subtitle="Organize your servers into groups for easier management"
            />
            <CardContent>
              <ServerGroupsManager guildId={params.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader title="Server Logs" subtitle="View server activity and bot interaction logs." />
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Logs and activity tracking will be implemented here.</p>
                <p className="text-sm mt-2">This will show bot commands, role changes, and server activity.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Features Tab */}
        <TabsContent value="commands-features" className="space-y-6">
          {/* Slash Commands Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                <h3 className="text-lg font-semibold">Slash Commands</h3>
                <p className="text-sm text-muted-foreground">
                  Enable or disable individual slash commands for this server. Disabled commands won't appear in Discord.
                </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
                {commandMappingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    Loading commands...
                  </div>
                ) : (
                <div className="space-y-6">
                    {/* Group commands by feature */}
                    {Object.entries(
                      commandMappings.reduce((acc, cmd) => {
                        const feature = cmd.feature_key;
                        if (!acc[feature]) acc[feature] = [];
                        acc[feature].push(cmd);
                        return acc;
                      }, {} as Record<string, typeof commandMappings>)
                    ).map(([featureName, commands]) => (
                    <div key={featureName} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base">
                          {featureName === 'moderation' ? '🛡️ Moderation' : 
                           featureName === 'utilities' ? '🔧 Utilities' : 
                           featureName === 'sticky_messages' ? '📌 Sticky Messages' :
                           `📋 ${featureName}`}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {commands.length} command{commands.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                          {commands.map((cmd) => {
                            const perm = commandPermissions?.commands[cmd.command_name];
                            const canModify = perm?.canModify ?? true;
                            const isEnabled = commandSettings[cmd.command_name] ?? perm?.guildEnabled ?? true;

                            return (
                            <div key={cmd.command_name} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">/{cmd.command_name}</p>
                                  {!perm?.adminEnabled && (
                                    <Badge variant="destructive" className="text-xs">Disabled by admin</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{cmd.description}</p>
                              </div>
                              <Switch
                                  checked={isEnabled}
                                  disabled={!canModify}
                                onCheckedChange={canModify ? (checked) => {
                                    setCommandSettings((prev: any) => ({
                                      ...prev,
                                    [cmd.command_name]: checked
                                  }));
                                } : undefined}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Web App Features Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Settings className="h-5 w-5 text-green-600" />
                </div>
                <div>
                <h3 className="text-lg font-semibold">Web App Features</h3>
                <p className="text-sm text-muted-foreground">
                  Control which features are available in the web interface for your server.
                </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  {webAppFeatures?.features?.length > 0 ? (
                    webAppFeatures.features.map((feature) => {
                      const isEnabled = feature.enabled;
                      const canEnable = feature.canEnable;
                      const isPremiumFeature = feature.minimumPackage === 'premium';
                      
                      return (
                      <div key={feature.key} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} ${!canEnable ? 'opacity-60' : ''}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{feature.name}</p>
                              {isPremiumFeature && (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                  Premium
                              </Badge>
                              )}
                              {!canEnable && isPremiumFeature && (
                              <Badge variant="destructive" className="text-xs">
                                  Requires Premium
                              </Badge>
                              )}
                            </div>
                          <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                          </div>
                        <Switch
                              checked={isEnabled}
                              disabled={!canEnable}
                          onCheckedChange={(checked) => {
                                if (!canEnable) {
                                  toast({
                                    title: "Premium Required",
                                    description: "This feature requires a premium subscription.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                setWebAppFeatures(prev => ({
                                  ...prev,
                                  states: {
                                    ...prev.states,
                                [feature.key]: checked
                                  },
                                  features: prev.features.map(f => 
                                    f.key === feature.key 
                                  ? { ...f, enabled: checked }
                                      : f
                                  )
                                }));
                              }}
                            />
                        </div>
                      );
                    })
                  ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Loading web app features...</p>
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>

          {/* Save Button Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end gap-2">
                <Button
                  onClick={async () => {
                    console.log('=== SAVE BUTTON CLICKED ===');
                    try {
                      setSaving(true);
                      console.log('commandSettings:', commandSettings);
                      console.log('commandPermissions:', commandPermissions);

                      // Convert command settings to the format expected by the API
                      const allCommands = commandMappings.map(cmd => ({
                        name: cmd.command_name,
                        feature: cmd.feature_key
                      }));
                      
                      const commandsToUpdate = Object.entries(commandSettings).map(([name, enabled]) => {
                        const cmd = allCommands.find(c => c.name === name);
                        return {
                          command_name: name,
                          feature_name: cmd?.feature || 'unknown',
                          enabled
                        };
                      });
                      
                      console.log('commandsToUpdate:', commandsToUpdate);

                      // Update commands
                      if (commandsToUpdate.length > 0) {
                        console.log('Making API call to save commands...');
                        console.log('API URL:', `/api/guilds/${guildId}/commands`);
                        console.log('Request body:', { commands: commandsToUpdate });
                        
                        const response = await fetch(`/api/guilds/${guildId}/commands`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ commands: commandsToUpdate })
                        });
                        
                        console.log('API response status:', response.status);
                        console.log('API response ok:', response.ok);
                        
                        if (!response.ok) {
                          const errorText = await response.text();
                          console.error('API error response:', errorText);
                          throw new Error(`API error: ${errorText}`);
                        }
                        
                        const responseData = await response.json();
                        console.log('API response data:', responseData);
                      } else {
                        console.log('No commands to update - commandSettings is empty');
                      }

                      // Update web app features
                      if (webAppFeatures?.states) {
                        console.log('Saving web app features:', webAppFeatures.states);
                        await updateWebAppFeatures(guildId, webAppFeatures.states);
                      } else {
                        console.log('No web app features to save');
                      }

                      toast({
                        title: "Settings Updated",
                        description: "Command settings and web app features have been saved successfully.",
                      });
                    } catch (error) {
                      console.error('Error saving settings:', error);
                      toast({
                        title: "Error",
                        description: "Failed to save settings.",
                        variant: "destructive"
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Premium Modal */}
      <PremiumModal
        open={premiumModalOpen}
        onOpenChange={setPremiumModalOpen}
      />

      {/* Add Server Modal */}
      {addServerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Server to Subscription</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAvailableServers}
                  disabled={loadingAvailableServers}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Refresh available servers"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingAvailableServers ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setAddServerModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select a Discord server from your available servers to add to your subscription.
              </p>
              
              {/* Available Servers List */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Available Servers</h4>
                {loadingAvailableServers ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    Loading available servers...
                  </div>
                ) : availableServers.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableServers.map((server) => (
                      <div
                        key={server.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <div>
                            <div className="font-medium">{server.name}</div>
                            <div className="text-sm text-gray-500">ID: {server.id}</div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAddServer(server.id)}
                          disabled={addingServerId === server.id}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {addingServerId === server.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No available servers found.</p>
                    <p className="text-sm mt-1">Make sure the bot is invited to the servers you want to add.</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setAddServerModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
