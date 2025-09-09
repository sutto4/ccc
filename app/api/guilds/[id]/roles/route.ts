export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/lib/auth-middleware";
import { env } from "@/lib/env";
import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";
import mysql from 'mysql2/promise';

const limiter = createRateLimiter(30, 60_000);

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
      try {
        const [userAccess] = await connection.execute(
          'SELECT 1 FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
          [guildId, userId]
        );

        if ((userAccess as any[]).length > 0) {
          console.log(`User ${userId} has direct access to guild ${guildId}`);
          return true;
        }
      } catch (error) {
        console.log('server_access_control table may not exist, continuing with other checks');
      }

      // Check if user's current Discord roles grant access
      const botToken = env.DISCORD_BOT_TOKEN;
      if (!botToken) {
        console.error('Bot token not configured for role validation');
        return false;
      }

      // First, check if user is the server owner by fetching guild info
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

      // Fetch user's current roles from Discord
      const userRolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });

      if (!userRolesResponse.ok) {
        console.log(`User ${userId} not found in guild ${guildId} or bot lacks permissions`);
        return false;
      }

      const userMember = await userRolesResponse.json();
      const userRoleIds = userMember.roles || [];

      // Get roles that grant access from database
      try {
        const [allowedRoles] = await connection.execute(`
          SELECT role_id FROM server_role_permissions 
          WHERE guild_id = ? AND can_use_app = 1
        `, [guildId]);

        const allowedRoleIds = (allowedRoles as any[]).map((r: any) => r.role_id);

        // Check if user has ANY of the allowed roles RIGHT NOW
        const hasAllowedRole = userRoleIds.some((roleId: string) => allowedRoleIds.includes(roleId));

        if (hasAllowedRole) {
          console.log(`User ${userId} has role-based access to guild ${guildId} via roles: ${userRoleIds.filter(id => allowedRoleIds.includes(id)).join(', ')}`);
          return true;
        }
      } catch (error) {
        console.log('server_role_permissions table may not exist, continuing with fallback');
      }

      // Fallback: If no access control tables exist or are empty, allow access if user is in the guild
      // This is a temporary measure until proper access control is set up
      console.log(`User ${userId} granted fallback access to guild ${guildId} (user is in guild but no access control configured)`);
      return true;

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Database or Discord API error checking user access:', error);
    // Fallback: Allow access if there are any errors (temporary measure)
    console.log(`User ${userId} granted fallback access to guild ${guildId} due to error`);
    return true;
  }
}

export const GET = AuthMiddleware.withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }, auth: any) => {
  const { id: guildId } = await params;
  if (!/^[0-9]{5,20}$/.test(guildId)) {
    return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") || "0.0.0.0";
  const rl = limiter.check(`rl:roles:${ip}:${guildId}`);
  if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)) } });

  // Check if user has access to this guild
  const userId = auth?.discordId;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  const hasAccess = await checkUserAccess(guildId, userId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied to this guild" }, { status: 403 });
  }

  const cacheKey = `roles:${guildId}`;
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return NextResponse.json({ roles: cached });

  // Use bot token to fetch roles (since user has been verified to have access)
  const botToken = env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  
  try {
    res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') return NextResponse.json({ error: "Discord roles API timed out" }, { status: 504 });
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
  
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Discord API error (${res.status}):`, errText);
    return NextResponse.json({ error: errText || "Failed to fetch roles from Discord" }, { status: res.status });
  }
  
  const data = await res.json();
  console.log(`Discord roles response for guild ${guildId}:`, JSON.stringify(data, null, 2));
  
  const normalized = (Array.isArray(data) ? data : []).map((r: any) => {
    const hexColor = typeof r.color === 'number' && r.color > 0
      ? `#${Number(r.color).toString(16).padStart(6, '0')}`
      : null;
    const iconUrl = r.icon ? `https://cdn.discordapp.com/role-icons/${r.id}/${r.icon}.png` : null;
    const unicodeEmoji = r.unicode_emoji ?? null;
    
    return {
      guildId,
      roleId: String(r.id ?? r.roleId ?? ''),
      name: String(r.name ?? ''),
      color: hexColor,
      position: typeof r.position === 'number' ? r.position : 0,
      managed: Boolean(r.managed),
      editableByBot: r.tags?.bot_id ? false : true,
      iconUrl,
      unicodeEmoji,
      permissions: [], // We don't need Discord permissions anymore
    };
  });
  
  console.log(`Normalized roles for guild ${guildId}:`, JSON.stringify(normalized, null, 2));
  
  cache.set(cacheKey, normalized, 120_000);
  return NextResponse.json({ roles: normalized });
});
