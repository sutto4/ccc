import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import Section from "@/components/ui/section";
import { type Guild, type Role } from "@/lib/api";
import RoleExplorer from "@/components/role-explorer";
import RoleKanbanWrapper from "@/components/role-kanban-wrapper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import MassRoleAssign from "./mass-role-assign";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

type Params = { id: string };

async function RolesPage({ params }: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  // Get access token from JWT (not session for security)
  const cookieStore = await cookies();
  const token = await getToken({ req: { cookies: cookieStore } as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) redirect("/signin");

  const { id: guildId } = await params;

  // Try optimized guilds API first, fallback to original
  let guildsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/guilds-optimized`, {
    headers: {
      'Cookie': cookieStore.toString(), // Pass cookies for authentication
    },
  });

  if (!guildsResponse.ok) {
    console.warn('[PERF] Optimized guilds endpoint failed, trying original...');
    guildsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/guilds`, {
      headers: {
        'Cookie': cookieStore.toString(),
      },
    });
  }

  let guilds: Guild[] = [];
  if (guildsResponse.ok) {
    const data = await guildsResponse.json();
    guilds = data.guilds || [];
  }

  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return notFound();

  // Try optimized roles API first, fallback to original
  let rolesResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/guilds/${guildId}/roles-optimized`, {
    headers: {
      'Cookie': cookieStore.toString(), // Pass cookies for authentication
    },
  });

  if (!rolesResponse.ok) {
    console.warn('[PERF] Optimized roles endpoint failed, trying original...');
    rolesResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/guilds/${guildId}/roles`, {
      headers: {
        'Cookie': cookieStore.toString(),
      },
    });
  }

  let roles: any[] = [];
  if (rolesResponse.ok) {
    const data = await rolesResponse.json();
    roles = data.roles || data || []; // Handle both old and new response formats
  }


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

export default RolesPage;

