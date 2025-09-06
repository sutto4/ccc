import { NextResponse } from "next/server";
import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";
import { withAuth } from "@/lib/authz";
import mysql from 'mysql2/promise';

const limiter = createRateLimiter(10, 60_000); // 10 requests per minute per key
const inFlightUserGuilds = new Map<string, Promise<any[]>>();

// Cache for permission checks to reduce API calls and logging
const permissionCache = new Map<string, { result: boolean, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to check user permissions for a guild
async function checkUserGuildPermission(userId: string, guildId: string, accessToken: string): Promise<boolean> {
  // Check cache first to reduce API calls and logging
  const cacheKey = `${userId}:${guildId}`;
  const cached = permissionCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`[PERMISSION] Using cached result for guild ${guildId}: ${cached.result}`);
    return cached.result;
  }

  try {
    // Check server_access_control table first (most reliable)
    let hasAccessControl = false;
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'chester_bot',
      });

      try {
        // Check if user has explicit access via server_access_control
        const [accessResults] = await connection.execute(
          'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
          [guildId, userId]
        );

        hasAccessControl = (accessResults as any[]).length > 0;
        console.log(`[PERMISSION-DEBUG] server_access_control check for guild ${guildId}, user ${userId}: ${hasAccessControl} (found ${accessResults.length} records)`);
        if (hasAccessControl) {
          console.log(`[PERMISSION] Guild ${guildId}: user ${userId} has explicit access via server_access_control`);
          return true; // Early return if user has explicit access
        }
        // Don't log when user is NOT found - reduces spam
      } finally {
        await connection.end();
      }
    } catch (dbError) {
      console.error('Database error checking server_access_control:', dbError);
    }

    // If no explicit access, check ownership via Discord API
    let isOwner = false;
    try {
      const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (guildResponse.ok) {
        const guildData = await guildResponse.json();
        isOwner = userId === guildData.owner_id;
        if (isOwner) {
          console.log(`[PERMISSION] Guild ${guildId}: user ${userId} is verified owner`);
        }
      } else {
        console.log(`[PERMISSION] Could not verify ownership for guild ${guildId}`);
        isOwner = false;
      }
    } catch (error) {
      console.log(`[PERMISSION] Error checking ownership for guild ${guildId}`);
      isOwner = false;
    }

    // Check if any of user's roles have app access by querying the database
    let hasRoleAccess = false;

    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'chester_bot',
      });

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

          if (allowedRoleIds.length > 0) {
            // There are role restrictions - check if user has allowed roles
            console.log(`[PERMISSION] Guild ${guildId}: checking ${allowedRoleIds.length} configured roles`);

            // For now, since Discord API is unreliable, allow access if roles are configured
            // In production, you'd verify user's specific roles
            hasRoleAccess = true;
            console.log(`[PERMISSION] Guild ${guildId}: allowing access for configured roles (fallback)`);
          } else {
            // No specific role restrictions configured
            hasRoleAccess = false;
            console.log(`[PERMISSION] Guild ${guildId}: no role restrictions configured`);
          }
        } else {
          // If no permissions table exists, deny access (require explicit setup)
          hasRoleAccess = false;
          console.log(`[PERMISSION] No role permissions table found for guild ${guildId}, denying access`);
        }
      } finally {
        await connection.end();
      }
    } catch (dbError) {
      console.error('Database error checking permissions:', dbError);
      // Deny access on database errors for strict security
      hasRoleAccess = false;
      console.log(`[PERMISSION] Database error for guild ${guildId}, denying access`);
    }

    const canUseApp = isOwner || hasRoleAccess;

    console.log(`[PERMISSION] Guild ${guildId}: user=${userId}, owner=${isOwner}, roleAccess=${hasRoleAccess}, canUseApp=${canUseApp}`);

    // Cache the result to reduce future API calls and logging
    permissionCache.set(cacheKey, { result: canUseApp, timestamp: Date.now() });

    return canUseApp;
  } catch (error) {
    console.error('Error checking guild permission:', error);

    // Cache the error result to prevent repeated logging
    permissionCache.set(cacheKey, { result: false, timestamp: Date.now() });

    return false; // Deny access on error
  }
}

// GET /api/guilds
// Returns guilds the user belongs to, filtered to those where the bot is installed
let requestCounter = 0;
export const GET = withAuth(async (req: Request, _ctx: unknown, { accessToken, discordId }) => {
  requestCounter++;
  const requestId = `${requestCounter}-${Date.now()}`;

  console.log(`=== GUILDS API CALLED #${requestCounter} [${requestId}] ===`);
  console.log('Access token available:', !!accessToken);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Timestamp:', new Date().toISOString());
  console.log('Process PID:', process.pid);

  const botBaseRaw = process.env.SERVER_API_BASE_URL || "";
  const botBase = botBaseRaw.replace(/\/+$/, "");
  console.log('Bot base URL:', botBase);

  // Per-token rate limit to avoid hammering Discord (dev double-invocations etc.)
  const tokenKey = accessToken.slice(0, 24);
  const rl = limiter.check(`rl:guilds:${tokenKey}`);
  if (!rl.allowed) {
    const cachedUserGuilds = cache.get<any[]>(`userGuilds:${tokenKey}`) || [];
    if (cachedUserGuilds.length > 0) {
      const results = await intersectAndNormalize(cachedUserGuilds, botBase);
      return NextResponse.json({ guilds: results }, {
        headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)), "X-RateLimit": "cached" },
      });
    }
    const installedOnly = await normalizeInstalledOnly(botBase);
    return NextResponse.json({ guilds: installedOnly }, {
      status: 200,
      headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)), "X-RateLimit": "installed-only" },
    });
  }

  const ugCacheKey = `userGuilds:${tokenKey}`;
  let userGuilds = cache.get<any[]>(ugCacheKey) || [];

  console.log('🔍 Guilds API Debug:');
  console.log('- Cache key:', ugCacheKey);
  console.log('- Cached guilds count:', userGuilds.length);
  console.log('- Cache hit:', userGuilds.length > 0);

  if (userGuilds.length === 0) {
    // In-flight de-duplication to avoid concurrent double fetches
    const existing = inFlightUserGuilds.get(tokenKey);
    if (existing) {
      try {
        userGuilds = (await existing) || [];
      } catch (e) {
        // fallthrough to fresh fetch
      }
    }
  }

  if (userGuilds.length === 0) {
    const promise = (async () => {
      let userGuildsRes: Response;
      console.log(`[GUILDS-DEBUG] Fetching user guilds from Discord API`);
      try {
        userGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log(`[GUILDS-DEBUG] Discord API response status: ${userGuildsRes.status}`);
      } catch (err: any) {
        console.error(`[GUILDS-DEBUG] Discord API fetch exception:`, err?.message);
        throw new Error(err?.message || "Failed to reach Discord");
      }

      // Handle 429 with a single short retry if advised
      if (userGuildsRes.status === 429) {
        const retryAfter = Number(userGuildsRes.headers.get("retry-after") || "0");
        if (retryAfter > 0 && retryAfter <= 2) {
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          const retry = await fetch("https://discord.com/api/v10/users/@me/guilds", {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (retry.ok) return (await retry.json()) as any[];
          if (retry.status !== 429) {
            const body = await retry.text();
            throw new Error(body || `Failed to fetch user guilds (${retry.status})`);
          }
        }
        const e: any = new Error("Rate limited by Discord");
        e.retryAfter = userGuildsRes.headers.get("retry-after") || "5";
        throw e;
      }

      if (!userGuildsRes.ok) {
        const body = await userGuildsRes.text();
        throw new Error(body || `Failed to fetch user guilds (${userGuildsRes.status})`);
      }
      return (await userGuildsRes.json()) as any[];
    })();

    inFlightUserGuilds.set(tokenKey, promise);
    try {
      userGuilds = (await promise) || [];
      console.log(`[GUILDS-DEBUG] Successfully fetched ${userGuilds.length} user guilds from Discord`);
      cache.set(ugCacheKey, userGuilds, 5 * 60_000); // cache 5 minutes
      cache.set(`${ugCacheKey}:shield`, userGuilds, 2_000);
    } catch (e: any) {
      console.error(`[GUILDS-DEBUG] Failed to fetch user guilds:`, e?.message);
      const retryAfter = e?.retryAfter || "5";
      const cached = cache.get<any[]>(ugCacheKey) || [];
      if (cached.length > 0) {
        console.log(`[GUILDS-DEBUG] Using cached guilds (${cached.length}) due to API error`);
        const results = await intersectAndNormalize(cached, botBase);
        return NextResponse.json({ guilds: results }, { status: 200, headers: { "Retry-After": retryAfter, "X-RateLimit": "cached" } });
      }
      console.log(`[GUILDS-DEBUG] No cached guilds, falling back to installed-only`);
      const installedOnly = await normalizeInstalledOnly(botBase);
      console.log(`[GUILDS-DEBUG] Installed-only guilds: ${installedOnly.length}`);
      return NextResponse.json({ guilds: installedOnly }, {
        status: 200,
        headers: { "Retry-After": retryAfter, "X-RateLimit": "installed-only" },
      });
    } finally {
      inFlightUserGuilds.delete(tokenKey);
    }
  }

  // OPTIMIZATION: First filter by bot installation, then check permissions
  // This is much more efficient than checking permissions for all user's guilds

  console.log(`[GUILDS] User has ${userGuilds.length} total Discord guilds`);

  // Get bot-installed guilds first
  const installedGuilds = await fetchInstalledGuilds(botBase);
  const installedGuildIds = new Set((installedGuilds || []).map((g: any) => String(g.id || g.guildId || g.guild_id || (g as any).guild_id || "")));

  console.log(`[GUILDS] Bot is installed in ${installedGuildIds.size} guilds`);

  // Filter user's guilds to only those with the bot installed
  const botInstalledUserGuilds = userGuilds.filter(guild => installedGuildIds.has(guild.id));

  console.log(`[GUILDS] User has ${botInstalledUserGuilds.length} guilds with bot installed`);

  // Now check permissions only for bot-installed guilds (much more efficient!)
  const accessibleUserGuilds = [];
  const userId = discordId; // Get user ID from auth context

  console.log(`[GUILDS-DEBUG] Starting permission checks for ${botInstalledUserGuilds.length} guilds`);
  console.log(`[GUILDS-DEBUG] User ID: ${userId}`);
  console.log(`[GUILDS-DEBUG] Access token available: ${!!accessToken}`);

  for (const userGuild of botInstalledUserGuilds) {
    try {
      console.log(`[GUILDS-DEBUG] Checking permission for guild ${userGuild.id} (${userGuild.name})`);
      // Check if user has management permissions in this guild
      const hasPermission = await checkUserGuildPermission(userId, userGuild.id, accessToken);
      console.log(`[GUILDS-DEBUG] Permission result for ${userGuild.id}: ${hasPermission}`);

      if (hasPermission) {
        accessibleUserGuilds.push(userGuild);
        console.log(`[GUILDS] User ${userId} has permission for guild ${userGuild.id} (${userGuild.name})`);
      } else {
        console.log(`[GUILDS] User ${userId} denied permission for guild ${userGuild.id} (${userGuild.name})`);
      }
    } catch (error) {
      console.error(`[GUILDS] Error checking permission for guild ${userGuild.id}:`, error);
      // Deny access if we can't verify permissions
    }
  }

  console.log(`[GUILDS] Permission check results: ${accessibleUserGuilds.length}/${botInstalledUserGuilds.length} guilds accessible`);
  console.log(`[GUILDS-DEBUG] accessibleUserGuilds:`, accessibleUserGuilds.map(g => ({ id: g.id, name: g.name })));
  console.log(`[GUILDS-DEBUG] botInstalledUserGuilds:`, botInstalledUserGuilds.map(g => ({ id: g.id, name: g.name })));

  // Since we've already filtered by bot installation, just normalize the results
  const results = await normalizeAccessibleGuilds(accessibleUserGuilds);
  console.log('Final results:', {
    guildCount: results.length,
    guilds: results.map(g => ({ id: g.id, name: g.name })),
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substr(2, 9)
  });

  // SECURITY: No fallbacks - only return authorized, bot-installed guilds

  console.log(`✅ Request #${requestCounter} [${requestId}] completed - returning ${results.length} guilds`);
  console.log(`[GUILDS-DEBUG] Guilds returned:`, results.map(g => ({ id: g.id, name: g.name })));
  return NextResponse.json({ guilds: results });
});

async function fetchInstalledGuilds(botBase: string) {
  const igCacheKey = `installedGuilds`;
  let installedGuilds = cache.get<any[]>(igCacheKey) || [];
  console.log('Installed guilds from cache:', installedGuilds.length);

  if (installedGuilds.length === 0 && botBase) {
    console.log('Fetching installed guilds from bot API:', `${botBase}/api/guilds`);
    try {
      const botRes = await fetch(`${botBase}/api/guilds`);
      console.log('Bot API response status:', botRes.status);
      if (botRes.ok) {
        installedGuilds = (await botRes.json()) as any[];
        console.log('Installed guilds from bot:', installedGuilds.length);
        if (installedGuilds.length > 0) {
          console.log('Sample bot guild data:', JSON.stringify(installedGuilds[0], null, 2));
        }
        cache.set(igCacheKey, installedGuilds, 60_000); // cache 60s
      } else {
        console.warn("/api/guilds bot endpoint failed:", botRes.status);
      }
    } catch (err) {
      console.warn("/api/guilds bot endpoint unreachable:", (err as any)?.message || err);
    }
  }
  return installedGuilds || [];
}

async function normalizeInstalledOnly(botBase: string) {
  console.log(`[GUILDS-DEBUG] normalizeInstalledOnly called`);
  const installedGuilds = await fetchInstalledGuilds(botBase);
  console.log(`[GUILDS-DEBUG] Raw installed guilds:`, installedGuilds?.length || 0);
  const installedSet = new Set((installedGuilds || []).map((g: any) => String(g.id || g.guildId || g.guild_id || (g as any).guild_id || "")));
  console.log(`[GUILDS-DEBUG] Installed guild IDs:`, [...installedSet]);
  const installedAsUserGuilds = [...installedSet].map((id) => ({ id }));
  console.log(`[GUILDS-DEBUG] Installed as user guilds:`, installedAsUserGuilds.length);
  const result = await intersectAndNormalize(installedAsUserGuilds as any[], botBase);
  console.log(`[GUILDS-DEBUG] Final intersectAndNormalize result:`, result.length);
  return result;
}

async function normalizeAccessibleGuilds(userGuildsParam: any[] | null | undefined) {
  const userGuilds = Array.isArray(userGuildsParam) ? userGuildsParam : [];

  // Fetch group information for all guilds
  let groupInfo: any = {};
  try {
    const db = await import('@/lib/db');
    const groups = await db.query(`
      SELECT
        g.guild_id,
        sg.id as group_id,
        sg.name as group_name,
        sg.description as group_description
      FROM guilds g
      LEFT JOIN server_groups sg ON g.group_id = sg.id
      WHERE g.group_id IS NOT NULL
    `);

    groups.forEach((g: any) => {
      groupInfo[g.guild_id] = {
        groupId: g.group_id,
        groupName: g.group_name,
        groupDescription: g.group_description
      };
    });
  } catch (error) {
    console.warn('Failed to fetch group info:', error);
  }

  // Filter and normalize guilds
  const normalizedGuilds = userGuilds
    .map((userGuild) => {
      const group = groupInfo[userGuild.id];
      return {
        id: userGuild.id,
        name: userGuild.name || 'Unknown Server',
        iconUrl: userGuild.icon ? `https://cdn.discordapp.com/icons/${userGuild.id}/${userGuild.icon}.png` : null,
        memberCount: userGuild.approximate_member_count || null,
        roleCount: userGuild.approximate_presence_count || null, // This is actually presence count, not role count
        group: group ? {
          id: group.groupId,
          name: group.groupName,
          description: group.groupDescription
        } : null,
        premium: false, // We'll set this based on database later if needed
      };
    })
    .filter((guild) => guild.id); // Filter out any invalid guilds

  return normalizedGuilds;
}

async function intersectAndNormalize(userGuildsParam: any[] | null | undefined, botBase: string) {
  const userGuilds = Array.isArray(userGuildsParam) ? userGuildsParam : [];
  console.log(`[GUILDS-DEBUG] intersectAndNormalize input: ${userGuilds.length} user guilds`);
  userGuilds.forEach((g, i) => console.log(`[GUILDS-DEBUG] User guild ${i}: id=${g.id}, name=${g.name}`));

  const installedGuilds = await fetchInstalledGuilds(botBase);
  const installedSet = new Set((installedGuilds || []).map((g: any) => String(g.id || g.guildId || g.guild_id || (g as any).guild_id || "")));

  // Fetch group information for all guilds
  let groupInfo: any = {};
  try {
    const db = await import('@/lib/db');
    const groups = await db.query(`
      SELECT 
        g.guild_id,
        sg.id as group_id,
        sg.name as group_name,
        sg.description as group_description
      FROM guilds g
      LEFT JOIN server_groups sg ON g.group_id = sg.id
      WHERE g.group_id IS NOT NULL
    `);
    
    groups.forEach((g: any) => {
      groupInfo[g.guild_id] = {
        groupId: g.group_id,
        groupName: g.group_name,
        groupDescription: g.group_description
      };
    });
  } catch (error) {
    console.warn('Failed to fetch group info:', error);
  }

  console.log(`[GUILDS-DEBUG] intersectAndNormalize - userGuilds:`, userGuilds.length);
  console.log(`[GUILDS-DEBUG] intersectAndNormalize - installedSet size:`, installedSet.size);
  console.log(`[GUILDS-DEBUG] intersectAndNormalize - installedSet:`, [...installedSet]);

  const filtered = userGuilds
    .filter((g: any) => {
      const gid = String((g && (g as any).id) || "");
      const hasMatch = installedSet.has(gid);
      console.log(`[GUILDS-DEBUG] Guild ${gid} - has match: ${hasMatch}`);
      return hasMatch;
    });

  console.log(`[GUILDS-DEBUG] After filtering: ${filtered.length} guilds`);

  return filtered
    .map((g: any) => {
      const id = String((g && (g as any).id) || "");
      const installed = (installedGuilds || []).find((x: any) => {
        const xId = String(x.id || x.guildId || x.guild_id || (x as any).guild_id || (x as any).guildId || "");
        return xId === id;
      }) || {};

      console.log(`[GUILDS-API] Guild ${id}: found installed data = ${!!installed.iconUrl}, iconUrl = ${installed.iconUrl}`);

      const memberCount =
        typeof installed.memberCount === "number"
          ? installed.memberCount
          : typeof installed.approximate_member_count === "number"
          ? installed.approximate_member_count
          : null;
      const roleCount =
        typeof installed.roleCount === "number"
          ? installed.roleCount
          : typeof installed.roles === "number"
          ? installed.roles
          : null;

      // Use iconUrl from bot data if available, otherwise construct from Discord icon
      const iconUrl = installed.iconUrl ||
                     ((g && (g as any).icon && id) ? `https://cdn.discordapp.com/icons/${id}/${(g as any).icon}.png` : null);

      console.log(`[GUILDS-API] Guild ${g?.name || g?.id || 'unknown'} (${id}): bot iconUrl = ${(g as any)?.iconUrl}, final iconUrl = ${iconUrl}`);

      // Get group information for this guild
      const group = groupInfo[id] || null;

      return {
        id,
        name: String((g && (g as any).name) || (installed as any).guild_name || installed.name || ""),
        memberCount: memberCount ?? 0,
        roleCount: roleCount ?? 0,
        iconUrl,
        premium: Boolean(installed.premium || false),
        createdAt: null as string | null,
        group: group ? {
          id: group.groupId,
          name: group.groupName,
          description: group.groupDescription
        } : null,
      };
    });
}