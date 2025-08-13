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

  return (
    <Section
      title={`Roles — ${guild.name}`}
      right={
        <div className="text-sm text-muted-foreground">
          {roles.length.toLocaleString()} roles
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map((r: Role) => (
          <div
            key={r.roleId}
            className="rounded-xl border p-3 bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {r.roleId}
                </div>
              </div>
              <div
                className="h-3 w-3 rounded-full border"
                title={r.color ?? "no color"}
                style={{
                  backgroundColor: r.color || undefined,
                  borderColor: r.color || undefined,
                }}
              />
            </div>
          </div>
        ))}
        {roles.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No roles returned for this guild.
          </div>
        )}
      </div>
    </Section>
  );
}
