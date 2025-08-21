import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { fetchGuilds, type Guild } from "@/lib/api";
import Section from "@/components/ui/section";
import GuildPremiumBadge from "@/components/guild-premium-badge";

import { Bot, Shield, Users, Zap, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function GuildsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/signin');
  }

  let guilds: Guild[] = [];
  try {
    console.log('Session access token:', session.accessToken ? 'Present' : 'Missing');
    console.log('Session object keys:', Object.keys(session));
    
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
                  Welcome to ServerHub!
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
                  To add your first server, you'll need to invite the ServerHub bot to your Discord server.
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guilds.map((guild) => (
            <Link key={guild.id} href={`/guilds/${guild.id}/users`} className="block group">
              <div className="relative rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {guild.iconUrl ? (
                      <Image
                        src={guild.iconUrl}
                        alt={guild.name}
                        width={48}
                        height={48}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-lg font-semibold text-muted-foreground">
                          {guild.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {guild.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {(guild.memberCount ?? (guild as any).approximateMemberCount ?? (guild as any).approximate_member_count ?? 0).toLocaleString()} members
                      </p>
                      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                        <span>{(guild.roleCount ?? 0).toLocaleString()} roles</span>
                        {guild.createdAt && (
                          <>
                            <span>•</span>
                            <span>
                              Created {new Date(guild.createdAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">ID: {guild.id}</p>
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
      </Section>
    </div>
  );
}
