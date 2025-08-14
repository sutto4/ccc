
"use client";

import GuildPremiumBadge from "@/components/guild-premium-badge";
import Section from "@/components/ui/section";
import Link from "next/link";

export default function AdminGuildsClient({ guilds, error }: { guilds: any[]; error: string | null }) {
  return (
    <Section title="Admin Guilds">
      {error && (
        <div className="py-6 text-red-600 text-center">{error}</div>
      )}
      {!error && guilds.length === 0 && (
        <div className="py-6 text-muted-foreground text-center">No guilds found.</div>
      )}
      {!error && guilds.length > 0 && (
        <ul className="space-y-2">
          {guilds.map((g: any) => (
            <li key={g.guild_id} className="border rounded p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{g.guild_name || <span className="italic text-muted-foreground">Unnamed</span>}</span>
                {g.premium ? <GuildPremiumBadge /> : null}
              </div>
              {g.owner_name && (
                <span className="text-xs text-muted-foreground">Owner: {g.owner_name}</span>
              )}
              <span className="text-xs text-muted-foreground font-mono">ID: {g.guild_id}</span>
              <span className="text-xs">Users: <span className="font-mono">{(typeof g.member_count === 'number' && g.member_count > 0) ? g.member_count : (g.approximate_member_count ?? "—")}</span></span>
              <span className="text-xs">Roles: <span className="font-mono">{typeof g.role_count === 'number' && g.role_count >= 0 ? g.role_count : "—"}</span></span>
              <span className="text-xs">Created: {g.created_at ? new Date(g.created_at).toLocaleDateString() : "—"}</span>
              <Link href={`/guilds/${g.guild_id}/settings/features`} className="text-primary underline text-xs mt-1">View Features</Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
