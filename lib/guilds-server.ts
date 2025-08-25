// lib/guilds-server.ts
// Server-side guild fetching logic that doesn't go through HTTP

import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';

const limiter = createRateLimiter(10, 60_000); // 10 requests per minute per key
const inFlightUserGuilds = new Map<string, Promise<any[]>>();

export type Guild = {
  id: string
  name: string
  memberCount?: number
  roleCount?: number
  iconUrl?: string | null
  premium?: boolean
  createdAt?: string | null
  group?: {
    id: number
    name: string
    description: string | null
  } | null
}

export type Role = {
  guildId: string
  roleId: string
  name: string
  color: string | null
  position?: number
  managed?: boolean
  editableByBot?: boolean
  iconUrl?: string | null
  unicodeEmoji?: string | null
  permissions?: string[]
}

// Direct server-side guild fetching without HTTP layer
export async function getGuildsForUser(accessToken: string): Promise<Guild[]> {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  // Get user ID from the token to ensure complete isolation
  let userId = 'unknown';
  try {
    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userId = userData.id;
    }
  } catch (error) {
    console.error('Failed to get user ID:', error);
  }

  const botBaseRaw = process.env.SERVER_API_BASE_URL || "";
  const botBase = botBaseRaw.replace(/\/+$/, "");

  // Per-token rate limit to avoid hammering Discord
  // Use user ID + token hash to ensure unique per-user caching
  const tokenKey = `user_${userId}_${Buffer.from(accessToken).toString('base64').slice(0, 32)}`;
  const rl = limiter.check(`rl:guilds:${tokenKey}`);
  
  if (!rl.allowed) {
    const cachedUserGuilds = cache.get<any[]>(`userGuilds:${tokenKey}`) || [];
    if (cachedUserGuilds.length > 0) {
      return await intersectAndNormalize(cachedUserGuilds, botBase);
    }
    return await normalizeInstalledOnly(botBase);
  }

  const ugCacheKey = `userGuilds:${tokenKey}`;
  let userGuilds = cache.get<any[]>(ugCacheKey) || [];
  
  // Add user isolation logging
  // console.log('User token key:', tokenKey.substring(0, 20) + '...');
  // console.log('Cache key:', ugCacheKey);

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
    // console.log('Fetching guilds from Discord API...');
    const promise = (async () => {
      let userGuildsRes: Response;
      try {
        userGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        // console.log('Discord API response status:', userGuildsRes.status);
      } catch (err: any) {
        console.error('Discord API fetch error:', err);
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
        console.error('Discord API error response:', body);
        throw new Error(body || `Failed to fetch user guilds (${userGuildsRes.status})`);
      }
             const guilds = await userGuildsRes.json() as any[];
       // console.log('Discord API returned guilds:', guilds.length);
       
       // Log each guild with its permissions for debugging
       // guilds.forEach((guild: any) => {
       //   const perms = BigInt(guild.permissions || '0');
       //   console.log(`  Guild: ${guild.name} (${guild.id}) - Permissions: ${perms.toString()}`);
       // });
       
       return guilds;
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
        return await intersectAndNormalize(cached, botBase);
      }
      return await normalizeInstalledOnly(botBase);
    }
  }

  const result = await intersectAndNormalize(userGuilds, botBase);
  // console.log('Final result from intersectAndNormalize:', result.length, 'guilds');
  
  // CRITICAL: Double-check that we're only returning guilds this user has access to AND can use the app
  const verifiedResult = await Promise.all(
    result.map(async (guild) => {
      const userGuild = userGuilds.find(ug => ug.id === guild.id);
      if (!userGuild) {
        console.error('SECURITY WARNING: Guild', guild.id, 'not in user guilds list');
        return null;
      }
      
      // Check if user can use the app based on database role permissions
      const canUseApp = await checkUserCanUseApp(guild.id, userId, userGuild);
      
      if (!canUseApp) {
        // console.log('Filtering out guild', guild.id, '- user lacks app access permissions');
        return null;
      }
      
      return guild;
    })
  );
  
  const finalResult = verifiedResult.filter(guild => guild !== null) as Guild[];
  // console.log('Database permissions verified result:', finalResult.length, 'guilds');
  return finalResult;
}

// Helper functions (copied from the API route)
async function intersectAndNormalize(userGuilds: any[], botBase: string): Promise<Guild[]> {
  // console.log('intersectAndNormalize called with:', userGuilds.length, 'user guilds, botBase:', botBase);
  
  // Get installed guilds from bot API
  let installedGuilds: any[] = [];
  
  // Try different possible bot API endpoints
  const possibleEndpoints = [
    '/guilds',
    '/api/guilds', 
    '/bot/guilds',
    '/installed-guilds'
  ];
  
  for (const endpoint of possibleEndpoints) {
    try {
      // console.log('Trying bot endpoint:', `${botBase}${endpoint}`);
      const botRes = await fetch(`${botBase}${endpoint}`);
      // console.log('Bot API response status:', botRes.status);
      
      if (botRes.ok) {
        installedGuilds = await botRes.json();
        // console.log('Bot API returned guilds:', installedGuilds.length);
        break; // Found working endpoint
      } else {
        // console.log('Bot API endpoint failed:', endpoint, botRes.status);
      }
    } catch (e) {
      // console.log('Bot API endpoint error:', endpoint, e.message);
    }
  }
  
  if (installedGuilds.length === 0) {
    // console.log('No working bot API endpoints found, using empty installed guilds list');
    
    // Fallback: if no bot API, show all user guilds with basic info
    // console.log('Falling back to showing all user guilds (no bot data)');
    return userGuilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.approximate_member_count || 0,
      roleCount: 0, // Unknown without bot data
      iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null,
      premium: false, // Unknown without bot data
      createdAt: null, // Unknown without bot data
    }));
  }

  const installedGuildIds = new Set(installedGuilds.map((g: any) => g.guild_id || g.id));
  // console.log('Installed guild IDs:', Array.from(installedGuildIds));

  // Process user guilds
  const results: Guild[] = [];
  for (const guild of userGuilds) {
    const isInstalled = installedGuildIds.has(guild.id);
    
    if (isInstalled) {
      const installedData = installedGuilds.find((g: any) => (g.guild_id || g.id) === guild.id);
      results.push({
        id: guild.id,
        name: guild.name,
        memberCount: installedData?.memberCount || guild.approximate_member_count,
        roleCount: installedData?.roleCount || 0,
        iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null,
        premium: installedData?.premium || false,
        createdAt: installedData?.createdAt || null,
        group: null,
      });
    }
  }

  // Enrich with group info from DB and filter out guilds where bot has left
  try {
    if (results.length > 0) {
      const connection = await getDbConnection();
      try {
        const ids = results.map(g => g.id);
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await connection.execute(
          `SELECT g.guild_id, g.group_id, g.status, g.premium, sg.name AS group_name, sg.description AS group_description
           FROM guilds g
           LEFT JOIN server_groups sg ON sg.id = g.group_id
           WHERE g.guild_id IN (${placeholders})`,
          ids
        );
        const byGuildId = new Map<string, { id: number; name: string; description: string | null } | null>();
        const guildStatuses = new Map<string, string>();
        const guildPremium = new Map<string, boolean>();
        
        for (const row of rows as any[]) {
          // Store guild status and premium
          guildStatuses.set(String(row.guild_id), row.status || 'active');
          guildPremium.set(String(row.guild_id), Boolean(row.premium));
          
          if (row.group_id) {
            byGuildId.set(String(row.guild_id), { id: Number(row.group_id), name: row.group_name, description: row.group_description });
          } else {
            byGuildId.set(String(row.guild_id), null);
          }
        }
        
        for (const g of results) {
          g.group = byGuildId.has(g.id) ? (byGuildId.get(g.id) ?? null) : null;
          g.premium = guildPremium.get(g.id) || false;
        }
        
        // Filter out guilds where bot has left
        const activeResults = results.filter(g => {
          const status = guildStatuses.get(g.id) || 'active';
          const isActive = status !== 'left';
          if (!isActive) {
            // console.log(`Filtering out guild ${g.id} (${g.name}) - status: ${status}`);
          }
          return isActive;
        });
        
        // console.log(`Filtered ${results.length - activeResults.length} guilds with 'left' status`);
        return activeResults;
      } finally {
        await connection.end();
      }
    }
  } catch (e) {
    console.error('Failed to enrich guilds with group info:', e);
    // If database fails, return original results (no filtering)
    // console.log('Processed results (DB error):', results.length, 'guilds');
    return results;
  }

  // If we get here without returning from the try block, return original results
  // console.log('Processed results (fallback):', results.length, 'guilds');
  return results;
}

async function normalizeInstalledOnly(botBase: string): Promise<Guild[]> {
  try {
    const botRes = await fetch(`${botBase}/guilds`);
    if (botRes.ok) {
      const installedGuilds = await botRes.json();
      const basic: Guild[] = installedGuilds.map((g: any) => ({
        id: g.guild_id || g.id,
        name: g.guild_name || g.name,
        memberCount: g.memberCount || 0,
        roleCount: g.roleCount || 0,
        iconUrl: g.iconUrl || null,
        premium: g.premium || false,
        createdAt: g.createdAt || null,
        group: null,
      }));

      // Enrich with group info and filter out guilds where bot has left
      try {
        if (basic.length > 0) {
          const connection = await getDbConnection();
          try {
            const ids = basic.map(g => g.id);
            const placeholders = ids.map(() => '?').join(',');
            const [rows] = await connection.execute(
              `SELECT g.guild_id, g.group_id, g.status, g.premium, sg.name AS group_name, sg.description AS group_description
               FROM guilds g
               LEFT JOIN server_groups sg ON sg.id = g.group_id
               WHERE g.guild_id IN (${placeholders})`,
              ids
            );
            const byGuildId = new Map<string, { id: number; name: string; description: string | null } | null>();
            const guildStatuses = new Map<string, string>();
            const guildPremium = new Map<string, boolean>();
            
            for (const row of rows as any[]) {
              // Store guild status and premium
              guildStatuses.set(String(row.guild_id), row.status || 'active');
              guildPremium.set(String(row.guild_id), Boolean(row.premium));
              
              if (row.group_id) {
                byGuildId.set(String(row.guild_id), { id: Number(row.group_id), name: row.group_name, description: row.group_description });
              } else {
                byGuildId.set(String(row.guild_id), null);
              }
            }
            
            for (const g of basic) {
              g.group = byGuildId.has(g.id) ? (byGuildId.get(g.id) ?? null) : null;
              g.premium = guildPremium.get(g.id) || false;
            }
            
            // Filter out guilds where bot has left
            const activeBasic = basic.filter(g => {
              const status = guildStatuses.get(g.id) || 'active';
              const isActive = status !== 'left';
              if (!isActive) {
                // console.log(`Filtering out guild ${g.id} (${g.name}) - status: ${status}`);
              }
              return isActive;
            });
            
            // console.log(`Filtered ${basic.length - activeBasic.length} guilds with 'left' status`);
            return activeBasic;
          } finally {
            await connection.end();
          }
        }
      } catch (e) {
        console.error('Failed to enrich (normalizeInstalledOnly) with group info:', e);
        // If database fails, return original basic results (no filtering)
        return basic;
      }

      // If we get here without returning from the try block, return original results
      return basic;
    }
  } catch (e) {
    console.error("Failed to fetch bot guilds:", e);
  }
  return [];
}

// Direct server-side role fetching without HTTP layer
export async function getRolesForGuild(guildId: string, accessToken: string): Promise<Role[]> {
  // console.log('getRolesForGuild called for guild:', guildId);
  
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  // CRITICAL: First verify this user actually has access to this guild AND can use the app
  try {
    const userGuildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userGuildsResponse.ok) {
      console.error('Failed to verify user guild access:', userGuildsResponse.status);
      return [];
    }

    const userGuilds = await userGuildsResponse.json();
    const userGuild = userGuilds.find((guild: any) => guild.id === guildId);
    
    if (!userGuild) {
      console.error('User does not have access to guild:', guildId);
      return [];
    }

    // Get user ID for permission checking
    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    let userId = 'unknown';
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userId = userData.id;
    }

    // Check if user can use the app based on database role permissions
    const canUseApp = await checkUserCanUseApp(guildId, userId, userGuild);
    
    if (!canUseApp) {
      console.error('User does not have app access permissions for guild:', guildId);
      return [];
    }

    // console.log('User access and app permissions verified for guild:', guildId);
  } catch (error) {
    console.error('Failed to verify user guild access:', error);
    return [];
  }

  try {
    // Now fetch roles using the bot token (since user access is verified)
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { 
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Discord API roles response:', response.status, response.statusText);
      return [];
    }

    const roles = await response.json();
    // console.log('Discord API returned roles:', roles.length);
    
    // Transform Discord roles to our Role type
    return roles.map((role: any) => ({
      guildId,
      roleId: role.id,
      name: role.name,
      color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : null,
      position: role.position,
      managed: role.managed,
      editableByBot: role.managed ? false : true,
      iconUrl: role.icon ? `https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png?size=128` : null,
      unicodeEmoji: role.unicode_emoji || null,
      permissions: role.permissions ? [role.permissions] : []
    }));
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return [];
  }
}

// Database connection helper
async function getDbConnection() {
  return mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
  });
}

// Check if user can use the app based on database role permissions
async function checkUserCanUseApp(guildId: string, userId: string, userGuild: any): Promise<boolean> {
  try {
    // Check if user is server owner (simplified check - you might want to enhance this)
    const isOwner = userGuild.owner === true;
    
    if (isOwner) {
      // console.log(`User ${userId} is owner of guild ${guildId} - allowing access`);
      return true;
    }
    
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
           // console.log(`Allowed role IDs for guild ${guildId}:`, allowedRoleIds);
           
           if (allowedRoleIds.length === 0) {
             // No roles are allowed - deny access
             // console.log(`No roles are allowed for guild ${guildId} - denying access`);
             hasRoleAccess = false;
           } else {
             // Check if user has any of the allowed roles
             // We need to fetch the user's actual roles from Discord
             try {
               const userRolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                 headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
               });
               
               if (userRolesResponse.ok) {
                 const memberData = await userRolesResponse.json();
                 const userRoleIds = memberData.roles || [];
                 // console.log(`User ${userId} has roles in guild ${guildId}:`, userRoleIds);
                 
                 // Check if any of user's roles are in the allowed list
                 hasRoleAccess = userRoleIds.some((roleId: string) => allowedRoleIds.includes(roleId));
                 // console.log(`User role access check result:`, hasRoleAccess);
               } else {
                 // console.log(`Failed to fetch user roles for guild ${guildId}:`, userRolesResponse.status);
                 hasRoleAccess = false;
               }
             } catch (roleError) {
               console.error('Error fetching user roles:', roleError);
               hasRoleAccess = false;
             }
           }
         } else {
          // If no permissions table exists, allow access to all authenticated users
          // console.log(`No server_role_permissions table found for guild ${guildId} - allowing access`);
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
    
    const canUseApp = hasRoleAccess;
    
    // console.log(`Permission check result for guild ${guildId}, user ${userId}:`, {
    //   isOwner,
    //   hasRoleAccess,
    //   canUseApp
    // });
    
    return canUseApp;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    // If anything fails, deny access for security
    return false;
  }
}
