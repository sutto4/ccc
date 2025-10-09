"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Brain, Save, AlertCircle, CheckCircle, Sparkles, Shield, X } from "lucide-react";

type AIConfig = {
  enabled: boolean;
  model: string;
  max_tokens: number;
  temperature: number;
  system_prompt?: string;
};

type RolePermission = {
  role_id: string;
  role_name: string;
  allowed: boolean;
};

export default function AISummarizationPanel({ guildId }: { guildId: string }) {
  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    model: 'gpt-4o-mini',
    max_tokens: 500,
    temperature: 0.7,
    system_prompt: '',
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!guildId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load AI config
        const configRes = await fetch(`/api/guilds/${guildId}/ai-config`);
        if (configRes.ok) {
          const data = await configRes.json();
          if (data.config) {
            setConfig(data.config);
          }
        }

        // Load roles
        const rolesRes = await fetch(`/api/guilds/${guildId}/roles`);
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          const rolesList = Array.isArray(rolesData) ? rolesData : rolesData.roles || [];
          setRoles(rolesList);
        }

        // Load role permissions
        const permsRes = await fetch(`/api/guilds/${guildId}/ai-config/permissions`);
        if (permsRes.ok) {
          const permsData = await permsRes.json();
          setRolePermissions(permsData.permissions || []);
        }
      } catch (error) {
        console.error('Failed to load AI config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // Only save the system_prompt (user-editable field)
      const res = await fetch(`/api/guilds/${guildId}/ai-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: config.system_prompt }),
      });

      if (res.ok) {
        setSaveMessage({ type: 'success', text: 'Custom prompt saved successfully!' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save custom prompt' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const toggleRolePermission = async (roleId: string) => {
    try {
      const currentPerm = rolePermissions.find(p => p.role_id === roleId);
      const newAllowed = !currentPerm?.allowed;

      const res = await fetch(`/api/guilds/${guildId}/ai-config/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId, allowed: newAllowed }),
      });

      if (res.ok) {
        // Update local state
        setRolePermissions(prev => {
          const existing = prev.find(p => p.role_id === roleId);
          if (existing) {
            return prev.map(p => p.role_id === roleId ? { ...p, allowed: newAllowed } : p);
          } else {
            const role = roles.find(r => (r.roleId || r.id) === roleId);
            return [...prev, { role_id: roleId, role_name: role?.name || 'Unknown', allowed: newAllowed }];
          }
        });
      }
    } catch (error) {
      console.error('Failed to update role permission:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading AI configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-500" />
          <h2 className="text-xl font-bold">AI Message Summarization</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Use AI to summarize channel messages with the /summarise command
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-medium mb-1">How to Use</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><code className="bg-purple-100 px-1 rounded">/summarise last [count]</code> - Summarize the last X messages</li>
              <li><code className="bg-purple-100 px-1 rounded">/summarise from [message_id]</code> - Summarize from a specific message</li>
              <li>Add optional custom prompt to guide the summary style</li>
            </ul>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className={`rounded-lg p-4 ${
          saveMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {saveMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={`text-sm font-medium ${
              saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {saveMessage.text}
            </p>
          </div>
        </div>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">AI Configuration</h3>
          <p className="text-sm text-gray-500 mt-1">
            Core settings are controlled by administrators. You can customize the system prompt below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only settings */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Status</Label>
                <p className="text-sm text-gray-500">Feature enabled for this server</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                config.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {config.enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
              <div>
                <Label className="text-sm text-gray-600">AI Model</Label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {config.model === 'gpt-4o-mini' && 'GPT-4o Mini'}
                  {config.model === 'gpt-4o' && 'GPT-4o'}
                  {config.model === 'gpt-3.5-turbo' && 'GPT-3.5 Turbo'}
                </p>
              </div>

              <div>
                <Label className="text-sm text-gray-600">Max Tokens</Label>
                <p className="text-sm font-medium text-gray-900 mt-1">{config.max_tokens}</p>
              </div>

              <div>
                <Label className="text-sm text-gray-600">Temperature</Label>
                <p className="text-sm font-medium text-gray-900 mt-1">{config.temperature}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
              <AlertCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500">
                These settings are configured by your server administrator. Contact them to request changes.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom System Prompt (Optional)</Label>
            <textarea
              value={config.system_prompt || ''}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              placeholder="Leave empty for default behavior, or add custom instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[100px]"
            />
            <p className="text-xs text-gray-500">
              Custom instructions to guide how the AI generates summaries
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Custom Prompt'}
          </Button>
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Role Permissions</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Control which roles can use AI summarization. If no roles are selected, everyone can use it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Role Selector */}
          <div className="space-y-2">
            <Label>Add Allowed Role</Label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  toggleRolePermission(e.target.value);
                  e.target.value = ''; // Reset selector
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              defaultValue=""
            >
              <option value="" disabled>Select a role to allow...</option>
              {roles
                .filter(role => {
                  const roleId = role.roleId || role.id;
                  return !rolePermissions.find(p => p.role_id === roleId && p.allowed);
                })
                .map((role) => {
                  const roleId = role.roleId || role.id;
                  return (
                    <option key={roleId} value={roleId}>
                      {role.name}
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Allowed Roles List */}
          {rolePermissions.filter(p => p.allowed).length > 0 ? (
            <div className="space-y-2">
              <Label>Allowed Roles</Label>
              <div className="flex flex-wrap gap-2">
                {rolePermissions
                  .filter(p => p.allowed)
                  .map((perm) => {
                    const role = roles.find(r => (r.roleId || r.id) === perm.role_id);
                    return (
                      <div 
                        key={perm.role_id} 
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-300 text-green-800 rounded-full text-sm font-medium"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{role?.name || 'Unknown Role'}</span>
                        <button
                          onClick={() => toggleRolePermission(perm.role_id)}
                          className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                          title="Remove permission"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Open Access</p>
                  <p className="mt-1">All server members can use AI summarization since no role restrictions are set.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

