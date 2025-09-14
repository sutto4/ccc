import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';
import { cache } from '@/lib/cache';

// POST: Check if a user has permission to use the app
// Database connection helper
async function getDbConnection() {
  return mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
  });
}

export const POST = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // Simple auth validation
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token || !(token as any).discordId) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        message: 'Please login to continue',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }

  const accessToken = (token as any).accessToken as string;
  const discordId = (token as any).discordId as string;
  let expiresAt = (token as any).expiresAt as number;
  const now = Date.now() / 1000;

  // MIGRATION: Fix old tokens that have incorrect expiration times
  // If the expiration is more than 2 hours in the future, it's likely the old refresh token expiration
  if (expiresAt && (expiresAt - now) > 7200) {
    console.log(`\x1b[33m[PERMISSION]\x1b[0m MIGRATION: Detected old token with incorrect expiration, setting to 1 hour from now`);
    expiresAt = now + 3600; // Set to 1 hour from now
    (token as any).expiresAt = expiresAt;
  }

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`\x1b[31m[PERMISSION]\x1b[0m Token status:`, {
      hasAccessToken: !!accessToken,
      hasDiscordId: !!discordId,
      expiresAt: expiresAt,
      now: now,
      isExpired: expiresAt ? now > expiresAt : false,
      timeUntilExpiry: expiresAt ? expiresAt - now : 'N/A',
      accessTokenLength: accessToken?.length || 0,
      accessTokenStart: accessToken?.substring(0, 20) + '...',
      tokenCreatedAt: (token as any).iat ? new Date((token as any).iat * 1000).toISOString() : 'N/A'
    });
  }

  if (!accessToken || !discordId) {
    return NextResponse.json(
      {
        error: 'Authentication expired',
        message: 'Please login again',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }

  // Check if token is expired
  if (expiresAt && now > expiresAt) {
    console.log(`\x1b[31m[PERMISSION]\x1b[0m Token expired, forcing re-authentication`);
    return NextResponse.json(
      {
        error: 'Token expired',
        message: 'Please login again',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }

  try {
    const { id: guildId } = await params;
    const body = await request.json();
    const { userId, userRoles } = body;

    // Check cache first to avoid expensive Discord API calls
    const cacheKey = `permissions:${guildId}:${userId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`\x1b[32m[PERMISSION]\x1b[0m Using cached permissions for guild ${guildId}, user ${userId}`);
      return NextResponse.json(cached);
    }

    console.log(`\x1b[31m[PERMISSION]\x1b[0m Checking permissions for guild ${guildId}, user ${userId}, userRoles:`, userRoles);

    if (!userId || !userRoles) {
      return NextResponse.json({ error: 'Missing userId or userRoles' }, { status: 400 });
    }

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`\x1b[31m[PERMISSION]\x1b[0m Starting Discord API verification for guild ${guildId}`);
    }

    // CRITICAL SECURITY: Verify user actually has access to this guild via Discord API
    let userGuildAccess = false;
    let actualOwnerId = null;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Making Discord API call to: https://discord.com/api/v10/users/@me/guilds`);
      }
      
      // Add retry logic for rate limiting
      let guildResponse;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        guildResponse = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (guildResponse.status === 429) {
          const retryAfter = guildResponse.headers.get('retry-after');
          const delay = retryAfter ? parseFloat(retryAfter) * 1000 : 1000; // Convert to milliseconds
          if (process.env.NODE_ENV === 'development') {
            console.log(`\x1b[33m[PERMISSION]\x1b[0m Rate limited, waiting ${delay}ms before retry ${retryCount + 1}/${maxRetries}`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
        } else {
          break; // Success or non-rate-limit error
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API response status: ${guildResponse.status}`);
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild API call result - OK: ${guildResponse.ok}`);

        if (!guildResponse.ok) {
          const errorText = await guildResponse.text();
          console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API error response:`, errorText);
          console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API headers:`, Object.fromEntries(guildResponse.headers.entries()));
        }
      }

      if (guildResponse.ok) {
        const userGuilds = await guildResponse.json();
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API success - User is in ${userGuilds.length} guilds`);
        
        // Check if the user is in the specific guild
        const userGuild = userGuilds.find((guild: any) => guild.id === guildId);
        if (userGuild) {
          userGuildAccess = true;
          actualOwnerId = userGuild.owner ? 'true' : 'false';
          console.log(`\x1b[31m[PERMISSION]\x1b[0m User is in guild ${guildId}, owner: ${actualOwnerId}`);

          // Note: We don't fetch user roles from Discord API here because:
          // 1. The /guilds/${guildId}/members/${userId} endpoint requires bot permissions
          // 2. We're using user access tokens, not bot tokens
          // 3. The guilds API already confirms the user is in the guild
          // 4. Role checking is handled by the database fallback system
          console.log(`\x1b[31m[PERMISSION]\x1b[0m User confirmed in guild via Discord API - using session roles for permission check`);
        } else {
          console.log(`\x1b[31m[PERMISSION]\x1b[0m User is not in guild ${guildId} according to Discord API`);
          userGuildAccess = false;
        }
      } else if (guildResponse.status === 401) {
        console.log(`\x1b[33m[PERMISSION]\x1b[0m Discord API 401 - Access token expired (expected, using fallback)`);
        // Don't attempt refresh here - NextAuth JWT callback handles token refresh
        userGuildAccess = false;
      } else if (guildResponse.status === 403) {
        console.log(`\x1b[33m[PERMISSION]\x1b[0m Discord API 403 - User not authorized for guild ${guildId} (using fallback)`);
      } else if (guildResponse.status === 404) {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API 404 - Guild ${guildId} not found`);
      } else if (guildResponse.status === 429) {
        console.log(`\x1b[33m[PERMISSION]\x1b[0m Discord API 429 - Rate limited (after retries)`);
        // Don't treat rate limiting as an error - use fallback
      } else {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API unexpected status: ${guildResponse.status}`);
      }

      if (guildResponse.status === 403 || guildResponse.status === 401 || guildResponse.status === 429) {
        // User doesn't have access to this guild via Discord API or rate limited
        console.log(`\x1b[33m[PERMISSION]\x1b[0m User ${userId} denied access to guild ${guildId} via Discord API (${guildResponse.status}), checking server_access_control fallback`);
        // FALLBACK: Check server_access_control table if Discord API denies access
        try {
          const fallbackConnection = await getDbConnection();
          try {
            const [accessRows] = await fallbackConnection.execute(
              'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
              [guildId, userId]
            );

          if ((accessRows as any[]).length > 0) {
            console.log(`\x1b[32m[PERMISSION]\x1b[0m Guild ${guildId}: user ${userId} has access via server_access_control fallback (Discord API 403)`);
            console.log(`\x1b[32m[PERMISSION]\x1b[0m Found ${accessRows.length} access records for user ${userId} in guild ${guildId}`);
              return NextResponse.json({
                canUseApp: true,
                isOwner: false,
                hasRoleAccess: false,
                userId,
                userRoles
              });
            } else {
              console.log(`\x1b[31m[PERMISSION]\x1b[0m No access records found for user ${userId} in guild ${guildId} - fallback failed`);
            }
          } finally {
            await fallbackConnection.end();
          }
        } catch (dbError) {
          console.error('Database error in fallback check:', dbError);
        }

        return NextResponse.json({
          canUseApp: false,
          isOwner: false,
          hasRoleAccess: false,
          userId,
          userRoles
        });
      }
    } catch (discordError) {
      console.error('\x1b[31m[PERMISSION]\x1b[0m ❌ CRITICAL: Discord API EXCEPTION:', discordError.message);
      console.error('\x1b[31m[PERMISSION]\x1b[0m Exception details:', discordError);
      console.log(`\x1b[31m[PERMISSION]\x1b[0m This is why we're falling back to server_access_control!`);
      // FALLBACK: Check server_access_control table if Discord API fails
      console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API failed for guild ${guildId}, checking server_access_control fallback`);
      try {
        const fallbackConnection = await getDbConnection();
        try {
          const [accessRows] = await fallbackConnection.execute(
            'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
            [guildId, userId]
          );

          if ((accessRows as any[]).length > 0) {
            console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild ${guildId}: user ${userId} has access via server_access_control fallback (Discord API error)`);
            console.log(`\x1b[31m[PERMISSION]\x1b[0m Found ${accessRows.length} access records for user ${userId} in guild ${guildId}`);
            return NextResponse.json({
              canUseApp: true,
              isOwner: false,
              hasRoleAccess: false,
              userId,
              userRoles
            });
          } else {
            console.log(`\x1b[31m[PERMISSION]\x1b[0m No access records found for user ${userId} in guild ${guildId} - fallback failed`);
          }
        } finally {
          await fallbackConnection.end();
        }
      } catch (dbError) {
        console.error('Database error in fallback check:', dbError);
      }

      return NextResponse.json({
        canUseApp: false,
        isOwner: false,
        hasRoleAccess: false,
        userId,
        userRoles
      });
    }

    // If Discord API confirmed user is in guild, check both database access AND current Discord roles
    if (userGuildAccess) {
      console.log(`\x1b[33m[PERMISSION]\x1b[0m Discord API confirmed user is in guild, checking server_access_control for explicit access`);
      
      // First check if user has explicit database access
      let hasExplicitAccess = false;
      try {
        const fallbackConnection = await getDbConnection();
        try {
          const [accessRows] = await fallbackConnection.execute(
            'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
            [guildId, userId]
          );

          if ((accessRows as any[]).length > 0) {
            hasExplicitAccess = true;
            console.log(`\x1b[32m[PERMISSION]\x1b[0m Guild ${guildId}: user ${userId} has explicit database access`);
            console.log(`\x1b[32m[PERMISSION]\x1b[0m Found ${accessRows.length} access records for user ${userId} in guild ${guildId}`);
          } else {
            console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild ${guildId}: user ${userId} is in guild but has NO explicit database access`);
          }
        } finally {
          await fallbackConnection.end();
        }
      } catch (fallbackError) {
        console.error(`\x1b[31m[PERMISSION]\x1b[0m Database error checking explicit access:`, fallbackError);
      }

      // If user has explicit access, still verify they have the required Discord roles
      if (hasExplicitAccess) {
        console.log(`\x1b[33m[PERMISSION]\x1b[0m User has explicit database access, now verifying current Discord roles...`);
        
        // Get user's current Discord roles (we need to fetch this from Discord API)
        try {
          const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
            headers: {
              Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          if (memberResponse.ok) {
            const memberData = await memberResponse.json();
            const currentDiscordRoles = memberData.roles || [];
            console.log(`\x1b[31m[PERMISSION]\x1b[0m User's current Discord roles:`, currentDiscordRoles);

            // Check which roles have app access
            const connection = await getDbConnection();
            try {
              const [roleRows] = await connection.execute(
                'SELECT role_id FROM server_role_permissions WHERE guild_id = ? AND can_use_app = 1',
                [guildId]
              );

              const allowedRoleIds = (roleRows as any[]).map(row => row.role_id);
              console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild ${guildId} roles with app access:`, allowedRoleIds);

              // Check if user has any of the required roles
              const hasRequiredRole = currentDiscordRoles.some((roleId: string) => allowedRoleIds.includes(roleId));
              
              if (hasRequiredRole) {
                console.log(`\x1b[32m[PERMISSION]\x1b[0m User has required Discord role for app access`);
                return NextResponse.json({
                  canUseApp: true,
                  isOwner: actualOwnerId === 'true',
                  hasRoleAccess: true,
                  userId,
                  userRoles: currentDiscordRoles
                });
              } else {
                console.log(`\x1b[31m[PERMISSION]\x1b[0m User has explicit database access but NO required Discord roles`);
                console.log(`\x1b[31m[PERMISSION]\x1b[0m User roles: ${currentDiscordRoles.join(', ')}`);
                console.log(`\x1b[31m[PERMISSION]\x1b[0m Required roles: ${allowedRoleIds.join(', ')}`);
                return NextResponse.json({
                  canUseApp: false,
                  isOwner: actualOwnerId === 'true',
                  hasRoleAccess: false,
                  userId,
                  userRoles: currentDiscordRoles
                });
              }
            } finally {
              await connection.end();
            }
          } else {
            console.log(`\x1b[31m[PERMISSION]\x1b[0m Failed to fetch user's Discord roles: ${memberResponse.status}`);
            // If we can't get Discord roles, deny access for security
            return NextResponse.json({
              canUseApp: false,
              isOwner: actualOwnerId === 'true',
              hasRoleAccess: false,
              userId,
              userRoles: []
            });
          }
        } catch (discordError) {
          console.error(`\x1b[31m[PERMISSION]\x1b[0m Error fetching Discord roles:`, discordError);
          // If we can't verify Discord roles, deny access for security
          return NextResponse.json({
            canUseApp: false,
            isOwner: actualOwnerId === 'true',
            hasRoleAccess: false,
            userId,
            userRoles: []
          });
        }
      }
    }

    // Check if user is the actual server owner
    const isOwner = userId === actualOwnerId;
    
    // Check if any of user's roles have app access by querying the database
    let hasRoleAccess = false;
    
    try {
      const connection = await getDbConnection();
      try {
        // Check if the server_role_permissions table exists
        const [tables] = await connection.execute(
          "SHOW TABLES LIKE 'server_role_permissions'"
        );
        
        if ((tables as any[]).length > 0) {
          // Query for role permissions
          const [rows] = await connection.execute(
            'SELECT role_id FROM server_role_permissions WHERE guild_id = ? AND can_use_app = 1',
            [guildId]
          );

          const allowedRoleIds = (rows as any[]).map(row => row.role_id);
          console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild ${guildId} configured roles for app access:`, allowedRoleIds);
          console.log(`\x1b[31m[PERMISSION]\x1b[0m User ${userId} has roles:`, userRoles);

          hasRoleAccess = userRoles.some((roleId: string) => allowedRoleIds.includes(roleId));
          console.log(`\x1b[31m[PERMISSION]\x1b[0m Role access result: ${hasRoleAccess}`);
        } else {
          // If no permissions table exists, only allow server owner
          hasRoleAccess = false;
          console.log(`[PERMISSION] No role permissions table found for guild ${guildId}, restricting to owner only`);
        }
      } finally {
        await connection.end();
      }
    } catch (dbError) {
      console.error('Database error checking permissions:', dbError);
      // SECURITY: If database fails, deny access to prevent unauthorized access
      hasRoleAccess = false;
      console.log(`[PERMISSION] Database error for guild ${guildId}, denying access for security`);
    }
    
    let canUseApp = isOwner || hasRoleAccess;

    // Only use server_access_control fallback if Discord API failed (not when it succeeded but user lacks roles)
    if (!canUseApp && !userGuildAccess) {
      console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API failed, checking server_access_control fallback`);
      try {
        const fallbackConnection = await getDbConnection();
        try {
          const [accessRows] = await fallbackConnection.execute(
            'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
            [guildId, userId]
          );

          if ((accessRows as any[]).length > 0) {
            console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild ${guildId}: user ${userId} granted access via server_access_control fallback (Discord API failed)`);
            canUseApp = true;
          } else {
            console.log(`\x1b[31m[PERMISSION]\x1b[0m No server_access_control records found for user ${userId} in guild ${guildId}`);
          }
        } finally {
          await fallbackConnection.end();
        }
      } catch (dbError) {
        console.error('Database error in fallback check:', dbError);
      }
    } else if (!canUseApp && userGuildAccess) {
      console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API succeeded but user lacks proper roles - NO fallback access granted`);
      console.log(`\x1b[31m[PERMISSION]\x1b[0m User should be granted proper Discord roles or removed from server_access_control`);
    }

    // Add debugging information
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
      userId,
      userRoles
    };

    // Cache the result for 2 minutes to avoid repeated Discord API calls
    cache.set(cacheKey, result, 120_000);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
