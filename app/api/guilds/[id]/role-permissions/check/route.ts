import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';

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

  try {
    const { id: guildId } = await params;
    const body = await request.json();
    const { userId, userRoles } = body;

    console.log(`\x1b[31m[PERMISSION]\x1b[0m Checking permissions for guild ${guildId}, user ${userId}, userRoles:`, userRoles);

    if (!userId || !userRoles) {
      return NextResponse.json({ error: 'Missing userId or userRoles' }, { status: 400 });
    }

    console.log(`\x1b[31m[PERMISSION]\x1b[0m Starting Discord API verification for guild ${guildId}`);

    // CRITICAL SECURITY: Verify user actually has access to this guild via Discord API
    let userGuildAccess = false;
    let actualOwnerId = null;

    try {
      console.log(`\x1b[31m[PERMISSION]\x1b[0m Making Discord API call to: https://discord.com/api/v10/guilds/${guildId}`);
      const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API response status: ${guildResponse.status}`);
      console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild API call result - OK: ${guildResponse.ok}`);

      if (guildResponse.ok) {
        const guildData = await guildResponse.json();
        userGuildAccess = true;
        actualOwnerId = guildData.owner_id;
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API success - Guild owner: ${actualOwnerId}`);

        // Get user's actual roles from Discord
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Fetching user roles from Discord API`);
        const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (memberResponse.ok) {
          const memberData = await memberResponse.json();
          const actualUserRoles = memberData.roles || [];
          console.log(`\x1b[31m[PERMISSION]\x1b[0m User's ACTUAL Discord roles:`, actualUserRoles);

          // Override the session roles with actual Discord roles
          userRoles.length = 0; // Clear the array
          userRoles.push(...actualUserRoles); // Add actual roles
          console.log(`\x1b[31m[PERMISSION]\x1b[0m Updated userRoles to actual Discord roles:`, userRoles);
        } else {
          console.log(`\x1b[31m[PERMISSION]\x1b[0m ❌ MEMBER API FAILED: ${memberResponse.status} - Cannot get user's actual roles!`);
          console.log(`\x1b[31m[PERMISSION]\x1b[0m This is why we're using session roles (empty) and falling back to server_access_control`);
          userGuildAccess = false; // Mark as failed so we use fallback
        }
      } else if (guildResponse.status === 401) {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API 401 - Token expired, user needs to re-authenticate`);
        // Don't attempt refresh here - NextAuth JWT callback handles token refresh
        userGuildAccess = false;
      } else if (guildResponse.status === 403) {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API 403 - User not authorized for guild ${guildId}`);
      } else if (guildResponse.status === 404) {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API 404 - Guild ${guildId} not found`);
      } else if (guildResponse.status === 429) {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API 429 - Rate limited`);
      } else {
        console.log(`\x1b[31m[PERMISSION]\x1b[0m Discord API unexpected status: ${guildResponse.status}`);
      }

      if (guildResponse.status === 403 || guildResponse.status === 401) {
        // User doesn't have access to this guild via Discord API
        console.log(`\x1b[31m[PERMISSION]\x1b[0m User ${userId} denied access to guild ${guildId} via Discord API, checking server_access_control fallback`);
        // FALLBACK: Check server_access_control table if Discord API denies access
        try {
          const fallbackConnection = await getDbConnection();
          try {
            const [accessRows] = await fallbackConnection.execute(
              'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
              [guildId, userId]
            );

          if ((accessRows as any[]).length > 0) {
            console.log(`\x1b[31m[PERMISSION]\x1b[0m Guild ${guildId}: user ${userId} has access via server_access_control fallback (Discord API 403)`);
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

    return NextResponse.json({
      canUseApp,
      isOwner,
      hasRoleAccess,
      userId,
      userRoles
    });
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
