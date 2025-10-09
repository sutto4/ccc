"use client";

import { useEffect, useState } from "react";
import RoleExplorer from "@/components/role-explorer";
import RoleKanbanWrapper from "@/components/role-kanban-wrapper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dynamic from "next/dynamic";

const MassRoleAssign = dynamic(() => import('@/app/guilds/[id]/roles/mass-role-assign'), {
  ssr: false,
  loading: () => <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></div>
});

export default function RolesPanel({ guildId }: { guildId: string }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;

    const loadRoles = async () => {
      setLoading(true);
      try {
        // Try optimized endpoint first
        let response = await fetch(`/api/guilds/${guildId}/roles-optimized`);
        
        if (!response.ok) {
          response = await fetch(`/api/guilds/${guildId}/roles`);
        }

        if (response.ok) {
          const data = await response.json();
          setRoles(data.roles || data || []);
        }
      } catch (error) {
        console.error('Failed to load roles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [guildId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Roles</h2>
          <div className="text-sm text-muted-foreground">
            {roles.length.toLocaleString()} roles
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="kanban" className="w-full">
        <TabsList className="mb-4 rounded-full bg-muted/60 p-1 border border-border shadow-sm">
          <TabsTrigger value="kanban" className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Kanban
          </TabsTrigger>
          <TabsTrigger value="explorer" className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Role Explorer
          </TabsTrigger>
          <TabsTrigger value="mass" className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Mass Role Assign
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kanban">
          <h3 className="font-semibold text-lg mb-2">Kanban Role Management (Experimental)</h3>
          <RoleKanbanWrapper guildId={guildId} roles={roles} />
        </TabsContent>
        <TabsContent value="explorer">
          <h3 className="text-xl font-semibold mb-4">Role Explorer</h3>
          <RoleExplorer guildId={guildId} roles={roles} />
        </TabsContent>
        <TabsContent value="mass">
          <h3 className="text-xl font-semibold mb-4">Mass Role Assign</h3>
          <MassRoleAssign guildId={guildId} roles={roles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


