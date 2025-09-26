"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowRight, Check, Settings, Users, Ban, X, Plus, Shield, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRoleMappings } from '@/hooks/use-role-mappings';
import { useToast } from '@/components/ui/use-toast';

interface Server {
  id: string;
  name: string;
  memberCount: number;
  isOnline: boolean;
  isPrimary?: boolean;
}

interface Role {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}

interface RoleMapping {
  id: string;
  primaryServerId: string;
  primaryRoleId: string;
  primaryRoleName: string;
  targetMappings: {
    serverId: string;
    serverName: string;
    targetRoleId: string;
    targetRoleName: string;
  }[];
}

interface RoleSyncManagerProps {
  groupId: string;
  groupName: string;
  servers: Server[];
}

export function RoleSyncManager({ groupId, groupName, servers }: RoleSyncManagerProps) {
  const [primaryServer, setPrimaryServer] = useState<Server | null>(
    servers.find(s => s.isPrimary) || servers[0] || null
  );
  const [isAddingMapping, setIsAddingMapping] = useState(false);
  const [currentMapping, setCurrentMapping] = useState<{
    id?: string;
    primaryServerId?: string;
    primaryRoleId?: string;
    primaryRoleName?: string;
    targetMappings?: {
      serverId: string;
      serverName: string;
      targetRoleId: string;
      targetRoleName: string;
    }[];
  }>({});

  const { toast } = useToast();
  const {
    mappings: savedMappings,
    serverRoles,
    mappingsLoading,
    rolesLoading,
    createMapping,
    deleteMapping,
    getServerRoles
  } = useRoleMappings(groupId);


  const handleSetPrimary = (server: Server) => {
    setPrimaryServer(server);
    setIsAddingMapping(false);
    setCurrentMapping({});
  };

  const handleStartNewMapping = () => {
    setIsAddingMapping(true);
    setCurrentMapping({
      primaryServerId: primaryServer?.id || '',
      targetMappings: []
    });
  };

  const handleSelectPrimaryRole = (roleId: string, roleName: string) => {
    setCurrentMapping(prev => ({
      ...prev,
      primaryRoleId: roleId,
      primaryRoleName: roleName
    }));
  };

  const handleAddTargetServer = (serverId: string, serverName: string, targetRoleId: string, targetRoleName: string) => {
    setCurrentMapping(prev => ({
      ...prev,
      targetMappings: [
        ...(prev.targetMappings || []),
        { serverId, serverName, targetRoleId, targetRoleName }
      ]
    }));
  };

  const handleRemoveTargetServer = (serverId: string) => {
    setCurrentMapping(prev => ({
      ...prev,
      targetMappings: prev.targetMappings?.filter(t => t.serverId !== serverId) || []
    }));
  };

  const handleSaveMapping = async () => {
    console.log('[RoleSyncManager] handleSaveMapping called');
    console.log('[RoleSyncManager] currentMapping:', currentMapping);
    console.log('[RoleSyncManager] primaryServer:', primaryServer);
    
    if (currentMapping.primaryRoleId && currentMapping.primaryRoleName && currentMapping.targetMappings && currentMapping.targetMappings.length > 0) {
      console.log('[RoleSyncManager] Validation passed, calling createMapping');
      try {
        const mappingData = {
          primaryServerId: primaryServer?.id || '',
          primaryRoleId: currentMapping.primaryRoleId,
          primaryRoleName: currentMapping.primaryRoleName,
          targetMappings: currentMapping.targetMappings.map(tm => ({
            serverId: tm.serverId,
            roleId: tm.targetRoleId,
            roleName: tm.targetRoleName
          }))
        };
        console.log('[RoleSyncManager] Mapping data:', mappingData);
        
        await createMapping(mappingData);
        console.log('[RoleSyncManager] createMapping successful');
        
        toast({
          title: "Mapping Saved",
          description: `Role mapping for "${currentMapping.primaryRoleName}" saved successfully.`,
        });
        setIsAddingMapping(false);
        setCurrentMapping({});
      } catch (error) {
        console.error('[RoleSyncManager] createMapping error:', error);
        toast({
          title: "Error Saving Mapping",
          description: `Failed to save role mapping: ${(error as Error).message}`,
          variant: "destructive",
        });
      }
    } else {
      console.log('[RoleSyncManager] Validation failed:', {
        primaryRoleId: currentMapping.primaryRoleId,
        primaryRoleName: currentMapping.primaryRoleName,
        targetMappings: currentMapping.targetMappings,
        targetMappingsLength: currentMapping.targetMappings?.length
      });
    }
  };

  const handleCancelMapping = () => {
    setIsAddingMapping(false);
    setCurrentMapping({});
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      await deleteMapping(mappingId);
      toast({
        title: "Mapping Deleted",
        description: "Role mapping deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error Deleting Mapping",
        description: `Failed to delete role mapping: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const getPrimaryRoles = (serverId: string) => {
    const roles = getServerRoles(serverId);
    // Sort by position (highest first) - Discord roles have higher position = higher hierarchy
    return roles.sort((a, b) => (b.position || 0) - (a.position || 0));
  };

  const getTargetRoles = (serverId: string) => {
    const roles = getServerRoles(serverId);
    // Sort by position (highest first) - Discord roles have higher position = higher hierarchy
    return roles.sort((a, b) => (b.position || 0) - (a.position || 0));
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left Column: Create Mapping */}
      <div className="space-y-6 flex-1">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Create Role Mapping</h1>
          <p className="text-sm text-gray-600">Map roles from primary server to other servers</p>
        </div>

        {/* Primary Server Selection */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-base font-medium flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-yellow-500" />
            Primary Server
          </div>
          <select
            value={primaryServer?.id || ''}
            onChange={(e) => {
              const server = servers.find(s => s.id === e.target.value);
              if (server) handleSetPrimary(server);
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select primary server --</option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
        </div>

        {/* Create New Mapping */}
        {primaryServer && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-base font-medium flex items-center gap-2 mb-4">
              <ArrowRight className="h-4 w-4" />
              Create Mapping
            </div>
            <div>
              {/* Add New Mapping */}
              {isAddingMapping && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-gray-900 mb-3">Add Role Mapping</h4>
                  
                  {/* Step 1: Select Primary Role */}
                  {!currentMapping.primaryRoleId && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select role from {primaryServer.name}
                      </label>
                      {rolesLoading[primaryServer.id] ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading roles...
                        </div>
                      ) : (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedRole = getPrimaryRoles(primaryServer.id).find(r => r.id === e.target.value);
                              if (selectedRole) {
                                handleSelectPrimaryRole(selectedRole.id, selectedRole.name);
                              }
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">-- Select role --</option>
                          {getPrimaryRoles(primaryServer.id).map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Step 2: Map to Target Servers */}
                  {currentMapping.primaryRoleId && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getPrimaryRoles(primaryServer.id).find(r => r.id === currentMapping.primaryRoleId)?.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900">
                          Mapping: {currentMapping.primaryRoleName}
                        </span>
                      </div>

                      {/* Current Target Mappings */}
                      {currentMapping.targetMappings && currentMapping.targetMappings.length > 0 && (
                        <div className="mb-3">
                          <div className="space-y-1">
                            {currentMapping.targetMappings.map((target) => (
                              <div key={target.serverId} className="flex items-center justify-between bg-white rounded border p-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${servers.find(s => s.id === target.serverId)?.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span>{target.serverName}: {target.targetRoleName}</span>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRemoveTargetServer(target.serverId)}
                                  className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Target Server - Multi-Selection Interface */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Map to servers:
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                          {servers.filter(s => s.id !== primaryServer.id).map((server) => (
                            <div key={server.id} className="mb-3 last:mb-0">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${server.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm font-medium text-gray-900">{server.name}</span>
                                {currentMapping.targetMappings?.some(t => t.serverId === server.id) && (
                                  <span className="text-xs text-green-600">
                                    ✓ Mapped to: {currentMapping.targetMappings.find(t => t.serverId === server.id)?.targetRoleName}
                                  </span>
                                )}
                              </div>
                              
                              {!currentMapping.targetMappings?.some(t => t.serverId === server.id) && (
                                rolesLoading[server.id] ? (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 ml-2">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Loading roles...
                                  </div>
                                ) : (
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const role = getTargetRoles(server.id).find(r => r.id === e.target.value);
                                        if (role) {
                                          handleAddTargetServer(server.id, server.name, role.id, role.name);
                                          e.target.value = '';
                                        }
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="">-- Select role --</option>
                                    {getTargetRoles(server.id).map((role) => (
                                      <option key={role.id} value={role.id}>
                                        {role.name}
                                      </option>
                                    ))}
                                  </select>
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Save/Cancel */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={handleCancelMapping}>
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSaveMapping}
                          disabled={!currentMapping.targetMappings || currentMapping.targetMappings.length === 0}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isAddingMapping && (
                <div className="text-center py-6">
                  <ArrowRight className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 mb-1">Ready to create mapping</h3>
                  <p className="text-sm text-gray-600 mb-3">Click "Add" to start mapping roles</p>
                  <Button onClick={handleStartNewMapping} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-3 w-3 mr-1" />
                    Create Mapping
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Saved Mappings */}
      <div className="space-y-6 flex-1">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Saved Mappings</h1>
          <p className="text-sm text-gray-600">{savedMappings?.length || 0} role mapping{(savedMappings?.length || 0) !== 1 ? 's' : ''} configured</p>
        </div>

        {/* Saved Mappings List */}
        <div className="border border-gray-200 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          {mappingsLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading mappings...
            </div>
          ) : savedMappings && savedMappings.length > 0 ? (
            <div className="space-y-4">
              {savedMappings.map((mapping) => (
                <div key={mapping.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <ArrowRight className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{mapping.primaryRoleName}</h4>
                        <p className="text-sm text-gray-600">
                          Maps to {mapping.targetMappings.length} server{mapping.targetMappings.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {mapping.targetMappings.map((target) => (
                      <div key={target.serverId} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                        <div className={`w-2 h-2 rounded-full ${servers.find(s => s.id === target.serverId)?.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-gray-600">{target.serverName}:</span>
                        <span className="font-medium text-gray-900">{target.targetRoleName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowRight className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No saved mappings yet</h3>
              <p className="text-sm text-gray-600">Create your first mapping in the left column</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}