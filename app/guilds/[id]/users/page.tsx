import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Section from "@/components/ui/section";
import {
  fetchGuilds,
  fetchMembersLegacy,
  fetchRoles,
  type Guild,
  type Member,
  type Role,
} from "@/lib/api";

type Params = { id: string };

export default async function UsersPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const { id: guildId } = await params;

  // make sure the user actually has this guild
  const guilds: Guild[] = await fetchGuilds(session.accessToken as any);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return notFound();

  // basic data for now. we’ll do fancy stuff later.
  const [members, roles] = await Promise.all([
    fetchMembersLegacy(guildId),
    fetchRoles(guildId),
  ]);

  const roleById = new Map(roles.map((r) => [r.roleId, r]));

  return (
    <Section
      title={`Users — ${guild.name}`}
      right={
        <div className="text-sm text-muted-foreground">
          {members.length.toLocaleString()} users
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 px-3">Discord ID</th>
              <th className="py-2 px-3">Roles</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: Member) => (
              <tr key={m.discordUserId} className="border-b last:border-b-0">
                <td className="py-3 pr-3 font-medium">{m.username}</td>
                <td className="py-3 px-3 font-mono text-xs">{m.discordUserId}</td>
                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-1">
                    {m.roleIds.map((rid) => {
                      const r: Role | undefined = roleById.get(rid);
                      const name = r?.name ?? "unknown";
                      const color = r?.color || null; // hex like #abc123 or null
                      return (
                        <span
                          key={rid}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                          style={{
                            // light tint if color exists
                            backgroundColor: color ? `${color}20` : undefined,
                            borderColor: color || undefined,
                          }}
                          title={rid}
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="py-6 text-muted-foreground" colSpan={3}>
                  No users yet. Try inviting your bot to this guild or{" "}
                  <Link className="underline underline-offset-2" href="/">
                    go back
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
