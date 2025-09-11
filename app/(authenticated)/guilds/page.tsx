'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Section from "@/components/ui/section";
import GuildPremiumBadge from "@/components/guild-premium-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { AuthErrorBoundary } from "@/components/auth-error-boundary";
import { useE2ETrackingContext } from '@/components/e2e-tracking-provider';
import type { Guild } from "@/lib/api";

export default function GuildsPage() {
  return (
    <AuthErrorBoundary>
      <GuildsPageContent />
    </AuthErrorBoundary>
  );
}

function GuildsPageContent() {
  const router = useRouter();
  const { trackStep } = useE2ETrackingContext();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  // Group guilds by their group
  const groupedGuilds = React.useMemo(() => {
    console.log('[FRONTEND] All guilds:', guilds.map(g => ({ id: g.id, name: g.name, group: g.group })));
    
    const groups: Record<string, { group: any; guilds: Guild[] }> = {};

    guilds.forEach((guild) => {
      console.log('[FRONTEND] Processing guild:', guild.name, 'group:', guild.group);
      
      // Use the actual group data from the API
      const groupKey = guild.group?.id ? `group_${guild.group.id}` : 'ungrouped';
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          group: guild.group || { id: null, name: 'Individual Servers', description: null },
          guilds: []
        };
      }
      groups[groupKey].guilds.push(guild);
    });

    console.log('[FRONTEND] Grouped result:', Object.values(groups).map(g => ({ groupName: g.group.name, guildCount: g.guilds.length })));
    return Object.values(groups);
  }, [guilds]);

  useEffect(() => {
    async function fetchGuilds() {
      try {
        const response = await fetch('/api/guilds');
        
        if (response.ok) {
          const data = await response.json();
          setGuilds(data.guilds || []);
        } else if (response.status === 401) {
          router.replace('/signin');
          return;
        } else {
          setGuilds([]);
        }
      } catch (error) {
        setGuilds([]);
      } finally {
        setLoading(false);
      }
    }

    fetchGuilds();
  }, [router]);

  if (loading) {
    return (
      <div className="p-8">
        <Section title="My Servers">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Loading Your Servers</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </Section>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="p-8">
        <Section title="My Servers">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Servers Found</h2>
            <p className="text-gray-600">You don't have access to any servers.</p>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Section title="My Servers">
        <div className="space-y-6">
          {groupedGuilds.map((groupData, groupIndex) => (
            <Card key={groupData.group.id || `group-${groupIndex}`} className="border-2 border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <div>
                    <span className="text-lg font-semibold">
                      {groupData.group.name || 'Individual Servers'}
                    </span>
                    {groupData.group.description && (
                      <p className="text-sm text-gray-600 mt-1">{groupData.group.description}</p>
                    )}
                  </div>
                  <div className="ml-auto text-sm text-gray-500">
                    {groupData.guilds.length} server{groupData.guilds.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupData.guilds.map((guild) => (
                    <Link
                      key={guild.id}
                      href={`/guilds/${guild.id}`}
                      className="block"
                    >
                      <div className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          {guild.iconUrl ? (
                            <Image
                              src={guild.iconUrl}
                              alt={guild.name || 'Server'}
                              width={40}
                              height={40}
                              className="rounded-lg"
                              unoptimized={true}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">
                                {guild.name ? guild.name.charAt(0).toUpperCase() : '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium">
                              {guild.name || 'Unknown Server'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {guild.memberCount || 0} members, {guild.roleCount || 0} roles
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}