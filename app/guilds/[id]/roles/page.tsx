import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Section from "@/components/ui/section";
import { type Guild, type Role } from "@/lib/api";
import RoleExplorer from "@/components/role-explorer";
import RoleKanbanWrapper from "@/components/role-kanban-wrapper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import MassRoleAssign from "./mass-role-assign";

type Params = { id: string };

export default async function RolesPage({ params }: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const { id: guildId } = await params;

  // Use the direct server function instead of HTTP API
  const { getGuildsForUser } = await import('@/lib/guilds-server');
  const guilds: Guild[] = await getGuildsForUser(session.accessToken as string);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return notFound();

  // Use the direct server function instead of HTTP API
  const { getRolesForGuild } = await import('@/lib/guilds-server');
  const roles = await getRolesForGuild(guildId, session.accessToken as string);


  return (
    <Section
      title="Roles"
      right={
        <div className="text-sm text-muted-foreground">
          {roles.length.toLocaleString()} roles
        </div>
      }
    >
      <Tabs defaultValue="kanban" className="w-full">
        <TabsList className="mb-4 rounded-full bg-muted/60 p-1 border border-border shadow-sm">
          <TabsTrigger value="kanban" className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Kanban</TabsTrigger>
          <TabsTrigger value="explorer" className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Role Explorer</TabsTrigger>
          <TabsTrigger value="mass" className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mass Role Assign</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban">
          <h2 className="font-semibold text-lg mb-2">Kanban Role Management (Experimental)</h2>
          <RoleKanbanWrapper guildId={guildId} roles={roles} />
        </TabsContent>
        <TabsContent value="explorer">
          <h2 className="text-xl font-semibold mb-4">Role Explorer</h2>
          <RoleExplorer guildId={guildId} roles={roles} />
        </TabsContent>
        <TabsContent value="mass">
          <h2 className="text-xl font-semibold mb-4">Mass Role Assign</h2>
          <MassRoleAssign guildId={guildId} roles={roles} />
        </TabsContent>
      </Tabs>
    </Section>
  );
}

