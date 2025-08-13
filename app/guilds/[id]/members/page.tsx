import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Section from "@/components/ui/section";
import {
  fetchGuilds,
  fetchMembersLegacy,
  type Guild,
  type Member,
} from "@/lib/api";

type Params = { id: string };

export default async function MembersPage({
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

  const members: Member[] = await fetchMembersLegacy(guildId);

  return (
    <Section
      title={`Members — ${guild.name}`}
      right={
        <div className="text-sm text-muted-foreground">
          {members.length.toLocaleString()} members
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 px-3">Discord ID</th>
              <th className="py-2 px-3">Account ID</th>
              <th className="py-2 px-3">Groups</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.discordUserId} className="border-b last:border-b-0">
                <td className="py-3 pr-3 font-medium">{m.username}</td>
                <td className="py-3 px-3 font-mono text-xs">{m.discordUserId}</td>
                <td className="py-3 px-3 font-mono text-xs">
                  {m.accountid ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-1">
                    {(m.groups ?? []).map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                      >
                        {g}
                      </span>
                    ))}
                    {(m.groups ?? []).length === 0 && (
                      <span className="text-xs text-muted-foreground">none</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="py-6 text-muted-foreground" colSpan={4}>
                  No members returned for this guild.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
