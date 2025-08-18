import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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

    const { id: guildId } = await params;
    const body = await request.json();
    const { userId, userRoles } = body;

    if (!userId || !userRoles) {
      return NextResponse.json({ error: 'Missing userId or userRoles' }, { status: 400 });
    }

    // Check if user is server owner (simplified check)
    const isOwner = userId === session.user.id;
    
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
          // If no permissions table exists, allow access to all authenticated users
          hasRoleAccess = true;
        }
      } finally {
        await connection.end();
      }
    } catch (dbError) {
      console.error('Database error checking permissions:', dbError);
      // If database fails, allow access to prevent blocking users
      hasRoleAccess = true;
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
