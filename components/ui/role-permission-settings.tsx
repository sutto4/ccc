"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckIcon, SaveIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface RolePermission {
  roleId: string;
  canUseApp: boolean;
}

interface RolePermissionSettingsProps {
  guildId: string;
  roles: Array<{ 
    roleId: string; 
    name: string; 
    color?: string;
    permissions?: string[];
    position?: number;
  }>;
}

export default function RolePermissionSettings({ guildId, roles }: RolePermissionSettingsProps) {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  // Load current permissions and roles
  useEffect(() => {
    loadPermissions();
  }, [guildId, roles]);

    // Sort roles by hierarchy (highest position first)
  const sortedRoles = [...roles].sort((a, b) => (b.position || 0) - (a.position || 0));
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredRoles = sortedRoles.filter(role => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return role.name.toLowerCase().includes(search) || 
           role.roleId.includes(search);
  });

  // Initialize permissions when roles change
  useEffect(() => {
    if (filteredRoles.length > 0 && permissions.length === 0) {
      // Initialize with all roles set to false (no access by default)
      const initialPermissions = filteredRoles.map(role => ({
        roleId: role.roleId,
        canUseApp: false
      }));
      setPermissions(initialPermissions);
    }
  }, [filteredRoles, permissions.length]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      
      // Try to load existing permissions from API
      const response = await fetch(`/api/guilds/${guildId}/role-permissions`);

      if (response.ok) {
        const data = await response.json();
        // Merge with filtered roles only
        const mergedPermissions = filteredRoles.map(role => {
          const existing = data.permissions.find((p: any) => p.roleId === role.roleId);
          return existing || {
            roleId: role.roleId,
            roleName: role.name,
            canUseApp: false
          };
        });
        setPermissions(mergedPermissions);
        setOriginalPermissions([...mergedPermissions]); // Set original state
      } else {
        // If no permissions exist yet, initialize with filtered roles only
        const initialPermissions = filteredRoles.map(role => ({
          roleId: role.roleId,
          canUseApp: false
        }));
        setPermissions(initialPermissions);
        setOriginalPermissions([...initialPermissions]); // Set original state
      }
       } catch (error) {
         console.error('Error loading permissions:', error);
         // On error, still initialize with filtered roles (better UX than showing nothing)
         const initialPermissions = filteredRoles.map(role => ({
           roleId: role.roleId,
           canUseApp: false
         }));
         setPermissions(initialPermissions);
         setOriginalPermissions([...initialPermissions]); // Set original state
      
      toast({
        title: "Warning",
        description: "Using default permissions (no access). Some features may not work.",
        variant: "default"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (roleId: string, canUseApp: boolean) => {
    setPermissions(prev => 
      prev.map(p => 
        p.roleId === roleId ? { ...p, canUseApp } : p
      )
    );
    setSaved(false); // Mark as unsaved when changes are made
  };

  // Check if there are unsaved changes
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
         setOriginalPermissions([...permissions]); // Save current state as original
         setSaved(true); // Mark as saved
         toast({
           title: "Success",
           description: "Role permissions updated successfully",
         });
         
         // Reset saved indicator after 3 seconds
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

  // Add info about filtered roles
  const totalRoles = roles.length;
  const shownRoles = filteredRoles.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCwIcon className="w-6 h-6 animate-spin mr-2" />
        Loading permissions...
      </div>
    );
  }

  return (
    <div className="space-y-6 pl-0 ml-0">
             {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-muted-foreground">
             Control which roles can access and use this app
           </p>
           {totalRoles > shownRoles && (
             <p className="text-xs text-muted-foreground">
               Showing {shownRoles} of {totalRoles} roles
             </p>
           )}
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
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' // Saved state
                  : hasUnsavedChanges()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' // Has changes
                    : 'bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed' // No changes
              }`}
            >
             {saving ? (
               <>
                 <RefreshCwIcon className="w-5 h-5 mr-2 animate-spin" />
                 Saving...
               </>
             ) : saved ? (
               <>
                 <CheckIcon className="w-5 h-5 mr-2" />
                 Saved! ✓
               </>
             ) : hasUnsavedChanges() ? (
               <>
                 <SaveIcon className="w-5 h-5 mr-2" />
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
         <div className="text-left">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium border border-yellow-200">
             <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
             You have unsaved changes
           </div>
         </div>
       )}

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search roles by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

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
                  backgroundColor: roles.find(r => r.roleId === permission.roleId)?.color || '#e5e7eb' 
                }}
              />
              <div>
                <div className="font-medium">{roles.find(r => r.roleId === permission.roleId)?.name || 'Unknown Role'}</div>
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
                aria-label={`Toggle ${roles.find(r => r.roleId === permission.roleId)?.name || 'role'} access`}
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
  );
}
