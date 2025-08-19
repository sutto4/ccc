"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  Crown, 
  Settings, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX
} from "lucide-react";

interface RolePermission {
  roleId: string;
  roleName: string;
  roleColor?: string;
  canUseBot: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canViewLogs: boolean;
  canManageSettings: boolean;
  isAdmin: boolean;
}

export default function RolePermissionsPage() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load roles and permissions
  useEffect(() => {
    if (!guildId || !session) return;
    
    const loadRoles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // TODO: Replace with actual API call when endpoint is created
        // const response = await fetch(`/api/guilds/${guildId}/role-permissions`);
        // if (!response.ok) throw new Error(`Failed to load roles: ${response.statusText}`);
        // const data = await response.json();
        // setRoles(data);
        
        // For now, use placeholder data
        const mockRoles: RolePermission[] = [
          {
            roleId: "admin",
            roleName: "Administrator",
            roleColor: "#ff0000",
            canUseBot: true,
            canManageUsers: true,
            canManageRoles: true,
            canViewLogs: true,
            canManageSettings: true,
            isAdmin: true
          },
          {
            roleId: "moderator",
            roleName: "Moderator",
            roleColor: "#00ff00",
            canUseBot: true,
            canManageUsers: true,
            canManageRoles: false,
            canViewLogs: true,
            canManageSettings: false,
            isAdmin: false
          },
          {
            roleId: "member",
            roleName: "Member",
            roleColor: "#0000ff",
            canUseBot: true,
            canManageUsers: false,
            canManageRoles: false,
            canViewLogs: false,
            canManageSettings: false,
            isAdmin: false
          }
        ];
        
        setRoles(mockRoles);
        
      } catch (err: any) {
        console.error('Failed to load roles:', err);
        setError(err.message || 'Failed to load roles');
      } finally {
        setLoading(false);
      }
    };
    
    loadRoles();
  }, [guildId, session]);

  // Handle permission toggle
  const handlePermissionToggle = (roleId: string, permission: keyof RolePermission, value: boolean) => {
    setRoles(prev => prev.map(role => 
      role.roleId === roleId 
        ? { ...role, [permission]: value }
        : role
    ));
  };

  // Save permissions
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // TODO: Replace with actual API call when endpoint is created
      // const response = await fetch(`/api/guilds/${guildId}/role-permissions`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ roles })
      // });
      // if (!response.ok) throw new Error(`Failed to save permissions: ${response.statusText}`);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Role permissions saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Failed to save permissions:', err);
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Filter roles based on search
  const filteredRoles = roles.filter(role =>
    role.roleName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading role permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <Section title="Role Permissions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Role Permissions</h2>
            <p className="text-muted-foreground">
              Manage which roles can access and use the bot
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

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Search Roles
            </CardTitle>
            <CardDescription>
              Find specific roles to manage permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search roles by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Permissions
            </CardTitle>
            <CardDescription>
              Configure permissions for each role. Server owners always have full access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredRoles.map((role) => (
                <div key={role.roleId} className="border rounded-lg p-4">
                  {/* Role Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full border-2"
                        style={{ backgroundColor: role.roleColor || '#6b7280' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-lg">{role.roleName}</h3>
                          {role.isAdmin && (
                            <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Role ID: {role.roleId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Basic Bot Usage */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-sm">Use Bot</div>
                          <div className="text-xs text-muted-foreground">Basic bot commands</div>
                        </div>
                      </div>
                      <Switch
                        checked={role.canUseBot}
                        onCheckedChange={(checked) => handlePermissionToggle(role.roleId, 'canUseBot', checked)}
                        disabled={role.isAdmin || saving}
                      />
                    </div>

                    {/* User Management */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium text-sm">Manage Users</div>
                          <div className="text-xs text-muted-foreground">Add/remove roles</div>
                        </div>
                      </div>
                      <Switch
                        checked={role.canManageUsers}
                        onCheckedChange={(checked) => handlePermissionToggle(role.roleId, 'canManageUsers', checked)}
                        disabled={role.isAdmin || saving}
                      />
                    </div>

                    {/* Role Management */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-600" />
                        <div>
                          <div className="font-medium text-sm">Manage Roles</div>
                          <div className="text-xs text-muted-foreground">Create/edit roles</div>
                        </div>
                      </div>
                      <Switch
                        checked={role.canManageRoles}
                        onCheckedChange={(checked) => handlePermissionToggle(role.roleId, 'canManageRoles', checked)}
                        disabled={role.isAdmin || saving}
                      />
                    </div>

                    {/* View Logs */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <div>
                          <div className="font-medium text-sm">View Logs</div>
                          <div className="text-xs text-muted-foreground">Access audit logs</div>
                        </div>
                      </div>
                      <Switch
                        checked={role.canViewLogs}
                        onCheckedChange={(checked) => handlePermissionToggle(role.roleId, 'canViewLogs', checked)}
                        disabled={role.isAdmin || saving}
                      />
                    </div>

                    {/* Manage Settings */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-indigo-600" />
                        <div>
                          <div className="font-medium text-sm">Manage Settings</div>
                          <div className="text-xs text-muted-foreground">Bot configuration</div>
                        </div>
                      </div>
                      <Switch
                        checked={role.canManageSettings}
                        onCheckedChange={(checked) => handlePermissionToggle(role.roleId, 'canManageSettings', checked)}
                        disabled={role.isAdmin || saving}
                      />
                    </div>
                  </div>

                  {/* Admin Note */}
                  {role.isAdmin && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Crown className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          This role has full administrative access and cannot have permissions modified.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permission Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Summary</CardTitle>
            <CardDescription>
              Overview of current permission distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {roles.filter(r => r.canUseBot).length}
                </div>
                <div className="text-sm text-blue-700">Can Use Bot</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {roles.filter(r => r.canManageUsers).length}
                </div>
                <div className="text-sm text-green-700">Can Manage Users</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {roles.filter(r => r.canManageRoles).length}
                </div>
                <div className="text-sm text-purple-700">Can Manage Roles</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {roles.filter(r => r.canViewLogs).length}
                </div>
                <div className="text-sm text-orange-700">Can View Logs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Shield className="h-5 w-5" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• Server owners always have full access to all features</p>
              <p>• Administrator roles cannot have their permissions modified</p>
              <p>• Changes are applied immediately and affect all bot interactions</p>
              <p>• Users need the appropriate role to access restricted features</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
