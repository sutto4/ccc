export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
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

      // Check if user's current Discord roles grant access
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

      // Get roles that grant access from database
      const [allowedRoles] = await connection.execute(`
        SELECT role_id FROM server_role_permissions 
        WHERE guild_id = ? AND can_use_app = 1
      `, [guildId]);

      const allowedRoleIds = (allowedRoles as any[]).map((r: any) => r.role_id);

      // Check if user has ANY of the allowed roles RIGHT NOW
      const hasAllowedRole = userRoleIds.some((roleId: string) => allowedRoleIds.includes(roleId));

      if (hasAllowedRole) {
        console.log(`User ${userId} has role-based access to guild ${guildId} via roles: ${userRoleIds.filter((roleId: string) => allowedRoleIds.includes(roleId)).join(', ')}`);
        return true;
      }

      console.log(`User ${userId} has no access to guild ${guildId} - roles: ${userRoleIds.join(', ')}`);
      return false;

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Database or Discord API error checking user access:', error);
    return false; // Fail secure - deny access if anything fails
  }
}

// GET: Fetch subscription data for a guild
export const GET = withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }, auth: any) => {
  try {
    const { id: guildId } = await params;
    const userId = auth?.discordId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    // Check if user has access to this guild
    const hasAccess = await checkUserAccess(guildId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this guild' }, { status: 403 });
    }

    // Fetch subscription data from guilds table
    const connection = await getDbConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          g.stripe_customer_id,
          g.subscription_id,
          g.subscription_status,
          g.current_period_start,
          g.current_period_end,
          g.cancel_at_period_end,
          g.premium,
          g.product_name,
          g.group_id,
          sg.name AS group_name,
          sg.description AS group_description
        FROM guilds g
        LEFT JOIN server_groups sg ON sg.id = g.group_id
        WHERE g.guild_id = ?
      `, [guildId]);

      if ((rows as any[]).length === 0) {
        return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
      }

      const guildData = (rows as any[])[0];
      
      // Map database fields to frontend fields using actual data
      const subscriptionData = {
        status: guildData.subscription_status || 'inactive',
        package: guildData.product_name || 'Free',
        currentPeriodEnd: guildData.current_period_end || null,
        cancelAtPeriodEnd: Boolean(guildData.cancel_at_period_end),
        stripeCustomerId: guildData.stripe_customer_id || null,
        stripeSubscriptionId: guildData.subscription_id || null,
        premium: Boolean(guildData.premium),
        group: guildData.group_id ? {
          id: String(guildData.group_id),
          name: guildData.group_name || '',
          description: guildData.group_description || ''
        } : null
      };

      return NextResponse.json(subscriptionData);

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
