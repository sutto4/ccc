import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET individual guild info for admin
export const GET = async (_req: any, { params }: { params: { id: string } }) => {
  // Check authentication
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  console.log('[ADMIN-GUILDS] Auth context:', { 
    hasAccessToken: !!auth.user.id, 
    hasDiscordId: !!auth.user.id, 
    role: auth.user.role 
  });
  
  // Check if user is admin
  if (auth.user.role !== 'admin' && auth.user.role !== 'owner') {
    console.log('[ADMIN-GUILDS] Access denied for role:', auth.user.role);
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  console.log('[ADMIN-GUILDS] Admin access granted for role:', auth.user.role);

  try {
    const { id: guildId } = await params;
    console.log('[ADMIN-GUILDS] Requested guild ID:', guildId);
    
    if (!/^[0-9]{5,20}$/.test(guildId)) {
      console.log('[ADMIN-GUILDS] Invalid guild ID format:', guildId);
      return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
    }

    // First, check if the guild exists
    console.log('[ADMIN-GUILDS] Checking if guild exists...');
    const guildExistsResult = await query(
      `SELECT COUNT(*) as count FROM guilds WHERE guild_id = ?`,
      [guildId]
    );

    let guildExists = guildExistsResult;
    if (Array.isArray(guildExistsResult) && guildExistsResult.length > 0 && Array.isArray(guildExistsResult[0])) {
      guildExists = guildExistsResult[0];
    }

    if (!guildExists || !Array.isArray(guildExists) || guildExists[0]?.count === 0) {
      console.log('[ADMIN-GUILDS] Guild not found in database:', guildId);
      
      // Let's see what guilds do exist
      const allGuildsResult = await query(
        `SELECT guild_id, guild_name FROM guilds ORDER BY created_at DESC LIMIT 5`
      );
      
      let allGuilds = allGuildsResult;
      if (Array.isArray(allGuildsResult) && allGuildsResult.length > 0 && Array.isArray(allGuildsResult[0])) {
        allGuilds = allGuildsResult[0];
      }
      
      return NextResponse.json({ 
        error: "Guild not found", 
        requestedGuildId: guildId,
        availableGuilds: allGuilds || [],
        message: "The requested guild ID does not exist in the database. Check the available guilds above."
      }, { status: 404 });
    }

    console.log('[ADMIN-GUILDS] Guild found, fetching details...');

    // Get guild info
    const result = await query(
      `SELECT guild_id, guild_name, premium, created_at, updated_at
       FROM guilds 
       WHERE guild_id = ?`,
      [guildId]
    );

    let rows = result;
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      rows = result[0]; // MySQL2 returns [rows, fields] format
    }

    if (!rows || rows.length === 0) {
      console.log('[ADMIN-GUILDS] No guild data returned for ID:', guildId);
      return NextResponse.json({ error: "Guild data not found" }, { status: 404 });
    }

    const guild = rows[0];
    console.log('[ADMIN-GUILDS] Guild data retrieved:', { guildId: guild.guild_id, name: guild.guild_name });
    
    // Get additional guild info from Discord API
    let owner_name = null;
    let member_count = null;
    let guild_icon_url = null;
    
    try {
      const discordBotToken = process.env.DISCORD_BOT_TOKEN;
      if (discordBotToken) {
        // Get guild info from Discord
        const discordResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
          headers: { Authorization: `Bot ${discordBotToken}` }
        });
        
        if (discordResponse.ok) {
          const discordGuild = await discordResponse.json();
          member_count = discordGuild.approximate_member_count;
          guild_icon_url = discordGuild.icon 
            ? `https://cdn.discordapp.com/icons/${guildId}/${discordGuild.icon}.png`
            : "/placeholder-logo.png";
          
          // Get owner info
          if (discordGuild.owner_id) {
            const ownerResponse = await fetch(`https://discord.com/api/v10/users/${discordGuild.owner_id}`, {
              headers: { Authorization: `Bot ${discordBotToken}` }
            });
            if (ownerResponse.ok) {
              const owner = await ownerResponse.json();
              owner_name = owner.global_name || owner.username;
            }
          }
        }
      }
    } catch (error) {
      console.log('[ADMIN-GUILDS] Discord API fetch failed, using fallback values:', error);
    }
    
    // Get guild features
    let features: Record<string, boolean> = {};
    
    try {
      const featuresResult = await query(
        `SELECT gf.feature_key, gf.enabled
         FROM guild_features gf
         WHERE gf.guild_id = ?`,
        [guildId]
      );

      let featureRows = featuresResult;
      if (Array.isArray(featuresResult) && featuresResult.length > 0 && Array.isArray(featuresResult[0])) {
        featureRows = featuresResult[0];
      }

      // Transform features to object keyed by feature_key
      if (Array.isArray(featureRows)) {
        featureRows.forEach((row: any) => {
          features[row.feature_key] = row.enabled === 1 || row.enabled === true;
        });
      }
    } catch (error) {
      console.log('[ADMIN-GUILDS] Guild features table query failed, using empty features:', error);
      features = {};
    }

    console.log('[ADMIN-GUILDS] Successfully returning guild data for:', guildId);

    return NextResponse.json({ 
      guild: {
        ...guild,
        owner_name,
        member_count,
        guild_icon_url,
        features
      }
    });

  } catch (error) {
    console.error('[ADMIN-GUILDS] Error fetching guild info:', error);
    console.error('[ADMIN-GUILDS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: "Failed to fetch guild info",
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
};
