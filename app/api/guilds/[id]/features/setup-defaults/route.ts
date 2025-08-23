import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { query } from "@/lib/db";

// POST setup default features for a guild
export const POST = withAuth(async (_req, { params }, auth) => {
  console.log('[SETUP-DEFAULTS] Setting up default features for guild');
  
  try {
    const { id: guildId } = await params;
    console.log('[SETUP-DEFAULTS] Guild ID:', guildId);
    
    if (!/^[0-9]{5,20}$/.test(guildId)) {
      return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
    }

    // Check if guild exists
    const guildResult = await query(
      `SELECT guild_id FROM guilds WHERE guild_id = ?`,
      [guildId]
    );

    let guild = guildResult;
    if (Array.isArray(guildResult) && guildResult.length > 0 && Array.isArray(guildResult[0])) {
      guild = guildResult[0];
    }

    if (!guild || guild.length === 0) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    // Get all active free features
    const featuresResult = await query(
      `SELECT feature_key, feature_name FROM features 
       WHERE minimum_package = 'free' AND is_active = 1`
    );

    let features = featuresResult;
    if (Array.isArray(featuresResult) && featuresResult.length > 0 && Array.isArray(featuresResult[0])) {
      features = featuresResult[0];
    }

    if (!Array.isArray(features) || features.length === 0) {
      return NextResponse.json({ 
        error: "No free features found",
        message: "No active free features are configured in the system"
      }, { status: 404 });
    }

    console.log(`[SETUP-DEFAULTS] Found ${features.length} free features to enable`);

    // Insert all free features as enabled
    const insertPromises = features.map(async (feature: any) => {
      try {
        await query(
          `INSERT INTO guild_features (guild_id, feature_name, enabled) 
           VALUES (?, ?, 1) 
           ON DUPLICATE KEY UPDATE enabled = 1, updated_at = CURRENT_TIMESTAMP`,
          [guildId, feature.feature_key]
        );
        console.log(`[SETUP-DEFAULTS] Enabled feature: ${feature.feature_name}`);
      } catch (error) {
        console.error(`[SETUP-DEFAULTS] Failed to enable feature ${feature.feature_name}:`, error);
        throw error;
      }
    });

    await Promise.all(insertPromises);

    console.log(`[SETUP-DEFAULTS] Successfully set up ${features.length} default features for guild ${guildId}`);

    return NextResponse.json({ 
      success: true, 
      message: `Default features setup successfully! Enabled ${features.length} free features.`,
      featuresEnabled: features.length,
      features: features.map((f: any) => f.feature_name)
    });

  } catch (error) {
    console.error('[SETUP-DEFAULTS] Error setting up default features:', error);
    return NextResponse.json({ 
      error: "Failed to setup default features",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

