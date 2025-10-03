"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Brain, Clock, MessageSquare, BarChart3, Shield, RefreshCw, Save, X, Plus, ChevronDown, Search, Settings, DollarSign, CheckIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

export default function AIFeaturesPage() {
  return (
    <AuthErrorBoundary>
      <AIFeaturesPageContent />
    </AuthErrorBoundary>
  );
}

function AIFeaturesPageContent() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session, status } = useSession();
  
  // AI Settings state
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    model: 'gpt-3.5-turbo',
    max_tokens_per_request: 1000,
    max_messages_per_summary: 50,
    custom_prompt: null as string | null,
    rate_limit_per_hour: 10,
    rate_limit_per_day: 100
  });
  const [aiPromptDraft, setAiPromptDraft] = useState<string>("");
  const [aiPromptSaving, setAiPromptSaving] = useState<boolean>(false);
  const [aiUsageStats, setAiUsageStats] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiRolePermissions, setAiRolePermissions] = useState<any[]>([]);
  const [aiRolePermissionsLoading, setAiRolePermissionsLoading] = useState(false);
  const [roleSelectorOpen, setRoleSelectorOpen] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const roleSelectorRef = useRef<HTMLDivElement>(null);
  const [roles, setRoles] = useState<any[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated" || !session) {
      redirect("/signin");
    }

    if (session && guildId) {
      loadRoles();
      loadAIConfig();
      loadAIRolePermissions();
    }
  }, [status, session, guildId]);

  const loadRoles = async () => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/roles-optimized`);
      if (response.ok) {
        const fetchedRoles = await response.json();
        const relevantRoles = fetchedRoles.filter((role: any) => {
          if (role.position === 0) return false;
          if (role.managed) return false;
          return true;
        });
        setRoles(relevantRoles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadAIConfig = async () => {
    try {
      setAiLoading(true);
      
      // Fetch AI configuration
      const configResponse = await fetch(`/api/guilds/${guildId}/ai/config`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setAiConfig(configData);
        setAiPromptDraft(configData?.custom_prompt || "");
      }
      
      // Fetch usage stats
      const statsResponse = await fetch(`/api/guilds/${guildId}/ai/usage`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setAiUsageStats(statsData);
      }
      
    } catch (error) {
      console.error('Failed to load AI config:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const loadAIRolePermissions = async () => {
    try {
      setAiRolePermissionsLoading(true);
      
      const response = await fetch(`/api/guilds/${guildId}/feature-permissions?feature=ai_summarization`);
      if (response.ok) {
        const data = await response.json();
        setAiRolePermissions(data.permissions[0]?.roles || []);
      }
      
    } catch (error) {
      console.error('Failed to load AI role permissions:', error);
    } finally {
      setAiRolePermissionsLoading(false);
    }
  };

  const saveCustomPrompt = async () => {
    try {
      setAiPromptSaving(true);
      const response = await fetch(`/api/guilds/${guildId}/ai/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_prompt: aiPromptDraft || null })
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Failed to update AI config`);
      }
      setAiConfig(prev => ({ ...prev, custom_prompt: aiPromptDraft || null }));
      toast({ title: 'Saved', description: 'Custom prompt updated successfully.' });
    } catch (e: any) {
      console.error('Failed to save AI custom prompt:', e);
      toast({ title: 'Error', description: e?.message || 'Failed to save prompt', variant: 'destructive' });
    } finally {
      setAiPromptSaving(false);
    }
  };

  const handleAIRolePermissionUpdate = async (roleId: string, allowed: boolean) => {
    try {
      setAiSaving(true);
      
      // Update local state
      setAiRolePermissions(prev => {
        const existing = prev.find(p => p.role_id === roleId);
        if (existing) {
          return prev.map(p => p.role_id === roleId ? { ...p, allowed } : p);
        } else {
          return [...prev, { role_id: roleId, allowed }];
        }
      });
      
      const response = await fetch(`/api/guilds/${guildId}/feature-permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature_key: 'ai_summarization',
          role_permissions: [{ role_id: roleId, allowed }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update role permissions: ${response.statusText}`);
      }
      
      toast({
        title: "Success",
        description: "Role permissions updated successfully",
      });
      
    } catch (error: any) {
      console.error('Failed to update role permissions:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update role permissions',
        variant: "destructive"
      });
      
      // Revert changes on error
      loadAIRolePermissions();
    } finally {
      setAiSaving(false);
    }
  };

  const handleAddRolePermission = async (roleId: string) => {
    await handleAIRolePermissionUpdate(roleId, true);
  };

  const handleRemoveRolePermission = async (roleId: string) => {
    await handleAIRolePermissionUpdate(roleId, false);
  };

  // Get filtered roles for dropdown
  const getFilteredRoles = () => {
    const selectedRoleIds = aiRolePermissions.filter(p => p.allowed).map(p => p.role_id);
    return roles.filter(role => 
      !selectedRoleIds.includes(role.roleId) &&
      role.name.toLowerCase().includes(roleSearchTerm.toLowerCase())
    );
  };

  // Get selected roles
  const getSelectedRoles = () => {
    return aiRolePermissions
      .filter(p => p.allowed)
      .map(p => roles.find(role => role.roleId === p.role_id))
      .filter(Boolean);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleSelectorRef.current && !roleSelectorRef.current.contains(event.target as Node)) {
        setRoleSelectorOpen(false);
        setRoleSearchTerm('');
      }
    };

    if (roleSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roleSelectorOpen]);

  if (status === "loading" || aiLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading AI features...
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
          <Bot className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">AI Features</h1>
        </div>
        <p className="text-muted-foreground">
          Configure AI-powered message summarization and other intelligent features for your server.
        </p>
      </div>

      {/* AI Message Summarization Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI Message Summarization</h3>
                <p className="text-sm text-muted-foreground">
                  Configure AI-powered message summarization for your server
                </p>
              </div>
            </div>
            <Badge variant={aiConfig.enabled ? "default" : "secondary"} className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {aiConfig.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Enable Status */}
              <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-purple-50 to-blue-50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Brain className="h-4 w-4 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">AI Status</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${aiConfig.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {aiConfig.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">
                      {aiConfig.enabled ? 'ON' : 'OFF'}
                    </div>
                    <div className="text-xs text-gray-500">Status</div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-purple-100 rounded-full opacity-20"></div>
              </div>

              {/* Model Info */}
              <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">AI Model</h3>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {aiConfig.model === 'gpt-4' ? 'GPT-4' : 'GPT-3.5 Turbo'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {aiConfig.model === 'gpt-4' ? 'Higher Quality' : 'Faster & Cheaper'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {aiConfig.model === 'gpt-4' ? '4.0' : '3.5'}
                    </div>
                    <div className="text-xs text-gray-500">Version</div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-blue-100 rounded-full opacity-20"></div>
              </div>

              {/* Usage Stats Preview */}
              <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <BarChart3 className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Usage</h3>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {aiUsageStats?.total_requests || 0} requests
                    </div>
                    <div className="text-xs text-gray-500">Last 30 days</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      ${Number(aiUsageStats?.total_cost || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Total Cost</div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-green-100 rounded-full opacity-20"></div>
              </div>
            </div>

            {/* Configuration Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Settings className="h-5 w-5 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Configuration Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Model & Limits */}
                <div className="space-y-4">
                  <div className="rounded-lg border bg-gray-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="h-4 w-4 text-gray-600" />
                      <h3 className="font-medium text-gray-900">Model Settings</h3>
                      <div className="ml-auto">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17 11H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Admin Only
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">AI Model</Label>
                        <div className="mt-1 p-3 bg-white border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {aiConfig.model === 'gpt-4' ? 'GPT-4 (Higher Quality, More Expensive)' : 'GPT-3.5 Turbo (Faster, Cheaper)'}
                            </span>
                            <div className="text-xs text-gray-500">Locked</div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Max Tokens</Label>
                          <div className="mt-1 p-3 bg-white border rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{aiConfig.max_tokens_per_request}</span>
                              <div className="text-xs text-gray-500">Locked</div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Max Messages</Label>
                          <div className="mt-1 p-3 bg-white border rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{aiConfig.max_messages_per_summary}</span>
                              <div className="text-xs text-gray-500">Locked</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-gray-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <h3 className="font-medium text-gray-900">Rate Limiting</h3>
                      <div className="ml-auto">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17 11H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Admin Only
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Per Hour</Label>
                        <div className="mt-1 p-3 bg-white border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{aiConfig.rate_limit_per_hour}</span>
                            <div className="text-xs text-gray-500">Locked</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Per Day</Label>
                        <div className="mt-1 p-3 bg-white border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{aiConfig.rate_limit_per_day}</span>
                            <div className="text-xs text-gray-500">Locked</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Prompt */}
                <div className="space-y-4">
                  <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-blue-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      <h3 className="font-medium text-gray-900">Custom Prompt</h3>
                      <div className="ml-auto">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Editable
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Prompt Instructions</Label>
                        <Textarea 
                          id="ai-custom-prompt" 
                          placeholder="Enter custom instructions to guide the AI's summarization behavior. For example: 'Focus on key decisions and action items' or 'Include technical details and code snippets'..." 
                          value={aiPromptDraft} 
                          onChange={(e) => setAiPromptDraft(e.target.value)} 
                          rows={4}
                          className="mt-1 bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          onClick={saveCustomPrompt} 
                          disabled={aiPromptSaving} 
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          size="sm"
                        >
                          {aiPromptSaving ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Prompt
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            {aiUsageStats && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Usage Statistics</h2>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <div className="text-sm text-gray-500">Last 30 Days</div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {aiUsageStats.total_requests}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Total Requests</div>
                      </div>
                      <div className="p-2 bg-blue-200 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border bg-gradient-to-br from-green-50 to-green-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {Number(aiUsageStats.total_tokens || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-green-700 font-medium">Tokens Used</div>
                      </div>
                      <div className="p-2 bg-green-200 rounded-lg">
                        <Brain className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border bg-gradient-to-br from-yellow-50 to-yellow-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-yellow-600">
                          ${Number(aiUsageStats.total_cost || 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-yellow-700 font-medium">Total Cost</div>
                      </div>
                      <div className="p-2 bg-yellow-200 rounded-lg">
                        <DollarSign className="h-5 w-5 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {aiUsageStats.successful_requests}
                        </div>
                        <div className="text-sm text-purple-700 font-medium">Successful</div>
                      </div>
                      <div className="p-2 bg-purple-200 rounded-lg">
                        <CheckIcon className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Permissions */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Role Permissions</h2>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              
              <div className="rounded-lg border bg-gradient-to-br from-orange-50 to-red-50 p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Control which roles can use AI summarization. If no roles are selected, all users can use the feature.
                  </p>
                </div>
                
                {aiRolePermissionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    Loading role permissions...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Roles */}
                    {getSelectedRoles().length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-green-700">Allowed Roles</Label>
                        <div className="flex flex-wrap gap-2">
                          {getSelectedRoles().map((role) => (
                            <div
                              key={role.roleId}
                              className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
                            >
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ 
                                  backgroundColor: role.color || '#e5e7eb' 
                                }}
                              />
                              <span className="text-sm font-medium text-green-800">{role.name}</span>
                              <button
                                onClick={() => handleRemoveRolePermission(role.roleId)}
                                disabled={aiSaving}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Role Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Add Roles</Label>
                      <div className="relative" ref={roleSelectorRef}>
                        <button
                          onClick={() => setRoleSelectorOpen(!roleSelectorOpen)}
                          disabled={aiSaving}
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-sm text-gray-700">
                            {getFilteredRoles().length > 0 ? 'Select roles to allow...' : 'No available roles'}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${roleSelectorOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {roleSelectorOpen && getFilteredRoles().length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-hidden">
                            {/* Search */}
                            <div className="p-2 border-b">
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Search roles..."
                                  value={roleSearchTerm}
                                  onChange={(e) => setRoleSearchTerm(e.target.value)}
                                  className="pl-8 text-sm"
                                />
                              </div>
                            </div>
                            
                            {/* Role List */}
                            <div className="max-h-32 overflow-y-auto">
                              {getFilteredRoles().map((role) => (
                                <button
                                  key={role.roleId}
                                  onClick={() => {
                                    handleAddRolePermission(role.roleId);
                                    setRoleSearchTerm('');
                                  }}
                                  disabled={aiSaving}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full border"
                                    style={{ 
                                      backgroundColor: role.color || '#e5e7eb' 
                                    }}
                                  />
                                  <span className="text-sm font-medium">{role.name}</span>
                                  <Plus className="h-3 w-3 text-gray-400 ml-auto" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    {getSelectedRoles().length === 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>No restrictions:</strong> All users can use AI summarization when no roles are selected.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Commands Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Available Commands</h2>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="font-medium text-gray-900">Summarize Recent Messages</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">/summarise last &lt;count&gt;</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Summarize the last X messages in the current channel
                    </p>
                    <div className="text-xs text-gray-500">
                      Example: <code className="bg-gray-100 px-1 rounded">/summarise last 50</code>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="font-medium text-gray-900">Summarize From Message</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">/summarise from &lt;message_id&gt;</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Summarize from a specific message ID to now
                    </p>
                    <div className="text-xs text-gray-500">
                      Example: <code className="bg-gray-100 px-1 rounded">/summarise from 1234567890</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
