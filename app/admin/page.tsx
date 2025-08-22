"use client";

import { useEffect, useState } from "react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import GuildPremiumBadge from "@/components/guild-premium-badge";
import { Crown, Settings, Shield, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Fetches all guilds from the admin API
async function fetchGuilds() {
  const res = await fetch("/api/admin/guilds");
  if (!res.ok) throw new Error("Failed to fetch guilds");
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.guilds)) return data.guilds;
  return [];
}

export default function AdminGuildsPage() {
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<'card' | 'table'>('card');

  useEffect(() => {
    fetchGuilds()
      .then((data) => {
        const arr = Array.isArray(data)
          ? data
          : (data && Array.isArray((data as any).guilds) ? (data as any).guilds : []);
        setGuilds(arr);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const list = Array.isArray(guilds) ? guilds : [];
  const filtered = list.filter(g =>
    (g.guild_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (g.guild_id || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="pl-4 pr-4 md:pr-6 md:pl-4 py-8">
        <Section title="Admin Guilds">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading guilds...</div>
          </div>
        </Section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pl-4 pr-4 md:pr-6 md:pl-4 py-8">
        <Section title="Admin Guilds">
          <div className="text-center py-12">
            <div className="text-red-600">Error: {error}</div>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="pl-4 pr-4 md:pr-6 md:pl-4 py-8">
      <Section title="Admin Guilds">
        <div className="space-y-6">
          {/* Search and View Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search guilds..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={view === 'card' ? 'default' : 'outline'}
                onClick={() => setView('card')}
                size="sm"
              >
                Card View
              </Button>
              <Button
                variant={view === 'table' ? 'default' : 'outline'}
                onClick={() => setView('table')}
                size="sm"
              >
                Table View
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No guilds found.</div>
            </div>
          ) : view === 'card' ? (
            /* Card View - Similar to guilds page */
            <Card className="border-2 border-gray-200 bg-gray-50/30">
              <CardHeader
                title={
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <span className="text-lg font-semibold text-gray-800">All Servers</span>
                  </div>
                }
                subtitle={<span className="text-sm text-gray-600">{filtered.length} servers found</span>}
              />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((guild) => (
                    <div key={guild.guild_id} className="relative rounded-lg border bg-white p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {guild.icon_url ? (
                            <Image
                              src={guild.icon_url}
                              alt={guild.guild_name || 'Guild'}
                              width={40}
                              height={40}
                              className="rounded-lg"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-semibold text-gray-600">
                                {(guild.guild_name || guild.guild_id).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {guild.guild_name || guild.guild_id}
                            </h4>
                            <p className="text-xs text-gray-500">
                              ID: {guild.guild_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {guild.premium && <Crown className="w-5 h-5 text-yellow-500" />}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            guild.status === 'left'
                              ? 'bg-red-100 text-red-800'
                              : guild.status === 'active' || !guild.status
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {guild.status === 'left' ? 'Left' : guild.status === 'active' || !guild.status ? 'Active' : guild.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-500">Premium:</span>
                          <span className="ml-2 text-gray-900">{guild.premium ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <span className="ml-2 text-gray-900">{new Date(guild.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {guild.status !== 'left' ? (
                          <>
                            <Button asChild size="sm" variant="outline" className="flex-1">
                              <Link href={`/admin/guilds/${guild.guild_id}`}>
                                <Settings className="w-4 h-4 mr-2" />
                                Admin
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="flex-1">
                              <Link href={`/guilds/${guild.guild_id}/settings`}>
                                <Shield className="w-4 h-4 mr-2" />
                                Guild
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Bot removed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Table View */
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guild</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((guild) => (
                    <tr key={guild.guild_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {guild.icon_url ? (
                            <Image
                              src={guild.icon_url}
                              alt={guild.guild_name || 'Guild'}
                              width={40}
                              height={40}
                              className="rounded-lg mr-4"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center mr-4">
                              <span className="text-sm font-semibold text-gray-600">
                                {(guild.guild_name || guild.guild_id).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {guild.guild_name || guild.guild_id}
                            </div>
                            {guild.premium && <Crown className="w-4 h-4 text-yellow-500 inline" />}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {guild.guild_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          guild.premium ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {guild.premium ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          guild.status === 'left'
                            ? 'bg-red-100 text-red-800'
                            : guild.status === 'active' || !guild.status
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {guild.status === 'left' ? 'Left' : guild.status === 'active' || !guild.status ? 'Active' : guild.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(guild.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {guild.status !== 'left' ? (
                          <div className="flex gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/guilds/${guild.guild_id}`}>
                                <Settings className="w-4 h-4 mr-2" />
                                Admin
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/guilds/${guild.guild_id}/settings`}>
                                <Shield className="w-4 h-4 mr-2" />
                                Guild
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Bot removed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}