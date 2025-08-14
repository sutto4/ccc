"use client";
"use client";

import { useEffect, useState } from "react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import GuildPremiumBadge from "@/components/guild-premium-badge";

// Fetches all guilds from the admin API
async function fetchGuilds() {
  const res = await fetch("/api/admin/guilds");
  if (!res.ok) throw new Error("Failed to fetch guilds");
  return res.json();
}

export default function AdminGuildsPage() {
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<'card' | 'table'>('card');

  useEffect(() => {
    fetchGuilds()
      .then(setGuilds)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = guilds.filter(g =>
    g.guild_name?.toLowerCase().includes(search.toLowerCase()) ||
    g.guild_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Section title="Admin Guilds">
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Search guilds..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input input-bordered w-full max-w-xs"
        />
        <div className="flex gap-2">
          <Button
            variant={view === 'card' ? 'default' : 'outline'}
            onClick={() => setView('card')}
            aria-pressed={view === 'card'}
          >
            Card View
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'outline'}
            onClick={() => setView('table')}
            aria-pressed={view === 'table'}
          >
            Table View
          </Button>
        </div>
      </div>
      {view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading && (
            <div className="col-span-full py-6 text-muted-foreground text-center">Loading...</div>
          )}
          {error && (
            <div className="col-span-full py-6 text-red-600 text-center">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="col-span-full py-6 text-muted-foreground text-center">No guilds found.</div>
          )}
          {!loading && !error && filtered.map(g => (
            <Link
              key={g.guild_id}
              href={`/guilds/${g.guild_id}/settings/features`}
              className="relative flex flex-col items-center p-4 gap-2 bg-card border shadow-sm rounded-xl transition group focus:outline-none cursor-pointer hover:bg-primary/10 hover:shadow-md focus:ring-2 focus:ring-primary/50"
              tabIndex={0}
              aria-label={`View and edit features for ${g.guild_name}`}
            >
              <div className="absolute top-2 right-2">
                {g.premium ? <GuildPremiumBadge /> : null}
              </div>
              <Image
                src={g.guild_icon_url || "/placeholder-logo.png"}
                alt={g.guild_name || "Guild"}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border"
              />
              <div className="font-semibold text-base truncate whitespace-nowrap w-full text-center group-hover:underline">{g.guild_name || <span className="italic text-muted-foreground">Unnamed</span>}</div>
              {g.owner_name && (
                <div className="text-xs text-muted-foreground mt-1">👑 Owner: {g.owner_name}</div>
              )}
              <div className="text-xs text-muted-foreground font-mono">ID: {g.guild_id}</div>
              <div className="text-xs">Users: <span className="font-mono">{(typeof g.member_count === 'number' && g.member_count > 0) ? g.member_count : (g.approximate_member_count ?? "—")}</span></div>
              <div className="text-xs">Roles: <span className="font-mono">{typeof g.role_count === 'number' && g.role_count >= 0 ? g.role_count : "—"}</span></div>
              <div className="text-xs">Created: {g.created_at ? new Date(g.created_at).toLocaleDateString() : "—"}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full divide-y divide-border text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Guild Name</th>
                <th className="px-3 py-2 text-left font-semibold">Owner</th>
                <th className="px-3 py-2 text-left font-semibold">Guild ID</th>
                <th className="px-3 py-2 text-left font-semibold">Users</th>
                <th className="px-3 py-2 text-left font-semibold">Roles</th>
                <th className="px-3 py-2 text-left font-semibold">Premium</th>
                <th className="px-3 py-2 text-left font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="py-6 text-muted-foreground text-center">Loading...</td></tr>
              )}
              {error && (
                <tr><td colSpan={7} className="py-6 text-red-600 text-center">{error}</td></tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-muted-foreground text-center">No guilds found.</td></tr>
              )}
              {!loading && !error && filtered.map(g => (
                <tr
                  key={g.guild_id}
                  className="border-b last:border-0 group cursor-pointer transition hover:bg-primary/10 hover:shadow-md focus-within:bg-primary/10"
                  tabIndex={0}
                  onClick={e => {
                    if (e.target === e.currentTarget) {
                      window.location.href = `/guilds/${g.guild_id}/settings/features`;
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      window.location.href = `/guilds/${g.guild_id}/settings/features`;
                    }
                  }}
                  aria-label={`View and edit features for ${g.guild_name}`}
                >
                  <td className="px-3 py-2 font-semibold truncate whitespace-nowrap max-w-[180px] group-hover:underline">{g.guild_name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{g.owner_name ? `👑 ${g.owner_name}` : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 font-mono">{g.guild_id}</td>
                  <td className="px-3 py-2 font-mono">{(typeof g.member_count === 'number' && g.member_count > 0) ? g.member_count : (g.approximate_member_count ?? "—")}</td>
                  <td className="px-3 py-2 font-mono">{typeof g.role_count === 'number' && g.role_count >= 0 ? g.role_count : "—"}</td>
                  <td className="px-3 py-2">{g.premium ? <GuildPremiumBadge /> : <span className="text-muted-foreground">Free</span>}</td>
                  <td className="px-3 py-2">{g.created_at ? new Date(g.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
