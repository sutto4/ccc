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

type Params = { id: string };

export default async function RolesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const { id: guildId } = await params;

  const guilds: Guild[] = await fetchGuilds(session.accessToken as any);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return notFound();

  const roles = await fetchRoles(guildId);

  // Client-side state for expanded role and search
  // (This is a hybrid page, so we use a client component for interactivity)
  // We'll use a simple search and expand/collapse for each role
  return (
    <Section
      title={`Roles — ${guild.name}`}
      right={
        <div className="text-sm text-muted-foreground">
          {roles.length.toLocaleString()} roles
        </div>
      }
    >
      <RoleExplorer guildId={guildId} roles={roles} />
    </Section>
  );

}

