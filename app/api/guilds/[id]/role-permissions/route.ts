import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';

// Database connection helper
async function getDbConnection() {
  console.log('Database config:', {
    host: env.DB_HOST,
    user: env.DB_USER,
    database: env.DB_NAME,
    hasPassword: !!env.DB_PASS
  });
  
  return mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
  });
}

// GET: Fetch current role permissions for a guild
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: guildId } = await params;
    
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
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// PUT: Update role permissions for a guild
export async function PUT(
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
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
