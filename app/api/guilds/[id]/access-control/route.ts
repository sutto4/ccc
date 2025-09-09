export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/lib/auth-middleware";
import { env } from "@/lib/env";
import mysql from 'mysql2/promise';

// Database connection helper
async function getDbConnection() {
  return mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
  });
}

// Check if user has admin access to manage access control
async function checkAdminAccess(guildId: string, userId: string): Promise<boolean> {
  try {
    const connection = await getDbConnection();
    try {
      // Check if user has direct admin access (bypass role checks)
      const [adminAccess] = await connection.execute(
        'SELECT 1 FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
        [guildId, userId]
      );

      if ((adminAccess as any[]).length > 0) {
        console.log(`User ${userId} has direct admin access to guild ${guildId}`);
        return true;
      }

      // Check if user's current Discord roles grant admin access
      // ALWAYS validate against Discord API - no fallbacks
      const botToken = env.DISCORD_BOT_TOKEN;
      if (!botToken) {
        console.error('Bot token not configured for role validation');
        return false; // Fail secure - no access without validation
      }

      // Fetch user's current roles from Discord
      const userRolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });

      if (!userRolesResponse.ok) {
        console.log(`User ${userId} not found in guild ${guildId} or bot lacks permissions`);
        return false; // User not in guild or bot can't see them
      }

      const userMember = await userRolesResponse.json();
      const userRoleIds = userMember.roles || [];

      // Get roles that grant admin access from database
      const [allowedRoles] = await connection.execute(`
        SELECT role_id FROM server_role_permissions 
        WHERE guild_id = ? AND can_use_app = 1
      `, [guildId]);

      const allowedRoleIds = (allowedRoles as any[]).map((r: any) => r.role_id);

      // Check if user has ANY of the allowed roles RIGHT NOW
      const hasAllowedRole = userRoleIds.some((roleId: string) => allowedRoleIds.includes(roleId));

      if (hasAllowedRole) {
        console.log(`User ${userId} has role-based admin access to guild ${guildId} via roles: ${userRoleIds.filter((roleId: string) => allowedRoleIds.includes(roleId)).join(', ')}`);
        return true;
      }

      console.log(`User ${userId} has no admin access to guild ${guildId} - roles: ${userRoleIds.join(', ')}`);
      return false;

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Database or Discord API error checking admin access:', error);
    return false; // Fail secure - deny access if anything fails
  }
}

// GET: List all users with access to this guild
export const GET = AuthMiddleware.withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }, auth: any) => {
  const { id: guildId } = await params;
  const userId = auth?.discordId;

  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  // Check if user has admin access to this guild
  const hasAdminAccess = await checkAdminAccess(guildId, userId);
  if (!hasAdminAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const connection = await getDbConnection();
    try {
      // Get all users with direct access
      const [directAccess] = await connection.execute(`
        SELECT user_id, has_access, granted_by, granted_at, notes
        FROM server_access_control 
        WHERE guild_id = ?
        ORDER BY granted_at DESC
      `, [guildId]);

      // Get all roles that grant access
      const [roleAccess] = await connection.execute(`
        SELECT role_id, can_use_app, updated_at
        FROM server_role_permissions 
        WHERE guild_id = ?
        ORDER BY updated_at DESC
      `, [guildId]);

      return NextResponse.json({
        directAccess: directAccess,
        roleAccess: roleAccess
      });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
});

// POST: Grant access to a user
export const POST = AuthMiddleware.withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }, auth: any) => {
  const { id: guildId } = await params;
  const userId = auth?.discordId;

  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  // Check if user has admin access to this guild
  const hasAdminAccess = await checkAdminAccess(guildId, userId);
  if (!hasAdminAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { targetUserId, notes } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID is required" }, { status: 400 });
    }

    const connection = await getDbConnection();
    try {
      // Insert or update user access
      await connection.execute(`
        INSERT INTO server_access_control (guild_id, user_id, has_access, granted_by, notes)
        VALUES (?, ?, 1, ?, ?)
        ON DUPLICATE KEY UPDATE 
          has_access = 1, 
          granted_by = VALUES(granted_by), 
          notes = VALUES(notes),
          granted_at = CURRENT_TIMESTAMP
      `, [guildId, targetUserId, userId, notes || 'Granted by admin']);

      return NextResponse.json({ success: true, message: "Access granted successfully" });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
});

// DELETE: Revoke access from a user
export const DELETE = AuthMiddleware.withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }, auth: any) => {
  const { id: guildId } = await params;
  const userId = auth?.discordId;

  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  // Check if user has admin access to this guild
  const hasAdminAccess = await checkAdminAccess(guildId, userId);
  if (!hasAdminAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID is required" }, { status: 400 });
    }

    const connection = await getDbConnection();
    try {
      // Revoke user access
      await connection.execute(`
        UPDATE server_access_control 
        SET has_access = 0, notes = CONCAT(IFNULL(notes, ''), ' - Access revoked by ', ?)
        WHERE guild_id = ? AND user_id = ?
      `, [userId, guildId, targetUserId]);

      return NextResponse.json({ success: true, message: "Access revoked successfully" });

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
});
