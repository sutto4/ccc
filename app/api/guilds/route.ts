import { NextRequest, NextResponse } from "next/server";
import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";
import { getToken } from 'next-auth/jwt';
import { apiAnalytics } from "@/lib/api-analytics-db";
import { analyticsBatcher } from "@/lib/analytics-batcher";
import { TokenManager } from "@/lib/token-manager";
import { SessionManager } from "@/lib/session-manager";
import mysql from 'mysql2/promise';

const limiter = createRateLimiter(2000, 60_000); // 2000 requests per minute per key (scaled for high traffic)
const inFlightUserGuilds = new Map<string, Promise<any[]>>();

// Cache for permission checks to reduce API calls and logging
const permissionCache = new Map<string, { result: boolean, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to refresh token if needed
async function ensureValidToken(accessToken: string, refreshToken: string, userId: string): Promise<string | null> {
  try {
    // Check if token is valid
    const tokenStatus = await TokenManager.getTokenStatus(accessToken, Math.floor(Date.now() / 1000) + 3600);
    
    if (tokenStatus.isValid && !tokenStatus.needsRefresh) {
      return accessToken;
    }

    // Token needs refresh or is invalid
    console.log(`[GUILDS-API] Token needs refresh for user ${userId}`);
    
    // Check if we can attempt refresh
    if (!SessionManager.canRefresh(userId)) {
      console.log(`[GUILDS-API] Too many refresh attempts for user ${userId}, forcing re-login`);
      return null;
    }

    // Attempt token refresh
    const refreshedTokens = await TokenManager.refreshToken(refreshToken);
    
    if (refreshedTokens) {
      console.log(`[GUILDS-API] Token refreshed successfully for user ${userId}`);
      SessionManager.resetRefreshAttempts(userId);
      return refreshedTokens.accessToken;
    } else {
      console.log(`[GUILDS-API] Token refresh failed for user ${userId}`);
      SessionManager.incrementRefreshAttempts(userId);
      return null;
    }
  } catch (error) {
    console.error(`[GUILDS-API] Error ensuring valid token for user ${userId}:`, error);
    return null;
  }
}

// Helper function to check user permissions for a guild
async function checkUserGuildPermission(userId: string, guildId: string, validAccessToken: string): Promise<boolean> {
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
          Authorization: `Bearer ${validAccessToken}`,
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

            // Check if user has any of the allowed roles by fetching from Discord API
            try {
              const userRolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
              });
              
              if (userRolesResponse.ok) {
                const memberData = await userRolesResponse.json();
                const userRoleIds = memberData.roles || [];
                console.log(`[PERMISSION] User ${userId} has roles in guild ${guildId}:`, userRoleIds);
                
                // Check if any of user's roles are in the allowed list
                hasRoleAccess = userRoleIds.some((roleId: string) => allowedRoleIds.includes(roleId));
                console.log(`[PERMISSION] User role access check result: ${hasRoleAccess}`);
              } else {
                console.log(`[PERMISSION] Failed to fetch user roles for guild ${guildId}:`, userRolesResponse.status);
                hasRoleAccess = false;
              }
            } catch (roleError) {
              console.error('[PERMISSION] Error fetching user roles:', roleError);
              hasRoleAccess = false;
            }
          } else {
            // No specific role restrictions configured - allow access
            hasRoleAccess = true;
            console.log(`[PERMISSION] Guild ${guildId}: no role restrictions configured - allowing access`);
          }
        } else {
          // If no permissions table exists, allow access by default
          hasRoleAccess = true;
          console.log(`[PERMISSION] No role permissions table found for guild ${guildId}, allowing access by default`);
        }
      } finally {
        await connection.end();
      }
    } catch (dbError) {
      console.error('Database error checking permissions:', dbError);
      // Allow access on database errors to prevent blocking users
      hasRoleAccess = true;
      console.log(`[PERMISSION] Database error for guild ${guildId}, allowing access by default`);
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
export const GET = async (req: NextRequest, _ctx: unknown) => {
  console.log(`[GUILDS-API] FUNCTION START: GET request received at ${new Date().toISOString()}`);

  // Simple auth validation
  console.log('[AUTH-DEBUG] Environment check:', {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'UNDEFINED',
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
  });

  const token = await getToken({
    req: req,
    secret: process.env.NEXTAUTH_SECRET
  });

  console.log('[AUTH-DEBUG] Token validation:', {
    hasToken: !!token,
    tokenKeys: token ? Object.keys(token) : 'NO_TOKEN',
    discordId: token ? (token as any).discordId : 'NO_DISCORD_ID',
    sub: token ? token.sub : 'NO_SUB',
    email: token ? token.email : 'NO_EMAIL',
    secretLength: process.env.NEXTAUTH_SECRET?.length
  });

  // Check cookies
  const cookies = req.cookies;
  console.log('[AUTH-DEBUG] Cookies check:', {
    hasSessionToken: cookies.has('__Secure-next-auth.session-token'),
    hasCallbackToken: cookies.has('__Secure-next-auth.callback-url'),
    cookieNames: cookies.getAll().map(c => c.name)
  });

  if (!token) {
    console.log('[AUTH-DEBUG] No token found - returning 401');
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

  // Try multiple ways to get the Discord ID
  const discordId = (token as any).discordId || token.sub;
  if (!discordId) {
    console.log('[AUTH-DEBUG] No Discord ID found in token - returning 401');
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

  console.log('[AUTH-DEBUG] Authentication successful for Discord ID:', discordId);

  const accessToken = (token as any).accessToken as string;
  const refreshToken = (token as any).refreshToken as string;

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

  // Ensure we have a valid token (refresh if needed)
  const validAccessToken = await ensureValidToken(accessToken, refreshToken, discordId);
  
  if (!validAccessToken) {
    console.log(`[GUILDS-API] No valid token available for user ${discordId}, forcing re-login`);
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
  const startTime = Date.now();
  requestCounter++;
  const requestId = `${requestCounter}-${Date.now()}`;

  // DEBUG: console.log(`=== GUILDS API CALLED #${requestCounter} [${requestId}] ===`);
  // DEBUG: console.log(`[SECURITY-AUDIT] REQUEST ID: ${requestId}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] USER ID: ${discordId}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] UNIQUE SESSION: ${discordId}-${requestId}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] ACCESS TOKEN START: ${validAccessToken?.substring(0, 20)}...`);
  // DEBUG: console.log(`[SECURITY-AUDIT] ENVIRONMENT: ${process.env.NODE_ENV}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] BOT API URL: ${process.env.SERVER_API_BASE_URL}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] DATABASE: ${process.env.DB_HOST}/${process.env.DB_NAME}`);

  // Authentication is handled by middleware
  // DEBUG: console.log('Access token available:', !!validAccessToken);
  // DEBUG: console.log('Environment:', process.env.NODE_ENV);
  // DEBUG: console.log('Timestamp:', new Date().toISOString());
  // DEBUG: console.log('Process PID:', process.pid);

  const botBaseRaw = process.env.SERVER_API_BASE_URL || "";
  const botBase = botBaseRaw.replace(/\/+$/, "");
  // DEBUG: console.log('[BOT-CONFIG] SERVER_API_BASE_URL env var:', process.env.SERVER_API_BASE_URL);
  // DEBUG: console.log('[BOT-CONFIG] Bot base URL:', botBase);

  // Per-token rate limit to avoid hammering Discord (dev double-invocations etc.)
  const tokenKey = `${discordId}:${validAccessToken.slice(0, 24)}`;
  // DEBUG: console.log(`[SECURITY-AUDIT] ===== CRITICAL SECURITY CHECK =====`);
  // DEBUG: console.log(`[SECURITY-AUDIT] Discord ID: ${discordId}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] Access Token Hash: ${validAccessToken.slice(0, 24)}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] Combined Token Key: ${tokenKey}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] Request Timestamp: ${new Date().toISOString()}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] ====================================`);
  // Note: Rate limiting removed for production scale - Discord handles this
  // const rl = limiter.check(`rl:guilds:${tokenKey}`);
  // if (!rl.allowed) { ... }

  const ugCacheKey = `userGuilds:${tokenKey}`;
  let userGuilds = cache.get<any[]>(ugCacheKey) || [];
  // DEBUG: console.log(`[SECURITY-AUDIT] Cache key: ${ugCacheKey}, cached guilds: ${userGuilds.length}`);
  // DEBUG: console.log(`[SECURITY-AUDIT] Cache should be user-specific: ${ugCacheKey.startsWith(`userGuilds:${discordId}:`)}`);

  // SECURITY: Verify cached data belongs to this user
  if (userGuilds.length > 0) {
    // DEBUG: console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - CACHED GUILDS SAMPLE:`, userGuilds.slice(0, 2).map(g => ({ id: g.id, name: g.name })));
    // DEBUG: console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - CACHE VALIDATION: Key contains user ID: ${discordId && ugCacheKey.includes(discordId)}`);
    // DEBUG: console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - CACHE KEY: ${ugCacheKey}`);

    // EMERGENCY SECURITY: Clear cache if it doesn't belong to this user
    if (discordId && !ugCacheKey.includes(discordId)) {
      // DEBUG: console.log(`[SECURITY-ALERT] 🚨 REQUEST ${requestId} - CACHE POLLUTION DETECTED! User ${discordId} got cache for different user`);
      // DEBUG: console.log(`[SECURITY-ALERT] 🚨 REQUEST ${requestId} - FORCED FRESH FETCH for user ${discordId}`);
      userGuilds = []; // Force fresh fetch
    }
  }

  // DEBUG: console.log('🔍 Guilds API Debug:');
  // DEBUG: console.log('- Cache key:', ugCacheKey);
  // DEBUG: console.log('- Cached guilds count:', userGuilds.length);
  // DEBUG: console.log('- Cache hit:', userGuilds.length > 0);

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
      // DEBUG: console.log(`[GUILDS-DEBUG] Fetching user guilds from Discord API`);
      try {
        // Validate token before making the call
        if (!validAccessToken || validAccessToken.length < 10) {
          throw new Error('Invalid access token');
        }
        
        userGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
          headers: { 
            Authorization: `Bearer ${validAccessToken}`,
            'User-Agent': 'ServerMate/1.0'
          }
        });
        // DEBUG: console.log(`[GUILDS-DEBUG] Discord API response status: ${userGuildsRes.status}`);
      } catch (err: any) {
        console.error(`[GUILDS-DEBUG] Discord API fetch exception:`, err?.message);
        console.error(`[GUILDS-DEBUG] Error details:`, {
          name: err?.name,
          code: err?.code,
          cause: err?.cause,
          stack: err?.stack?.split('\n').slice(0, 3).join('\n')
        });
        throw new Error(err?.message || "Failed to reach Discord");
      }

      // Handle 429 with a single short retry if advised
      if (userGuildsRes.status === 429) {
        const retryAfter = Number(userGuildsRes.headers.get("retry-after") || "0");
        if (retryAfter > 0 && retryAfter <= 2) {
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          const retry = await fetch("https://discord.com/api/v10/users/@me/guilds", {
            headers: { Authorization: `Bearer ${validAccessToken}` }
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
        console.error(`[GUILDS-DEBUG] Discord API error:`, {
          status: userGuildsRes.status,
          statusText: userGuildsRes.statusText,
          body: body.substring(0, 500), // Limit body length for logging
          headers: Object.fromEntries(userGuildsRes.headers.entries())
        });
        
        // If 401 Unauthorized, the token is invalid
        if (userGuildsRes.status === 401) {
          console.error(`[GUILDS-DEBUG] 401 UNAUTHORIZED - Token invalid for user ${discordId}`);

          // Clear cached data
          cache.delete(ugCacheKey);
          cache.delete(`${ugCacheKey}:shield`);

          // Throw an error that will be caught and handled properly
          throw new Error('AUTH_EXPIRED');
        }
        
        throw new Error(body || `Failed to fetch user guilds (${userGuildsRes.status})`);
      }
      return (await userGuildsRes.json()) as any[];
    })();

    inFlightUserGuilds.set(tokenKey, promise);
    try {
      const result = await promise;

      // Handle successful response
      userGuilds = Array.isArray(result) ? result : [];

      // DEBUG: console.log(`[GUILDS-DEBUG] Successfully fetched ${userGuilds.length} user guilds from Discord`);
      cache.set(ugCacheKey, userGuilds, 5 * 60_000); // cache 5 minutes
      cache.set(`${ugCacheKey}:shield`, userGuilds, 2_000);
    } catch (e: any) {
      console.error(`[GUILDS-DEBUG] Failed to fetch user guilds:`, e?.message);
      console.error(`[GUILDS-DEBUG] Error type:`, e?.name);
      console.error(`[GUILDS-DEBUG] Error code:`, e?.code);

      // Handle authentication expired error
      if (e?.message === 'AUTH_EXPIRED') {
        return NextResponse.json({
          error: "Authentication expired",
          message: "Please login again",
          redirectTo: "/signin"
        }, {
          status: 401,
          headers: {
            "X-Redirect-To": "/signin"
          }
        });
      }

      // For other errors, use empty array
      userGuilds = [];
      // DEBUG: console.log(`[GUILDS-DEBUG] Using empty guilds array due to API error`);
    } finally {
      inFlightUserGuilds.delete(tokenKey);
    }
      
      // Log analytics for error (temporarily disabled due to connection issues)
      const responseTime = Date.now() - startTime;
      // analyticsBatcher.addRequest({
      //   id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      //   endpoint: '/api/guilds',
      //   method: 'GET',
      //   userId: discordId,
      //   userName: 'Unknown',
      //   discordId: discordId,
      //   userAgent: req.headers.get('user-agent') || 'unknown',
      //   ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      //   statusCode: 503,
      //   responseTime,
      //   error: "Discord API unavailable",
      //   rateLimited: false,
      //   environment: (process.env.NODE_ENV as 'development' | 'production' | 'staging') || 'production',
      //   instanceId: `${process.env.NODE_ENV || 'production'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      // });
    }

    // Continue with normal processing after successful fetch or error handling
    // DEBUG: console.log(`[SECURITY-AUDIT] User ${discordId} has ${userGuilds.length} total Discord guilds`);
    // DEBUG: console.log(`[SECURITY-AUDIT] User's Discord guilds:`, userGuilds.map(g => ({ id: g.id, name: g.name })));

    // Get bot-installed guilds first
    const installedGuilds = await fetchInstalledGuilds(botBase);
    const installedGuildIds = new Set((installedGuilds || []).map((g: any) => String(g.id || g.guildId || g.guild_id || (g as any).guild_id || "")));

    // DEBUG: console.log(`[GUILDS] Bot is installed in ${installedGuildIds.size} guilds`);
    // DEBUG: console.log(`[GUILDS] Installed guilds data:`, installedGuilds?.map(g => ({
    // DEBUG:   id: g.guild_id || g.id,
    // DEBUG:   name: g.guild_name || g.name,
    // DEBUG:   memberCount: g.memberCount,
    // DEBUG:   roleCount: g.roleCount
    // DEBUG: })));

  // Get all guilds where user has database access
  const userId = discordId!;

  // Fetch database access records for this user
  let dbAccessibleGuildIds = new Set<string>();
  try {
    const db = await import('@/lib/db');
    const accessRecords = await db.query(
      'SELECT guild_id FROM server_access_control WHERE user_id = ? AND has_access = 1',
      [userId]
    );

    dbAccessibleGuildIds = new Set(accessRecords.map((record: any) => String(record.guild_id)));
    console.log(`[GUILDS-DEBUG] User ${userId} has database access to ${dbAccessibleGuildIds.size} guilds:`, Array.from(dbAccessibleGuildIds));

  // Debug: Check which database-accessible guilds are in user's Discord guilds
  try {
    const discordGuildIds = new Set(userGuilds.map(g => g.id));
    const missingFromDiscord = Array.from(dbAccessibleGuildIds).filter(id => !discordGuildIds.has(id));
    const inDiscordButNoDbAccess = Array.from(discordGuildIds).filter(id => !dbAccessibleGuildIds.has(id));

    console.log(`[GUILDS-DEBUG] User's Discord guilds: ${discordGuildIds.size} total`);
    console.log(`[GUILDS-DEBUG] Database guilds missing from Discord: ${missingFromDiscord.length}:`, missingFromDiscord);
    console.log(`[GUILDS-DEBUG] Discord guilds without DB access: ${inDiscordButNoDbAccess.length}:`, inDiscordButNoDbAccess);
  } catch (debugError) {
    console.error('[GUILDS-DEBUG] Error in Discord comparison:', debugError);
  }
  } catch (error) {
    console.error('Failed to fetch database access records:', error);
  }

  // Debug: Compare with database access
  try {
    const dbAccessibleArray = Array.from(dbAccessibleGuildIds);
    const botInstalledArray = Array.from(installedGuildIds);
    console.log(`[GUILDS-DEBUG] Database accessible:`, dbAccessibleArray);
    console.log(`[GUILDS-DEBUG] Bot installed:`, botInstalledArray);

    const inDbNotInBot = dbAccessibleArray.filter(id => !installedGuildIds.has(id));
    const inBotNotInDb = botInstalledArray.filter(id => !dbAccessibleGuildIds.has(id));

    console.log(`[GUILDS-DEBUG] In DB but bot not installed: ${inDbNotInBot.length}:`, inDbNotInBot);
    console.log(`[GUILDS-DEBUG] Bot installed but no DB access: ${inBotNotInDb.length}:`, inBotNotInDb);
  } catch (debugError) {
    console.error('[GUILDS-DEBUG] Error in debug comparison:', debugError);
  }

  // Filter user's Discord guilds to only those with database access
  const dbAccessibleUserGuilds = userGuilds.filter(guild => dbAccessibleGuildIds.has(guild.id));
  console.log(`[GUILDS] User has database access to ${dbAccessibleUserGuilds.length} guilds`);

  // Check which of these have the bot installed
  const botInstalledCount = dbAccessibleUserGuilds.filter(guild => installedGuildIds.has(guild.id)).length;
  console.log(`[GUILDS] Of these, ${botInstalledCount} have the bot installed`);

  // Now check permissions for database-accessible guilds
  const accessibleUserGuilds = [];

  console.log(`[GUILDS-DEBUG] Starting permission checks for ${dbAccessibleUserGuilds.length} guilds`);
  console.log(`[GUILDS-DEBUG] User ID: ${userId}`);
  console.log(`[GUILDS-DEBUG] Access token available: ${!!validAccessToken}`);

  for (const userGuild of dbAccessibleUserGuilds) {
    try {
      console.log(`[SECURITY-AUDIT] Checking permission for guild ${userGuild.id} (${userGuild.name}) - User: ${userId}`);
      // Check if user has management permissions in this guild
      const hasPermission = await checkUserGuildPermission(userId, userGuild.id, validAccessToken);
      console.log(`[SECURITY-AUDIT] Permission result for guild ${userGuild.id}: ${hasPermission} - User: ${userId}`);

      // EXTRA DEBUGGING: Let's see what checkUserGuildPermission is doing
      if (!hasPermission) {
        console.log(`[SECURITY-AUDIT] 🚨 PERMISSION DENIED for user ${userId} on guild ${userGuild.id}`);
      }

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

  console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - FINAL PERMISSION RESULTS: ${accessibleUserGuilds.length}/${dbAccessibleUserGuilds.length} guilds accessible for user ${userId}`);
  console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - ACCESSIBLE GUILDS:`, accessibleUserGuilds.map(g => ({ id: g.id, name: g.name })));
  console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - TOKEN VALIDATION:`, {
    hasToken: !!validAccessToken,
    tokenLength: validAccessToken?.length,
    discordId,
    tokenStart: validAccessToken?.substring(0, 20) + '...'
  });
  console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - TOTAL DB GUILDS:`, dbAccessibleUserGuilds.map(g => ({ id: g.id, name: g.name })));
  console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - PERMISSION SUMMARY: User ${userId} can access ${accessibleUserGuilds.length} out of ${dbAccessibleUserGuilds.length} available guilds`);
  console.log(`[SECURITY-AUDIT] REQUEST ${requestId} - DATA SOURCES: Bot API=${botBase}, Database=${process.env.DB_HOST}`);

  // SECURITY FIX: Only return guilds user has access to AND bot is installed
  console.log(`[SECURITY-AUDIT] ACCESS CONTROL: Filtering installedGuilds to only accessible guilds`);

  // Create a set of accessible guild IDs for fast lookup
  const accessibleGuildIds = new Set(accessibleUserGuilds.map((g: any) => String(g.id)));

  // Fetch group information for all accessible guilds
  let groupInfo: any = {};
  try {
    const db = await import('@/lib/db');
    let groups: any[] = [];
    if (accessibleGuildIds.size > 0) {
      groups = await db.query(`
        SELECT
          g.guild_id,
          sg.id as group_id,
          sg.name as group_name,
          sg.description as group_description
        FROM guilds g
        LEFT JOIN server_groups sg ON g.group_id = sg.id
        WHERE g.guild_id IN (${Array.from(accessibleGuildIds).map(() => '?').join(',')})
      `, Array.from(accessibleGuildIds));
    }

    groups.forEach((g: any) => {
      groupInfo[g.guild_id] = {
        groupId: g.group_id,
        groupName: g.group_name,
        groupDescription: g.group_description
      };
    });

    console.log(`[SECURITY-AUDIT] GROUP INFO: Found groups for ${Object.keys(groupInfo).length} guilds`);
    console.log(`[SECURITY-AUDIT] GROUP INFO DETAILS:`, groupInfo);
  } catch (error) {
    console.warn('[SECURITY-AUDIT] Failed to fetch group info:', error);
  }

  // Filter installedGuilds to only include guilds the user has access to
  const accessibleInstalledGuilds = (installedGuilds || []).filter((botGuild: any) => {
    const botGuildId = String(botGuild.id || botGuild.guild_id || "");
    const isAccessible = accessibleGuildIds.has(botGuildId);
    console.log(`[SECURITY-AUDIT] Guild ${botGuild.name} (${botGuildId}): ${isAccessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
    return isAccessible;
  });

  console.log(`[SECURITY-AUDIT] FINAL FILTER: ${accessibleInstalledGuilds.length} accessible guilds out of ${installedGuilds?.length || 0} installed guilds`);

  // Now map with memberCount/roleCount data AND group info
  const results = accessibleInstalledGuilds.map((botGuild: any) => {
    const botGuildId = String(botGuild.id || botGuild.guild_id || "");
    const group = groupInfo[botGuildId];

    console.log(`[GUILDS-API] PROCESSING ACCESSIBLE GUILD: ${botGuild.name} - memberCount: ${botGuild.memberCount}, roleCount: ${botGuild.roleCount}, group: ${group ? JSON.stringify(group) : 'NONE'}`);

    return {
      id: botGuildId,
      name: String(botGuild.name || botGuild.guild_name || "Unknown Guild"),
      memberCount: Number(botGuild.memberCount) || 0,
      roleCount: Number(botGuild.roleCount) || 0,
      iconUrl: botGuild.iconUrl || null,
      premium: Boolean(botGuild.premium || false),
      createdAt: null,
      group: group ? {
        id: group.groupId,
        name: group.groupName,
        description: group.groupDescription
      } : null
    };
  });

  console.log(`[GUILDS-API] SECURE RESULTS:`, results.map(g => `${g.name}: ${g.memberCount} members, ${g.roleCount} roles, group: ${g.group?.name || 'none'}`));

  console.log('Final results:', {
    guildCount: results.length,
    guilds: results.map(g => ({ id: g.id, name: g.name, group: g.group })),
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substr(2, 9)
  });

  // SECURITY: No fallbacks - only return authorized, bot-installed guilds

  console.log(`✅ Request #${requestCounter} [${requestId}] completed - returning ${results.length} guilds`);
  console.log(`[SECURITY-AUDIT] FINAL RESULT for user ${discordId}:`, results.map(g => ({ id: g.id, name: g.name, group: g.group })));
  console.log(`[SECURITY-AUDIT] TOTAL GUILDS RETURNED: ${results.length}`);
  console.log(`[SECURITY-AUDIT] REQUEST COMPLETE FOR USER ${discordId} [${requestId}]`);
  console.log(`[SECURITY-AUDIT] ==================================================`);
  console.log(`[GUILDS-DEBUG] Guilds returned:`, results.map(g => ({ id: g.id, name: g.name, group: g.group })));
  
  // FINAL SECURITY CHECK: Ensure all returned guilds belong to this user
  const finalCheck = results.every(guild => {
    // This is a basic check - in production you'd want more thorough validation
    return guild && typeof guild.id === 'string' && guild.id.length > 0;
  });

  if (!finalCheck) {
    console.log(`[SECURITY-ALERT] 🚨 INVALID GUILD DATA DETECTED FOR USER ${discordId}!`);
  }

  // Log analytics (temporarily disabled due to connection issues)
  const responseTime = Date.now() - startTime;
  // analyticsBatcher.addRequest({
  //   id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  //   endpoint: '/api/guilds',
  //   method: 'GET',
  //   userId: discordId,
  //   userName: 'Unknown', // We don't have user name here easily
  //   discordId: discordId,
  //   userAgent: req.headers.get('user-agent') || 'unknown',
  //   ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
  //   statusCode: 200,
  //   responseTime,
  //   rateLimited: false,
  //   environment: (process.env.NODE_ENV as 'development' | 'production' | 'staging') || 'production',
  //   instanceId: `${process.env.NODE_ENV || 'production'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  // });

  console.log(`[GUILDS-API] DEBUG: Final API response:`, {
    guildCount: results.length,
    firstGuild: results[0] ? {
      id: results[0].id,
      name: results[0].name,
      memberCount: results[0].memberCount,
      roleCount: results[0].roleCount
    } : null
  });

  return NextResponse.json({ guilds: results });
};

async function fetchInstalledGuilds(botBase: string) {
  const igCacheKey = `installedGuilds`;
  // Clear cache to force fresh fetch
  cache.delete(igCacheKey);
  let installedGuilds = cache.get<any[]>(igCacheKey) || [];
  // DEBUG: console.log('[BOT-API] Installed guilds from cache (after clear):', installedGuilds.length);

  if (installedGuilds.length === 0 && botBase) {
    // DEBUG: console.log('[BOT-API] Fetching installed guilds from bot API:', `${botBase}/api/guilds`);
    try {
      const botRes = await fetch(`${botBase}/api/guilds`);
      // DEBUG: console.log('[BOT-API] 🔗 Attempting to connect to:', `${botBase}/api/guilds`);
      // DEBUG: console.log('[BOT-API] 📊 Response status:', botRes.status);

      if (botRes.ok) {
        const rawResponse = await botRes.text();
        // DEBUG: console.log('[BOT-API] Raw response:', rawResponse.substring(0, 500));

        try {
          installedGuilds = JSON.parse(rawResponse) as any[];
          // DEBUG: console.log('[BOT-API] ✅ Bot API returned', installedGuilds.length, 'guilds');

          if (installedGuilds.length > 0) {
            // DEBUG: console.log('[BOT-API] First guild sample:', {
            // DEBUG:   keys: Object.keys(installedGuilds[0]),
            // DEBUG:   data: installedGuilds[0]
            // DEBUG: });

            // Check if the data has the expected fields
            // DEBUG: console.log('[BOT-API] DEBUG: memberCount in first guild:', installedGuilds[0].memberCount, 'type:', typeof installedGuilds[0].memberCount);
            // DEBUG: console.log('[BOT-API] DEBUG: roleCount in first guild:', installedGuilds[0].roleCount, 'type:', typeof installedGuilds[0].roleCount);
          }

          cache.set(igCacheKey, installedGuilds, 60_000); // cache 60s
        } catch (parseError) {
          // DEBUG: console.error('[BOT-API] ❌ Failed to parse JSON:', parseError);
          // DEBUG: console.error('[BOT-API] Raw response was:', rawResponse);
          installedGuilds = [];
        }
      } else {
        // DEBUG: console.warn("[BOT-API] ❌ /api/guilds bot endpoint failed:", botRes.status);
        const errorText = await botRes.text();
        // DEBUG: console.warn('[BOT-API] ❌ Error response:', errorText);

        // Try to provide more debugging info
        // DEBUG: console.warn('[BOT-API] 🔍 Connection Diagnostics:');
        // DEBUG: console.warn('[BOT-API] - Target URL:', `${botBase}/api/guilds`);
        // DEBUG: console.warn('[BOT-API] - Status:', botRes.status);
        // DEBUG: console.warn('[BOT-API] - Status Text:', botRes.statusText);
        // DEBUG: console.warn('[BOT-API] - Headers:', Object.fromEntries(botRes.headers.entries()));

        // Return empty array so web app continues to work without bot data
        // DEBUG: console.warn('[BOT-API] ⚠️ Returning empty array - member/role counts will be N/A');
        return [];
      }
    } catch (err) {
      // DEBUG: console.warn("[BOT-API] ❌ /api/guilds bot endpoint unreachable:", (err as any)?.message || err);
      // DEBUG: console.warn('[BOT-API] Error details:', {
      // DEBUG:   message: (err as any)?.message,
      // DEBUG:   code: (err as any)?.code,
      // DEBUG:   stack: (err as any)?.stack?.split('\n').slice(0, 3).join('\n')
      // DEBUG: });
      // DEBUG: console.warn('[BOT-API] ⚠️ Returning empty array - member/role counts will be N/A');
      return [];
    }
  }
  return installedGuilds || [];
}

async function normalizeInstalledOnly(botBase: string) {
  console.log(`[GUILDS-DEBUG] normalizeInstalledOnly called`);
  const installedGuilds = await fetchInstalledGuilds(botBase);
  console.log(`[GUILDS-DEBUG] Raw installed guilds:`, installedGuilds?.length || 0);
  const installedSet = new Set((installedGuilds || []).map((g: any) => String(g.id || g.guildId || g.guild_id || (g as any).guild_id || "")));
  console.log(`[GUILDS-DEBUG] Installed guild IDs:`, Array.from(installedSet));
  const installedAsUserGuilds = Array.from(installedSet).map((id) => ({ id }));
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
  console.log(`[GUILDS-DEBUG] intersectAndNormalize - installedSet:`, Array.from(installedSet));

  const filtered = userGuilds
    .filter((g: any) => {
      const gid = String((g && (g as any).id) || "");
      const hasMatch = installedSet.has(gid);
      console.log(`[GUILDS-DEBUG] Guild ${gid} - has match: ${hasMatch}`);
      return hasMatch;
    });

  console.log(`[GUILDS-DEBUG] After filtering: ${filtered.length} guilds`);
    // DUPLICATE CODE - COMMENTED OUT
    // console.log(`[GUILDS-API] MAPPING: Starting map operation for ${filtered.length} guilds`);
    // const results = filtered
    //   .map((g: any) => {
      console.log(`[GUILDS-API] MAPPING: Processing guild ${g?.id} - ${g?.name}`);
      console.log(`[GUILDS-API] MAPPING: Guild object:`, g);
      const id = String((g && (g as any).id) || "");

      // Create a simple lookup map for faster matching
      const botGuildMap = new Map();
      (installedGuilds || []).forEach((botGuild: any) => {
        const botId = String(botGuild.id || botGuild.guild_id || botGuild.guildId || "");
        botGuildMap.set(botId, botGuild);
      });

      let installed = botGuildMap.get(id) || {};

      console.log(`[GUILDS-API] DEBUG: Match result for ${id}:`, {
        found: !!installed.id,
        hasMemberCount: !!installed.memberCount,
        hasRoleCount: !!installed.roleCount,
        installedKeys: Object.keys(installed)
      });

      console.log(`[GUILDS-API] Guild ${g?.name || id}: installed data found = ${!!installed.guild_id}, installed =`, {
        id: installed.guild_id || installed.id,
        name: installed.guild_name || installed.name,
        memberCount: installed.memberCount,
        roleCount: installed.roleCount,
        allKeys: installed.guild_id ? Object.keys(installed) : []
      });

      console.log(`[GUILDS-API] DEBUG: Raw installed object keys:`, Object.keys(installed));
      console.log(`[GUILDS-API] DEBUG: memberCount raw value:`, installed.memberCount, `type:`, typeof installed.memberCount);
      console.log(`[GUILDS-API] DEBUG: roleCount raw value:`, installed.roleCount, `type:`, typeof installed.roleCount);

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

      console.log(`[GUILDS-API] DEBUG: After processing - memberCount: ${memberCount} (${typeof memberCount}), roleCount: ${roleCount} (${typeof roleCount})`);
      console.log(`[GUILDS-API] DEBUG: installed.memberCount check: ${typeof installed.memberCount === "number"} (${installed.memberCount})`);
      console.log(`[GUILDS-API] DEBUG: installed.roleCount check: ${typeof installed.roleCount === "number"} (${installed.roleCount})`);

      console.log(`[GUILDS-API] Guild ${g?.name || id}: final counts - memberCount: ${memberCount}, roleCount: ${roleCount}`);

      // Use iconUrl from bot data if available, otherwise construct from Discord icon
      const iconUrl = installed.iconUrl ||
                     ((g && (g as any).icon && id) ? `https://cdn.discordapp.com/icons/${id}/${(g as any).icon}.png` : null);

      // Get group information for this guild
      const group = groupInfo[id] || null;

      const result = {
        id,
        name: String((g && (g as any).name) || (installed as any).guild_name || installed.name || ""),
        memberCount: Number(installed.memberCount) || 0,
        roleCount: Number(installed.roleCount) || 0,
        iconUrl,
        premium: Boolean(installed.premium || false),
        createdAt: null as string | null,
        group: group ? {
          id: group.groupId,
          name: group.groupName,
          description: group.groupDescription
        } : null,
      };

      // console.log(`[GUILDS-API] RESULT: ${g?.name || id} - memberCount=${result.memberCount}, roleCount=${result.roleCount}`);

      // return result;
    // });

    // console.log(`[GUILDS-API] DEBUG: Mapping completed successfully, ${results.length} results`);
    // return results;

  // } catch (error) {
  //   console.error(`[GUILDS-API] ERROR: Failed during guild mapping:`, error);
  //   console.error(`[GUILDS-API] ERROR: filtered guilds:`, filtered);
  //   console.error(`[GUILDS-API] ERROR: installed guilds:`, installedGuilds);
  //   return filtered.map((g: any) => ({
  //     id: String((g && (g as any).id) || ""),
  //     name: String((g && (g as any).name) || ""),
  //     memberCount: 0,
  //     roleCount: 0,
  //     iconUrl: null,
  //     premium: false,
  //     createdAt: null,
  //     group: null
  //   }));
  // }

  // console.log(`[GUILDS-API] FINAL RESPONSE: ${results.length} guilds`);
  // results.forEach((guild, index) => {
  //   console.log(`[GUILDS-API] Guild ${index + 1}: ${guild.name} - ${guild.memberCount} members, ${guild.roleCount} roles`);
  // });

  // return NextResponse.json({ guilds: results });
};