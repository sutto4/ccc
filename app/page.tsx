import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGuilds, type Guild } from "@/lib/api";
import Section from "@/components/ui/section";
import GuildPremiumBadge from "@/components/guild-premium-badge";
import GuildSelectedBadge from "@/components/guild-selected-badge";
import { usePathname } from "next/navigation";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const guilds: Guild[] = session ? await fetchGuilds(session.accessToken as any) : [];

  if (!session) {
    return (
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-10">
        <Section title="Welcome">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold">Welcome</h1>
            <p className="text-muted-foreground">
              You need to sign in to see your guilds.
            </p>
            <div>
              <Link
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
                href="/signin"
              >
                Sign in
              </Link>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  // Get the current selected guildId from the URL if on the client
  let selectedGuildId: string | null = null;
  if (typeof window !== "undefined") {
    const path = window.location.pathname.split("/");
    if (path[1] === "guilds" && path[2]) selectedGuildId = path[2];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
      </div>

      <Section title="Your Guilds">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guilds.map((g) => {
            const memberCount = (g.memberCount ?? 0).toLocaleString();
            const roleCount = g.roleCount ?? 0;
            const premium = Boolean(g.premium);
            const iconUrl = g.iconUrl;
            const isSelected = (typeof window !== "undefined") && selectedGuildId === g.id;

            return (
              <Link
                key={g.id}
                href={`/guilds/${g.id}/users`}
                className={[
                  "group rounded-xl border p-4 hover:shadow-sm transition-shadow bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]",
                  isSelected ? "ring-2 ring-blue-500 border-blue-500" : ""
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {iconUrl ? (
                      <Image
                        src={iconUrl}
                        alt={g.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xl">🛡️</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{g.name}</div>
                    <div className="text-xs text-muted-foreground break-words">ID: {g.id}</div>
                  </div>
                  {premium && <GuildPremiumBadge />}
                  {isSelected && <GuildSelectedBadge />}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-muted px-2 py-1">
                    <div className="text-xs text-muted-foreground">Members</div>
                    <div className="font-medium">{memberCount}</div>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1">
                    <div className="text-xs text-muted-foreground">Roles</div>
                    <div className="font-medium">{roleCount}</div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  {g.createdAt ? `Created ${new Date(g.createdAt).toLocaleDateString()}` : "Creation date unknown"}
                </div>
              </Link>
            );
          })}
        </div>

        {guilds.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            No guilds found for your account.
          </div>
        )}
      </Section>
    </div>
  );
}
