import { NextRequest, NextResponse } from "next/server";
import { getToken } from 'next-auth/jwt';
import { query } from "@/lib/db";
import { perfMonitor, measurePerf } from "@/lib/performance-monitor";
import { cacheGet, cacheSet, cacheMget, cacheMset } from "@/lib/memory-cache";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache keys
const CACHE_KEYS = {
  USER_GUILDS: (userId: string) => `user-guilds:${userId}`,
  BOT_GUILDS: 'bot-guilds',
  GUILD_PERMISSIONS: (userId: string, guildId: string) => `guild-permissions:${userId}:${guildId}`,
  GROUP_INFO: 'group-info',
  ACCESS_CONTROL: (userId: string) => `access-control:${userId}`
};

// Cache TTLs (in seconds)
const CACHE_TTLS = {
  USER_GUILDS: 300, // 5 minutes
  BOT_GUILDS: 60,   // 1 minute
  GUILD_PERMISSIONS: 600, // 10 minutes
  GROUP_INFO: 1800, // 30 minutes
  ACCESS_CONTROL: 300 // 5 minutes
};

async function fetchUserGuildsFromDiscord(accessToken: string, userId: string) {
  return measurePerf('discord-api-fetch-optimized', async () => {
    const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'ServerMate/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('AUTH_EXPIRED');
      }
      throw new Error(`Discord API error: ${response.status}`);
    }

    const guilds = await response.json();
    
    // Cache the result
    await cacheSet(CACHE_KEYS.USER_GUILDS(userId), guilds, CACHE_TTLS.USER_GUILDS);
    
    return guilds;
  });
}

async function fetchBotGuilds(botBase: string) {
  return measurePerf('bot-api-fetch-optimized', async () => {
    // Check cache first
    const cached = await cacheGet(CACHE_KEYS.BOT_GUILDS);
    if (cached) {
      return cached;
    }

    const response = await fetch(`${botBase}/api/guilds`);
    if (!response.ok) {
      throw new Error(`Bot API error: ${response.status}`);
    }

    const guilds = await response.json();
    
    // Cache the result
    await cacheSet(CACHE_KEYS.BOT_GUILDS, guilds, CACHE_TTLS.BOT_GUILDS);
    
    return guilds;
  });
}

async function fetchAccessControl(userId: string) {
  return measurePerf('db-access-control-optimized', async () => {
    // Check cache first
    const cached = await cacheGet(CACHE_KEYS.ACCESS_CONTROL(userId));
    if (cached) {
      return cached;
    }

    const accessRecords = await query(
      'SELECT guild_id FROM server_access_control WHERE user_id = ? AND has_access = 1',
      [userId]
    );

    const guildIds = accessRecords.map((record: any) => String(record.guild_id));
    
    // Cache the result
    await cacheSet(CACHE_KEYS.ACCESS_CONTROL(userId), guildIds, CACHE_TTLS.ACCESS_CONTROL);
    
    return guildIds;
  });
}

async function fetchGroupInfo(guildIds: string[]) {
  return measurePerf('db-group-info-optimized', async () => {
    if (guildIds.length === 0) return {};

    // Check cache first
    const cacheKey = CACHE_KEYS.GROUP_INFO;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      // Filter to only requested guilds
      const filtered: any = {};
      guildIds.forEach(id => {
        if (cached[id]) {
          filtered[id] = cached[id];
        }
      });
      return filtered;
    }

    const groups = await query(`
      SELECT
        g.guild_id,
        sg.id as group_id,
        sg.name as group_name,
        sg.description as group_description
      FROM guilds g
      LEFT JOIN server_groups sg ON g.group_id = sg.id
      WHERE g.guild_id IN (${guildIds.map(() => '?').join(',')})
    `, guildIds);

    const groupInfo: any = {};
    groups.forEach((g: any) => {
      groupInfo[g.guild_id] = {
        groupId: g.group_id,
        groupName: g.group_name,
        groupDescription: g.group_description
      };
    });

    // Cache all group info
    await cacheSet(cacheKey, groupInfo, CACHE_TTLS.GROUP_INFO);
    
    return groupInfo;
  });
}

async function checkGuildPermission(userId: string, guildId: string, accessToken: string, ownerLookup: Map<string, boolean>) {
  // Check cache first
  const cacheKey = CACHE_KEYS.GUILD_PERMISSIONS(userId, guildId);
  const cached = await cacheGet(cacheKey);
  if (cached !== null) {
    return cached;
  }

  return measurePerf('permission-check-optimized', async () => {
    try {
      // Check server_access_control table first
      const accessResults = await query(
        'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
        [guildId, userId]
      );

      if (accessResults.length > 0) {
        await cacheSet(cacheKey, true, CACHE_TTLS.GUILD_PERMISSIONS);
        return true;
      }

      // Check ownership
      const isOwner = ownerLookup.get(guildId) === true;
      if (isOwner) {
        await cacheSet(cacheKey, true, CACHE_TTLS.GUILD_PERMISSIONS);
        return true;
      }

      // Check role permissions
      const roleRows = await query(
        'SELECT role_id FROM server_role_permissions WHERE guild_id = ? AND can_use_app = 1',
        [guildId]
      );

      if (roleRows.length === 0) {
        // No role restrictions - allow access
        await cacheSet(cacheKey, true, CACHE_TTLS.GUILD_PERMISSIONS);
        return true;
      }

      // Check if user has any of the allowed roles
      const allowedRoleIds = roleRows.map((row: any) => row.role_id);
      const userRolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
      });
      
      if (userRolesResponse.ok) {
        const memberData = await userRolesResponse.json();
        const userRoleIds = memberData.roles || [];
        const hasRoleAccess = userRoleIds.some((roleId: string) => allowedRoleIds.includes(roleId));
        
        await cacheSet(cacheKey, hasRoleAccess, CACHE_TTLS.GUILD_PERMISSIONS);
        return hasRoleAccess;
      }

      await cacheSet(cacheKey, false, CACHE_TTLS.GUILD_PERMISSIONS);
      return false;
    } catch (error) {
      console.error('Error checking guild permission:', error);
      await cacheSet(cacheKey, false, CACHE_TTLS.GUILD_PERMISSIONS);
      return false;
    }
  }, { guildId, userId });
}

export const GET = async (req: NextRequest) => {
  return measurePerf('guilds-api-optimized-total', async () => {
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', redirectTo: '/signin' },
        { status: 401, headers: { 'X-Auth-Required': 'true', 'X-Redirect-To': '/signin' } }
      );
    }

    const discordId = (token as any).discordId || token.sub;
    const accessToken = (token as any).accessToken as string;

    if (!discordId || !accessToken) {
      return NextResponse.json(
        { error: 'Authentication expired', redirectTo: '/signin' },
        { status: 401, headers: { 'X-Auth-Required': 'true', 'X-Redirect-To': '/signin' } }
      );
    }

    try {
      // Fetch all data in parallel
      const [userGuilds, botGuilds, accessControlGuildIds] = await Promise.all([
        fetchUserGuildsFromDiscord(accessToken, discordId),
        fetchBotGuilds(process.env.SERVER_API_BASE_URL || ''),
        fetchAccessControl(discordId)
      ]);

      // Create lookup maps
      const accessControlSet = new Set(accessControlGuildIds);
      const botGuildMap = new Map(botGuilds.map((g: any) => [String(g.id || g.guild_id), g]));
      const ownerLookup = new Map(userGuilds.map((g: any) => [String(g.id), !!g.owner]));

      // Filter user guilds to only those with database access
      const accessibleUserGuilds = userGuilds.filter((guild: any) => 
        accessControlSet.has(guild.id)
      );

      // Check permissions for accessible guilds in parallel
      const permissionPromises = accessibleUserGuilds.map(async (userGuild: any) => {
        const hasPermission = await checkGuildPermission(
          discordId, 
          userGuild.id, 
          accessToken, 
          ownerLookup
        );
        return { userGuild, hasPermission };
      });

      const permissionResults = await Promise.all(permissionPromises);
      const accessibleGuilds = permissionResults
        .filter(result => result.hasPermission)
        .map(result => result.userGuild);

      // Get group info for accessible guilds
      const accessibleGuildIds = accessibleGuilds.map((g: any) => g.id);
      const groupInfo = await fetchGroupInfo(accessibleGuildIds);

      // Build final results
      const results = accessibleGuilds
        .filter((userGuild: any) => botGuildMap.has(userGuild.id))
        .map((userGuild: any) => {
          const botGuild = botGuildMap.get(userGuild.id);
          const group = groupInfo[userGuild.id];

          return {
            id: userGuild.id,
            name: botGuild?.guild_name || botGuild?.name || userGuild.name || 'Unknown Guild',
            memberCount: botGuild?.memberCount || 0,
            roleCount: botGuild?.roleCount || 0,
            iconUrl: botGuild?.iconUrl || (userGuild.icon ? 
              `https://cdn.discordapp.com/icons/${userGuild.id}/${userGuild.icon}.png` : null),
            premium: Boolean(botGuild?.premium || false),
            createdAt: null,
            group: group ? {
              id: group.groupId,
              name: group.groupName,
              description: group.groupDescription
            } : null
          };
        });

      // Log performance summary
      const slowest = perfMonitor.getSlowestOperations(5);
      console.log(`[PERF] 🎯 Optimized guilds API completed - ${results.length} guilds returned`);
      console.log(`[PERF] 📊 Slowest operations:`, slowest.map(m => `${m.operation}: ${m.duration?.toFixed(0)}ms`));

      return NextResponse.json({ guilds: results });
    } catch (error) {
      console.error('Error in optimized guilds API:', error);
      
      if (error instanceof Error && error.message === 'AUTH_EXPIRED') {
        return NextResponse.json(
          { error: 'Authentication expired', redirectTo: '/signin' },
          { status: 401, headers: { 'X-Redirect-To': '/signin' } }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
};
