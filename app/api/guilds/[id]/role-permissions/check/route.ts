import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token from JWT for Discord API calls
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    const { id: guildId } = await params;
    const body = await request.json();
    const { userId, userRoles } = body;

    if (!userId || !userRoles) {
      return NextResponse.json({ error: 'Missing userId or userRoles' }, { status: 400 });
    }

    // CRITICAL SECURITY: Verify user actually has access to this guild via Discord API
    let userGuildAccess = false;
    let actualOwnerId = null;

    try {
      const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (guildResponse.ok) {
        const guildData = await guildResponse.json();
        userGuildAccess = true;
        actualOwnerId = guildData.owner_id;
      } else if (guildResponse.status === 403) {
        // User doesn't have access to this guild
        console.log(`[PERMISSION] User ${userId} denied access to guild ${guildId}`);
        return NextResponse.json({
          canUseApp: false,
          isOwner: false,
          hasRoleAccess: false,
          userId,
          userRoles
        });
      }
    } catch (discordError) {
      console.error('Failed to verify guild access:', discordError);
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
          hasRoleAccess = userRoles.some((roleId: string) => allowedRoleIds.includes(roleId));
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
    
    const canUseApp = isOwner || hasRoleAccess;

    // Add debugging information
    console.log('Permission check result:', {
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
}
