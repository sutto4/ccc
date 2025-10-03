"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Section from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
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
  BarChart3
} from "lucide-react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

interface AIConfig {
  enabled: boolean;
  model: string;
  max_tokens_per_request: number;
  max_messages_per_summary: number;
  custom_prompt: string | null;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
}

interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  successful_requests: number;
  failed_requests: number;
  avg_tokens_per_request: number;
  avg_cost_per_request: number;
}

export default function AISettings() {
  return (
    <AuthErrorBoundary>
      <AISettingsContent />
    </AuthErrorBoundary>
  );
}

function AISettingsContent() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    model: 'gpt-3.5-turbo',
    max_tokens_per_request: 1000,
    max_messages_per_summary: 50,
    custom_prompt: null,
    rate_limit_per_hour: 10,
    rate_limit_per_day: 100
  });
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load AI configuration and usage stats
  useEffect(() => {
    if (!guildId || !session) return;
    
    const loadAIConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch AI configuration
        const configResponse = await fetch(`/api/guilds/${guildId}/ai/config`);
        if (!configResponse.ok) {
          throw new Error(`Failed to load AI config: ${configResponse.statusText}`);
        }
        
        const configData = await configResponse.json();
        setConfig(configData);
        
        // Fetch usage stats
        const statsResponse = await fetch(`/api/guilds/${guildId}/ai/usage`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setUsageStats(statsData);
        }
        
      } catch (err: any) {
        console.error('Failed to load AI config:', err);
        setError(err.message || 'Failed to load AI configuration');
      } finally {
        setLoading(false);
      }
    };
    
    loadAIConfig();
  }, [guildId, session]);

  // Handle configuration updates
  const handleConfigUpdate = useCallback(async (updates: Partial<AIConfig>) => {
    try {
      setSaving(true);
      setError(null);
      
      const updatedConfig = { ...config, ...updates };
      setConfig(updatedConfig);
      
      const response = await fetch(`/api/guilds/${guildId}/ai/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update AI config: ${response.statusText}`);
      }
      
      setSuccess('AI configuration updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Failed to update AI config:', err);
      setError(err.message || 'Failed to update AI configuration');
      
      // Revert changes on error
      const configResponse = await fetch(`/api/guilds/${guildId}/ai/config`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
      }
    } finally {
      setSaving(false);
    }
  }, [guildId, config]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading AI configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <Section title="AI Configuration">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">AI Message Summarization</h2>
            <p className="text-muted-foreground">
              Configure AI-powered message summarization for your server
            </p>
          </div>
          <Badge variant={config.enabled ? "default" : "secondary"} className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            {config.enabled ? "Enabled" : "Disabled"}
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

        {/* Main Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Configure AI summarization settings for your server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="font-medium">Enable AI Summarization</h3>
                  <p className="text-sm text-muted-foreground">
                    Allow users to use /summarise and /summary commands
                  </p>
                </div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => handleConfigUpdate({ enabled })}
                disabled={saving}
              />
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select
                id="model"
                value={config.model}
                onChange={(e) => handleConfigUpdate({ model: e.target.value })}
                disabled={saving}
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Cheaper)</option>
                <option value="gpt-4">GPT-4 (Higher Quality, More Expensive)</option>
              </Select>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="max_tokens">Max Tokens per Request</Label>
              <Input
                id="max_tokens"
                type="number"
                min="100"
                max="4000"
                value={config.max_tokens_per_request}
                onChange={(e) => handleConfigUpdate({ max_tokens_per_request: parseInt(e.target.value) })}
                disabled={saving}
              />
              <p className="text-sm text-muted-foreground">
                Maximum tokens the AI can use per summary (100-4000)
              </p>
            </div>

            {/* Max Messages */}
            <div className="space-y-2">
              <Label htmlFor="max_messages">Max Messages per Summary</Label>
              <Input
                id="max_messages"
                type="number"
                min="1"
                max="100"
                value={config.max_messages_per_summary}
                onChange={(e) => handleConfigUpdate({ max_messages_per_summary: parseInt(e.target.value) })}
                disabled={saving}
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of messages to analyze per summary (1-100)
              </p>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <Label htmlFor="custom_prompt">Custom Prompt (Optional)</Label>
              <Textarea
                id="custom_prompt"
                placeholder="Enter a custom prompt to guide the AI's summarization behavior..."
                value={config.custom_prompt || ''}
                onChange={(e) => handleConfigUpdate({ custom_prompt: e.target.value || null })}
                disabled={saving}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use the default summarization prompt
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Rate Limiting
            </CardTitle>
            <CardDescription>
              Control how often users can use AI features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate_limit_hour">Requests per Hour</Label>
                <Input
                  id="rate_limit_hour"
                  type="number"
                  min="1"
                  max="100"
                  value={config.rate_limit_per_hour}
                  onChange={(e) => handleConfigUpdate({ rate_limit_per_hour: parseInt(e.target.value) })}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_limit_day">Requests per Day</Label>
                <Input
                  id="rate_limit_day"
                  type="number"
                  min="1"
                  max="1000"
                  value={config.rate_limit_per_day}
                  onChange={(e) => handleConfigUpdate({ rate_limit_per_day: parseInt(e.target.value) })}
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        {usageStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Statistics (Last 30 Days)
              </CardTitle>
              <CardDescription>
                Track AI usage and costs for your server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {usageStats.total_requests}
                  </div>
                  <div className="text-sm text-blue-700">Total Requests</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Number(usageStats.total_tokens || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Tokens Used</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    ${Number(usageStats.total_cost || 0).toFixed(4)}
                  </div>
                  <div className="text-sm text-yellow-700">Total Cost</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {usageStats.successful_requests}
                  </div>
                  <div className="text-sm text-purple-700">Successful</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commands Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Available Commands
            </CardTitle>
            <CardDescription>
              Commands available to users when AI is enabled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">/summarise</Badge>
                <span className="text-sm">Summarize the last X messages in the current channel</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">/summary</Badge>
                <span className="text-sm">Summarize messages from a specific message ID to now</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
