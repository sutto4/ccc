import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/authz';
import { cacheGet, cacheSet } from '@/lib/memory-cache';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET - Fetch roles for all servers in a group
export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, auth) => {
  const { id: groupId } = await params;

  try {
    console.log('[Server Roles API] GET request for groupId:', groupId);
    
    // Check cache first
    const cacheKey = `server-roles-${groupId}`;
    const cached = await cacheGet(cacheKey);
    if (cached !== null) {
      console.log('[Server Roles API] Returning cached data:', cached);
      return NextResponse.json({
        success: true,
        serverRoles: cached
      });
    }

    // Get all servers in the group
    const result = await query(`
      SELECT g.guild_id, g.guild_name
      FROM server_group_members sgm
      JOIN guilds g ON sgm.guild_id = g.guild_id
      WHERE sgm.group_id = ?
    `, [groupId]);

    console.log('[Server Roles API] Raw query result:', result);
    console.log('[Server Roles API] Result type:', typeof result);
    console.log('[Server Roles API] Result length:', result.length);
    
    // The result is already an array of servers
    const servers = Array.isArray(result) ? result : [];
    
    console.log('[Server Roles API] Processed servers:', servers);
    console.log('[Server Roles API] Servers length:', servers.length);

    if (!servers.length) {
      console.log('[Server Roles API] No servers found for group');
      return NextResponse.json({
        success: true,
        serverRoles: {}
      });
    }

    // Get roles for all servers in parallel
    const serverRolesPromises = servers.map(async (server: any) => {
      try {
        // Check cache for individual server roles
        const serverCacheKey = `server-roles-${server.guild_id}`;
        const serverCached = await cacheGet(serverCacheKey);
        if (serverCached !== null) {
          return { serverId: server.guild_id, roles: serverCached };
        }

        // Fetch roles directly from Discord API using bot token
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) {
          console.warn(`[Server Roles API] Bot token not configured, skipping roles for server ${server.guild_id}`);
          return { serverId: server.guild_id, roles: [] };
        }

        console.log(`[Server Roles API] Fetching roles for server ${server.guild_id} from Discord API`);
        const response = await fetch(`https://discord.com/api/v10/guilds/${server.guild_id}/roles`, {
          headers: { 
            'Authorization': `Bot ${botToken}` 
          }
        });

        if (!response.ok) {
          console.warn(`[Server Roles API] Failed to fetch roles for server ${server.guild_id}: ${response.status} ${response.statusText}`);
          return { serverId: server.guild_id, roles: [] };
        }

        const discordRoles = await response.json();
        console.log(`[Server Roles API] Discord API returned ${discordRoles.length} roles for server ${server.guild_id}`);
        
        // Format roles to match expected structure
        const roles = (Array.isArray(discordRoles) ? discordRoles : []).map((r: any) => ({
          id: r.id,
          name: r.name,
          color: typeof r.color === 'number' && r.color > 0 
            ? `#${Number(r.color).toString(16).padStart(6, '0')}` 
            : null,
          position: typeof r.position === 'number' ? r.position : 0,
          memberCount: 0 // Discord API doesn't provide member count for roles
        }));
        
        // Cache individual server roles
        await cacheSet(serverCacheKey, roles, CACHE_TTL);

        return { serverId: server.guild_id, roles };
      } catch (error) {
        console.error(`Error fetching roles for server ${server.guild_id}:`, error);
        return { serverId: server.guild_id, roles: [] };
      }
    });

    const serverRolesResults = await Promise.all(serverRolesPromises);

    // Build server roles object
    const serverRoles: Record<string, any[]> = {};
    serverRolesResults.forEach(result => {
      serverRoles[result.serverId] = result.roles;
    });

    console.log('[Server Roles API] Final serverRoles object:', serverRoles);
    console.log('[Server Roles API] ServerRoles keys:', Object.keys(serverRoles));

    // Cache the complete result
    await cacheSet(cacheKey, serverRoles, CACHE_TTL);

    return NextResponse.json({
      success: true,
      serverRoles
    });

  } catch (error) {
    console.error('Error fetching server roles:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch server roles' 
    }, { status: 500 });
  }
}, { requiredPermissions: ['VIEW_SERVER_GROUPS'] });
