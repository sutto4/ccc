"use client";
"use client";

import { useEffect, useState } from "react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import GuildPremiumBadge from "@/components/guild-premium-badge";
import { Crown, Settings, Shield } from "lucide-react";

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
            variant={view === 'card' ? 'primary' : 'outline'}
            onClick={() => setView('card')}
            aria-pressed={view === 'card'}
          >
            Card View
          </Button>
          <Button
            variant={view === 'table' ? 'primary' : 'outline'}
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
          {!loading && !error && filtered.map((g) => (
            <div key={g.guild_id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {g.guild_name}
                </h3>
                <div className="flex items-center gap-2">
                  {g.premium && (
                    <Crown className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    g.status === 'left' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : g.status === 'active' || !g.status
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {g.status === 'left' ? 'Left' : g.status === 'active' || !g.status ? 'Active' : g.status}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">ID:</span>
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">{g.guild_id}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Premium:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {g.premium ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(g.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(g.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {g.status !== 'left' && (
                  <>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/guilds/${g.guild_id}`}>
                        <Settings className="w-4 h-4 mr-2" />
                        Admin Settings
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/guilds/${g.guild_id}/settings`}>
                        <Shield className="w-4 h-4 mr-2" />
                        Guild Settings
                      </Link>
                    </Button>
                  </>
                )}
                {g.status === 'left' && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Bot was removed from this server
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full divide-y divide-border text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Guild</th>
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">Premium</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="py-6 text-muted-foreground text-center">Loading...</td></tr>
              )}
              {error && (
                <tr><td colSpan={8} className="py-6 text-red-600 text-center">{error}</td></tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-muted-foreground text-center">No guilds found.</td></tr>
              )}
              {!loading && !error && filtered.map((g) => (
                <tr key={g.guild_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{g.guild_name}</div>
                      {g.premium && <Crown className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-sm">{g.guild_id}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      g.premium ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {g.premium ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      g.status === 'left' 
                        ? 'bg-red-100 text-red-800'
                        : g.status === 'active' || !g.status
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {g.status === 'left' ? 'Left' : g.status === 'active' || !g.status ? 'Active' : g.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    {new Date(g.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {g.status !== 'left' ? (
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/guilds/${g.guild_id}`}>
                            <Settings className="w-4 h-4 mr-2" />
                            Admin
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/guilds/${g.guild_id}/settings`}>
                            <Shield className="w-4 h-4 mr-2" />
                            Guild
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">
                        Bot removed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
