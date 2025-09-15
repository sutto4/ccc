import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { AuthMiddleware } from '@/lib/auth-middleware';

// Simple in-memory cache for permission results
const cache = new Map<string, any>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export const POST = AuthMiddleware.withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  auth: any
) => {

  try {
    const { id: guildId } = await params;
    const body = await request.json();
    const { userId, userRoles } = body;

    // Check cache first to avoid expensive operations
    const cacheKey = `permissions:${guildId}:${userId}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`\x1b[32m[PERMISSION]\x1b[0m Using cached permissions for guild ${guildId}, user ${userId}`);
      return NextResponse.json({
        canUseApp: cached.canUseApp,
        isOwner: cached.isOwner,
        hasRoleAccess: cached.hasRoleAccess,
        userId,
        userRoles: cached.userRoles || userRoles || []
      });
    }

    console.log(`\x1b[31m[PERMISSION]\x1b[0m Checking permissions for guild ${guildId}, user ${userId}`);
    console.log(`\x1b[33m[PERMISSION-DEBUG]\x1b[0m Request body:`, { userId, userRoles });
    console.log(`\x1b[33m[PERMISSION-DEBUG]\x1b[0m Auth object:`, { 
      discordId: auth.discordId, 
      accessToken: auth.accessToken ? 'present' : 'missing' 
    });

    if (!userId || !userRoles) {
      console.log(`\x1b[31m[PERMISSION-ERROR]\x1b[0m Missing required data - userId: ${userId}, userRoles: ${JSON.stringify(userRoles)}`);
      return NextResponse.json({ error: 'Missing userId or userRoles' }, { status: 400 });
    }

    // 1. Check if user has explicit access (bot inviter, etc.)
    const accessRows = await query(
      'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
      [guildId, userId]
    ) as any[];

    if (accessRows.length > 0) {
      console.log(`\x1b[32m[PERMISSION]\x1b[0m User ${userId} has explicit access to guild ${guildId}`);
      const result = {
        canUseApp: true,
        isOwner: false, // We don't know from this table, but they have access
        hasRoleAccess: false, // They have explicit access, not role-based
        timestamp: Date.now(),
        userRoles
      };
      
      cache.set(cacheKey, result);
      return NextResponse.json({
        canUseApp: result.canUseApp,
        isOwner: result.isOwner,
        hasRoleAccess: result.hasRoleAccess,
        userId,
        userRoles
      });
    }

      // 2. Check if user is server owner via Discord API (quick check)
      let isOwner = false;
      try {
        const { accessToken } = auth;
        const guildResponse = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (guildResponse.ok) {
          const userGuilds = await guildResponse.json();
          const userGuild = userGuilds.find((guild: any) => guild.id === guildId);
          isOwner = userGuild?.owner === true;
          
          if (isOwner) {
            console.log(`\x1b[32m[PERMISSION]\x1b[0m User ${userId} is owner of guild ${guildId}`);
            const result = {
              canUseApp: true,
              isOwner: true,
              hasRoleAccess: false,
              timestamp: Date.now(),
              userRoles
            };
            
            cache.set(cacheKey, result);
            return NextResponse.json({
              canUseApp: result.canUseApp,
              isOwner: result.isOwner,
              hasRoleAccess: result.hasRoleAccess,
              userId,
              userRoles
            });
          }
        }
      } catch (discordError) {
        console.log(`\x1b[33m[PERMISSION]\x1b[0m Could not verify ownership via Discord API, continuing with role check`);
      }

    // 3. Check role-based access
    let hasRoleAccess = false;
    
    try {
      // Check if the server_role_permissions table exists
      const tables = await query("SHOW TABLES LIKE 'server_role_permissions'") as any[];
      
      if (tables.length > 0) {
        // Query for role permissions
        const rows = await query(
          'SELECT role_id FROM server_role_permissions WHERE guild_id = ? AND can_use_app = 1',
          [guildId]
        ) as any[];

        const allowedRoleIds = rows.map(row => row.role_id);
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild ${guildId} configured roles for app access:`, allowedRoleIds);
        console.log(`\x1b[31m[PERMISSION]\x1b[0m User ${userId} has roles:`, userRoles);

        hasRoleAccess = userRoles.some((roleId: string) => allowedRoleIds.includes(roleId));
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Role access result: ${hasRoleAccess}`);
      } else {
        // If no permissions table exists, only allow server owner
        hasRoleAccess = false;
        console.log(`[PERMISSION] No role permissions table found for guild ${guildId}, restricting to owner only`);
      }
    } catch (dbError) {
      console.error('Database error checking permissions:', dbError);
      hasRoleAccess = false;
      console.log(`[PERMISSION] Database error for guild ${guildId}, denying access for security`);
    }
      
    const canUseApp = isOwner || hasRoleAccess;

    console.log(`\x1b[31m[PERMISSION]\x1b[0m Final result:`, {
      guildId,
      userId,
      userRoles,
      isOwner,
      hasRoleAccess,
      canUseApp
    });

    const result = {
      canUseApp,
      isOwner,
      hasRoleAccess,
      timestamp: Date.now(),
      userRoles
    };

    // Cache the result for 15 minutes to avoid repeated Discord API calls
    cache.set(cacheKey, result);

    return NextResponse.json({
      canUseApp: result.canUseApp,
      isOwner: result.isOwner,
      hasRoleAccess: result.hasRoleAccess,
      userId,
      userRoles
    });
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});