import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { fetchGuilds, type Guild } from "@/lib/api";
import Section from "@/components/ui/section";
import GuildPremiumBadge from "@/components/guild-premium-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, Users, Shield } from "lucide-react";

import { Bot, Zap, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function GuildsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/signin');
  }

  let guilds: Guild[] = [];
  try {
    // For server-side rendering, call the guilds logic directly instead of going through HTTP
    const { getGuildsForUser } = await import('@/lib/guilds-server');
    guilds = await getGuildsForUser(session.accessToken as string);
  } catch (error) {
    console.error('Failed to fetch guilds:', error);
  }

  if (guilds.length === 0) {
    return (
      <div className="pl-4 pr-4 md:pr-6 md:pl-4 py-8">
        <Section title="My Servers">
          <div className="text-center py-12">
            <div className="mx-auto max-w-2xl">
              <div className="mb-8">
                <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to ServerMate!
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  You haven't added any Discord servers yet. Let's get you started with powerful server management tools.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 rounded-lg border border-gray-200 bg-white">
                  <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Role Management</h3>
                  <p className="text-sm text-gray-600">Easily manage roles, permissions, and user access across your servers.</p>
                </div>

                <div className="text-center p-6 rounded-lg border border-gray-200 bg-white">
                  <div className="mx-auto h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">User Management</h3>
                  <p className="text-sm text-gray-600">Track users, manage custom groups, and monitor server activity.</p>
                </div>

                <div className="text-center p-6 rounded-lg border border-gray-200 bg-white">
                  <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Reaction Roles</h3>
                  <p className="text-sm text-gray-600">Create interactive role selection menus and emoji reactions.</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold text-gray-900">Getting Started</span>
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="text-gray-700 mb-4">
                  To add your first server, you'll need to invite the ServerMate bot to your Discord server.
                </p>
                <div className="flex justify-center">
                  <Link
                    href="https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=8&scope=bot"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Bot className="h-5 w-5" />
                    Invite Bot to Server
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  // Show existing guilds if any exist
  return (
    <div className="pl-4 pr-4 md:pr-6 md:pl-4 py-8">
      <Section title="My Servers">
        <div className="space-y-6">
          {/* Grouped Servers */}
          {(() => {
            const groupedGuilds = guilds.filter(g => g.group);
            if (groupedGuilds.length === 0) return null;

            // Build groups with servers and sort
            const groups = Array.from(
              groupedGuilds.reduce<Map<number, { id: number; name: string; description: string | null; servers: Guild[] }>>(
                (acc, g) => {
                  const gr = g.group!;
                  const cur = acc.get(gr.id) || { id: gr.id, name: gr.name, description: gr.description, servers: [] };
                  cur.servers.push(g);
                  acc.set(gr.id, cur);
                  return acc;
                },
                new Map()
              ).values()
            )
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

            return groups.map(group => {
              const groupServers = [...group.servers].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

              return (
                <Card key={group.id} className="border-2 border-blue-100 bg-blue-50/30">
                  <CardHeader
                    title={
                      <div className="flex items-center gap-3">
                        <Folder className="h-5 w-5 text-blue-600" />
                        <span className="text-lg font-semibold text-blue-800">{group.name}</span>
                      </div>
                    }
                    subtitle={group.description ? <span className="text-sm text-blue-700">{group.description}</span> : undefined}
                  />
                  <CardContent>
                    <div className="mb-2 text-xs text-blue-700">
                      <Users className="inline h-3 w-3 mr-1 align-text-bottom" />
                      {groupServers.length} server{groupServers.length !== 1 ? 's' : ''}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupServers.map((guild) => (
                        <Link key={guild.id} href={`/guilds/${guild.id}/users`} className="block group">
                          <div className="relative rounded-lg border bg-white p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {guild.iconUrl ? (
                                  <Image
                                    src={guild.iconUrl}
                                    alt={guild.name}
                                    width={40}
                                    height={40}
                                    className="rounded-lg"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                    <span className="text-sm font-semibold text-muted-foreground">
                                      {guild.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-medium group-hover:text-primary transition-colors">
                                    {guild.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {guild.memberCount?.toLocaleString() || 'N/A'} members • {guild.roleCount?.toLocaleString() || 'N/A'} roles
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {guild.premium && <GuildPremiumBadge />}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            });
          })()}

          {/* Individual Servers */}
          {(() => {
            const individualGuilds = guilds.filter(g => !g.group);
            if (individualGuilds.length === 0) return null;
            
            return (
              <Card className="border-2 border-gray-200 bg-gray-50/30">
                <CardHeader
                  title={
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-600" />
                      <span className="text-lg font-semibold text-gray-800">Individual Servers</span>
                    </div>
                  }
                  subtitle={<span className="text-sm text-gray-600">Servers not assigned to any group</span>}
                />
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {individualGuilds.map((guild) => (
                      <Link key={guild.id} href={`/guilds/${guild.id}/users`} className="block group">
                        <div className="relative rounded-lg border bg-white p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {guild.iconUrl ? (
                                <Image
                                  src={guild.iconUrl}
                                  alt={guild.name}
                                  width={40}
                                  height={40}
                                  className="rounded-lg"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                  <span className="text-sm font-semibold text-muted-foreground">
                                    {guild.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium group-hover:text-primary transition-colors">
                                  {guild.name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {guild.memberCount?.toLocaleString() || 'N/A'} members • {guild.roleCount?.toLocaleString() || 'N/A'} roles
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {guild.premium && <GuildPremiumBadge />}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </Section>
    </div>
  );
}
