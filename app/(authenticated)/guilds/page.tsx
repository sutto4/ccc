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
import { useGuildsQuery } from "@/hooks/use-guilds-query";

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
  
  // Use React Query for guilds data
  const { data: guildsData = [], isLoading: loading, error } = useGuildsQuery();
  const guilds: Guild[] = guildsData as Guild[];

  // Group guilds by their group
  const groupedGuilds = React.useMemo(() => {
    console.log('[FRONTEND] Recalculating groupedGuilds with', guilds.length, 'guilds');
    const groups: Record<string, { group: any; guilds: Guild[] }> = {};

    guilds.forEach((guild) => {
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

    const result = Object.values(groups);
    
    // Sort so that defined groups come first, then Individual Servers at the bottom
    result.sort((a, b) => {
      // If one is Individual Servers (no group id), put it last
      if (!a.group?.id && b.group?.id) return 1;
      if (a.group?.id && !b.group?.id) return -1;
      // If both have groups or both don't, sort by name
      return (a.group?.name || '').localeCompare(b.group?.name || '');
    });
    
    console.log('[FRONTEND] Grouped result:', result.map(g => ({ name: g.group?.name, count: g.guilds.length })));
    return result;
  }, [guilds]);

  // Data fetching is now handled by React Query hook above

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
            <div key={`group-${groupIndex}`} className="border border-gray-200 rounded-lg bg-white">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {groupData.group?.name || 'Individual Servers'}
                </h2>
                <p className="text-sm text-gray-600">
                  {groupData.guilds.length} server{groupData.guilds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-6">
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
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}