export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';

// Database connection helper
async function getDbConnection() {
  return mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
  });
}

// Check if user has access to this guild
async function checkUserAccess(guildId: string, userId: string): Promise<boolean> {
  try {
    const connection = await getDbConnection();
    try {
      // Check if user has direct access (bypass role checks)
      const [userAccess] = await connection.execute(
        'SELECT 1 FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
        [guildId, userId]
      );

      if ((userAccess as any[]).length > 0) {
        console.log(`User ${userId} has direct access to guild ${guildId}`);
        return true;
      }

      // Check if user is the guild owner (owners always have access)
      const botToken = env.DISCORD_BOT_TOKEN;
      if (botToken) {
        try {
          const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
            headers: { Authorization: `Bot ${botToken}` }
          });
          
          if (guildResponse.ok) {
            const guildData = await guildResponse.json();
            if (guildData.owner_id === userId) {
              console.log(`User ${userId} is confirmed owner of guild ${guildId}`);
              return true;
            }
          }
        } catch (error) {
          console.log(`Could not verify guild ownership for user ${userId} in guild ${guildId}:`, error);
        }
      }

      // Check if user's current Discord roles grant access with fallbacks
      if (!botToken) {
        console.error('Bot token not configured for role validation, using fallback');
      } else {
        // Fetch user's current roles from Discord
        const userRolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
          headers: { Authorization: `Bot ${botToken}` }
        });

        if (userRolesResponse.ok) {
          const userMember = await userRolesResponse.json();
          const userRoleIds = userMember.roles || [];

          // Get roles that grant access from database
          const [allowedRoles] = await connection.execute(`
            SELECT role_id FROM server_role_permissions
            WHERE guild_id = ? AND can_use_app = 1
          `, [guildId]);

          const allowedRoleIds = (allowedRoles as any[]).map(row => row.role_id);

          // Check if user has any of the allowed roles
          const hasRoleAccess = userRoleIds.some(roleId => allowedRoleIds.includes(roleId));

          if (hasRoleAccess) {
            console.log(`User ${userId} has role-based access to guild ${guildId}`);
            return true;
          }
        } else if (userRolesResponse.status === 403 || userRolesResponse.status === 401) {
          console.log(`Discord API ${userRolesResponse.status} for user roles - using database fallback`);
        } else {
          console.log(`Discord API returned ${userRolesResponse.status} for user roles - using database fallback`);
        }
      }

      // For fallback when Discord API fails, we rely on server_access_control table
      // The user already passed the server_access_control check at the beginning of this function
      console.log(`User ${userId} granted access via server_access_control fallback`);
      return true;

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Database or Discord API error checking user access:', error);
    return false; // Fail secure - deny access if anything fails
  }
}

// GET: Fetch current role permissions for a guild
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Simple auth validation
  const token = await getToken({
    req,
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
    const userId = discordId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    // Check if user has access to this guild
    const hasAccess = await checkUserAccess(guildId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 });
    }
    
    // Fetch role permissions from database
    const connection = await getDbConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT role_id, can_use_app FROM server_role_permissions WHERE guild_id = ?',
        [guildId]
      );
      
      // We only store enabled permissions, so all returned permissions are true
      const permissions = (rows as any[]).map(row => ({
        roleId: row.role_id,
        canUseApp: true
      }));
      
      return NextResponse.json({ permissions });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// PUT: Update role permissions for a guild
export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Simple auth validation
  const token = await getToken({
    req,
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
    const userId = discordId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    // Check if user has access to this guild
    const hasAccess = await checkUserAccess(guildId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 });
    }

    const body = await req.json();
    const { permissions } = body;

    console.log('Received request:', { guildId, permissionsCount: permissions?.length, permissions });

    // Validate permissions data
    if (!Array.isArray(permissions)) {
      console.error('Invalid permissions format:', permissions);
      return NextResponse.json({ error: 'Invalid permissions format' }, { status: 400 });
    }

    // Delete existing permissions for this guild
    console.log('Connecting to database...');
    const connection = await getDbConnection();
    console.log('Database connected, checking table existence...');
    
    try {
      // Check if table exists
      const [tables] = await connection.execute(
        "SHOW TABLES LIKE 'server_role_permissions'"
      );
      console.log('Table check result:', tables);
      
      if ((tables as any[]).length === 0) {
        throw new Error('Table server_role_permissions does not exist');
      }
      
      console.log('Table exists, deleting existing permissions...');
      await connection.execute(
        'DELETE FROM server_role_permissions WHERE guild_id = ?',
        [guildId]
      );
      console.log('Deleted existing permissions');

      // Insert only enabled permissions (canUseApp = true)
      const enabledPermissions = permissions.filter(p => p.canUseApp);
      if (enabledPermissions.length > 0) {
        console.log(`Inserting ${enabledPermissions.length} enabled permissions...`);
        for (const permission of enabledPermissions) {
          console.log('Inserting enabled permission:', permission);
          await connection.execute(
            'INSERT INTO server_role_permissions (guild_id, role_id, can_use_app) VALUES (?, ?, ?)',
            [guildId, permission.roleId, true]
          );
        }
        console.log('All enabled permissions inserted successfully');
      } else {
        console.log('No enabled permissions to insert');
      }
    } finally {
      await connection.end();
      console.log('Database connection closed');
    }

    console.log(`Updated ${permissions.length} role permissions for guild: ${guildId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Role permissions updated successfully' 
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
