import { NextResponse } from "next/server";
import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";
import { withAuth } from "@/lib/authz";

const limiter = createRateLimiter(10, 60_000); // 10 requests per minute per key
const inFlightUserGuilds = new Map<string, Promise<any[]>>();

// GET /api/guilds
// Returns guilds the user belongs to, filtered to those where the bot is installed
export const GET = withAuth(async (req: Request, _ctx: unknown, { accessToken }) => {
  console.log('=== GUILDS API CALLED ===');
  console.log('Access token available:', !!accessToken);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('All SERVER_* env vars:', {
    SERVER_API_BASE_URL: process.env.SERVER_API_BASE_URL,
    SERVER_API_URL: process.env.SERVER_API_URL,
    BOT_API_URL: process.env.BOT_API_URL
  });
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
      return NextResponse.json(results, {
        headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)), "X-RateLimit": "cached" },
      });
    }
    const installedOnly = await normalizeInstalledOnly(botBase);
    return NextResponse.json(installedOnly, {
      status: 200,
      headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)), "X-RateLimit": "installed-only" },
    });
  }

  const ugCacheKey = `userGuilds:${tokenKey}`;
  let userGuilds = cache.get<any[]>(ugCacheKey) || [];

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
      try {
        userGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (err: any) {
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
      cache.set(ugCacheKey, userGuilds, 5 * 60_000); // cache 5 minutes
      cache.set(`${ugCacheKey}:shield`, userGuilds, 2_000);
    } catch (e: any) {
      const retryAfter = e?.retryAfter || "5";
      const cached = cache.get<any[]>(ugCacheKey) || [];
      if (cached.length > 0) {
        const results = await intersectAndNormalize(cached, botBase);
        return NextResponse.json(results, { status: 200, headers: { "Retry-After": retryAfter, "X-RateLimit": "cached" } });
      }
      const installedOnly = await normalizeInstalledOnly(botBase);
      return NextResponse.json(installedOnly, {
        status: 200,
        headers: { "Retry-After": retryAfter, "X-RateLimit": "installed-only" },
      });
    } finally {
      inFlightUserGuilds.delete(tokenKey);
    }
  }

  const results = await intersectAndNormalize(userGuilds, botBase);
  console.log('Final results:', { guildCount: results.length, guilds: results.map(g => ({ id: g.id, name: g.name })) });

  // If no guilds found and botBase is configured, also return user guilds for debugging
  if (results.length === 0 && botBase) {
    console.log('No intersecting guilds found, returning all user guilds for debugging');
    console.log('Available user guilds:', userGuilds.map(g => ({ id: g.id, name: g.name })));
    const userGuildsNormalized = userGuilds.map((g: any) => {
      const id = String((g && (g as any).id) || "");
      const icon = (g && (g as any).icon as string | null) || null;
      const iconUrl = icon && id ? `https://cdn.discordapp.com/icons/${id}/${icon}.png` : null;

      return {
        id,
        name: String((g && (g as any).name) || ""),
        memberCount: 0,
        roleCount: 0,
        iconUrl,
        premium: false,
        createdAt: null,
        group: null,
      };
    });
    return NextResponse.json({ guilds: userGuildsNormalized });
  }

  // AGGRESSIVE FALLBACK: If no results in production, return user guilds anyway
  if (results.length === 0 && process.env.NODE_ENV === 'production') {
    console.log('PRODUCTION FALLBACK: No intersecting guilds found, returning user guilds');
    const userGuildsNormalized = userGuilds.map((g: any) => {
      const id = String((g && (g as any).id) || "");
      const icon = (g && (g as any).icon as string | null) || null;
      const iconUrl = icon && id ? `https://cdn.discordapp.com/icons/${id}/${icon}.png` : null;

      return {
        id,
        name: String((g && (g as any).name) || ""),
        memberCount: 0,
        roleCount: 0,
        iconUrl,
        premium: false,
        createdAt: null,
        group: null,
      };
    });
    return NextResponse.json({
      guilds: userGuildsNormalized,
      debug: {
        environment: process.env.NODE_ENV,
        botBaseConfigured: !!botBase,
        userGuildsCount: userGuilds.length,
        fallbackReason: 'production_no_results'
      }
    });
  }

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
  const installedGuilds = await fetchInstalledGuilds(botBase);
  const installedSet = new Set((installedGuilds || []).map((g: any) => String(g.id || g.guildId || g.guild_id || "")));
  const installedAsUserGuilds = [...installedSet].map((id) => ({ id }));
  return intersectAndNormalize(installedAsUserGuilds as any[], botBase);
}

async function intersectAndNormalize(userGuildsParam: any[] | null | undefined, botBase: string) {
  const userGuilds = Array.isArray(userGuildsParam) ? userGuildsParam : [];
  const installedGuilds = await fetchInstalledGuilds(botBase);
  const installedSet = new Set((installedGuilds || []).map((g: any) => String(g.id || g.guildId || g.guild_id || "")));

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

  return userGuilds
    .filter((g: any) => installedSet.has(String((g && (g as any).id) || "")))
    .map((g: any) => {
      const id = String((g && (g as any).id) || "");
      const installed = (installedGuilds || []).find((x: any) => String(x.id || x.guildId || x.guild_id) === id) || {};

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

      const icon = (g && (g as any).icon as string | null) || null;
      const iconUrl = icon && id ? `https://cdn.discordapp.com/icons/${id}/${icon}.png` : null;

      // Get group information for this guild
      const group = groupInfo[id] || null;

      return {
        id,
        name: String((g && (g as any).name) || installed.name || ""),
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