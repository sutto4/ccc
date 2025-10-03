"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bot,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Brain,
  DollarSign,
  Clock,
  MessageSquare,
  BarChart3,
  Users,
  TrendingUp,
  Activity
} from "lucide-react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

interface GlobalAIStats {
  total_guilds: number;
  active_guilds: number;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  successful_requests: number;
  failed_requests: number;
}

interface GuildAIUsage {
  guild_id: string;
  guild_name: string;
  enabled: boolean;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  last_used: string | null;
}

interface AISettings {
  openai_api_key: string;
  default_model: string;
  default_max_tokens: number;
  default_max_messages: number;
  default_rate_limit_hour: number;
  default_rate_limit_day: number;
  cost_per_1k_tokens_gpt35: number;
  cost_per_1k_tokens_gpt4: number;
}

export default function AdminAIPage() {
  return (
    <AuthErrorBoundary>
      <AdminAIContent />
    </AuthErrorBoundary>
  );
}

function AdminAIContent() {
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalAIStats | null>(null);
  const [guildUsage, setGuildUsage] = useState<GuildAIUsage[]>([]);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load admin data
  useEffect(() => {
    if (!session) return;
    
    const loadAdminData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch global AI statistics
        const statsResponse = await fetch('/api/admin/ai/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setGlobalStats(statsData);
        }
        
        // Fetch guild usage data
        const usageResponse = await fetch('/api/admin/ai/guilds');
        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          setGuildUsage(usageData);
        }
        
        // Fetch AI settings
        const settingsResponse = await fetch('/api/admin/ai/settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setAiSettings(settingsData);
        }
        
      } catch (err: any) {
        console.error('Failed to load admin data:', err);
        setError(err.message || 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    
    loadAdminData();
  }, [session]);

  // Handle settings update
  const handleSettingsUpdate = useCallback(async (updates: Partial<AISettings>) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.statusText}`);
      }
      
      setSuccess('AI settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload settings
      const settingsResponse = await fetch('/api/admin/ai/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setAiSettings(settingsData);
      }
      
    } catch (err: any) {
      console.error('Failed to update settings:', err);
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading AI admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <Section title="AI Administration">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">AI Feature Administration</h2>
            <p className="text-muted-foreground">
              Monitor and manage AI features across all servers
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            Admin Panel
          </Badge>
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

        {/* Global Statistics */}
        {globalStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Global AI Statistics
              </CardTitle>
              <CardDescription>
                Overview of AI usage across all servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {globalStats.total_guilds}
                  </div>
                  <div className="text-sm text-blue-700">Total Guilds</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {globalStats.active_guilds}
                  </div>
                  <div className="text-sm text-green-700">Active Guilds</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {globalStats.total_requests.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-700">Total Requests</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    ${globalStats.total_cost.toFixed(4)}
                  </div>
                  <div className="text-sm text-yellow-700">Total Cost</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Settings */}
        {aiSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Global AI Settings
              </CardTitle>
              <CardDescription>
                Configure global AI settings and defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openai_api_key">OpenAI API Key</Label>
                  <Input
                    id="openai_api_key"
                    type="password"
                    value={aiSettings.openai_api_key}
                    onChange={(e) => setAiSettings({...aiSettings, openai_api_key: e.target.value})}
                    disabled={saving}
                    placeholder="sk-..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_model">Default Model</Label>
                  <Select
                    value={aiSettings.default_model}
                    onValueChange={(value) => setAiSettings({...aiSettings, default_model: value})}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_max_tokens">Default Max Tokens</Label>
                  <Input
                    id="default_max_tokens"
                    type="number"
                    value={aiSettings.default_max_tokens}
                    onChange={(e) => setAiSettings({...aiSettings, default_max_tokens: parseInt(e.target.value)})}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_max_messages">Default Max Messages</Label>
                  <Input
                    id="default_max_messages"
                    type="number"
                    value={aiSettings.default_max_messages}
                    onChange={(e) => setAiSettings({...aiSettings, default_max_messages: parseInt(e.target.value)})}
                    disabled={saving}
                  />
                </div>
              </div>
              <Button 
                onClick={() => handleSettingsUpdate(aiSettings)}
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Guild Usage Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guild AI Usage
            </CardTitle>
            <CardDescription>
              AI usage statistics by server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Guild</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Requests</th>
                    <th className="text-left p-2">Tokens</th>
                    <th className="text-left p-2">Cost</th>
                    <th className="text-left p-2">Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {guildUsage.map((guild) => (
                    <tr key={guild.guild_id} className="border-b">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{guild.guild_name}</div>
                          <div className="text-xs text-muted-foreground">{guild.guild_id}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant={guild.enabled ? "default" : "secondary"}>
                          {guild.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-2">{guild.total_requests.toLocaleString()}</td>
                      <td className="p-2">{guild.total_tokens.toLocaleString()}</td>
                      <td className="p-2">${guild.total_cost.toFixed(4)}</td>
                      <td className="p-2">
                        {guild.last_used ? new Date(guild.last_used).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
