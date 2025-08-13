import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Section from "@/components/ui/section";
import {
  fetchGuilds,
  fetchRoles,
  type Guild,
  type Role,
} from "@/lib/api";
import RoleExplorer from "@/components/role-explorer";
import RoleKanbanWrapper from "@/components/role-kanban-wrapper";

type Params = { id: string };

export default async function RolesPage({ params }: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const { id: guildId } = await params;

  const guilds: Guild[] = await fetchGuilds(session.accessToken as any);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return notFound();

  const roles = await fetchRoles(guildId);


  return (
    <Section
      title="Roles"
      right={
        <div className="text-sm text-muted-foreground">
          {roles.length.toLocaleString()} roles
        </div>
      }
    >
      <div>
        <h2 className="font-semibold text-lg mb-2">Kanban Role Management (Experimental)</h2>
        <RoleKanbanWrapper guildId={guildId} roles={roles} />
      </div>
    </Section>
  );
}

