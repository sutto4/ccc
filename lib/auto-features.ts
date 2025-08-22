import { query } from "@/lib/db";

/**
 * Automatically sets up default features for a new guild
 * This function enables all free features by default
 * 
 * @param guildId - The Discord guild ID
 * @returns Promise<{success: boolean, featuresEnabled: number, features: string[]}>
 */
export async function setupDefaultFeaturesForGuild(guildId: string) {
  try {
    console.log(`[AUTO-FEATURES] Setting up default features for guild ${guildId}`);
    
    // Validate guild ID
    if (!/^[0-9]{5,20}$/.test(guildId)) {
      throw new Error("Invalid guild ID format");
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
      throw new Error("Guild not found in database");
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
      console.log(`[AUTO-FEATURES] No free features found for guild ${guildId}`);
      return {
        success: true,
        featuresEnabled: 0,
        features: [],
        message: "No free features to enable"
      };
    }

    console.log(`[AUTO-FEATURES] Found ${features.length} free features to enable for guild ${guildId}`);

    // Insert all free features as enabled
    const insertPromises = features.map(async (feature: any) => {
      try {
        await query(
          `INSERT INTO guild_features (guild_id, feature_name, enabled) 
           VALUES (?, ?, 1) 
           ON DUPLICATE KEY UPDATE enabled = 1, updated_at = CURRENT_TIMESTAMP`,
          [guildId, feature.feature_key]
        );
        console.log(`[AUTO-FEATURES] Enabled feature: ${feature.feature_name} for guild ${guildId}`);
      } catch (error) {
        console.error(`[AUTO-FEATURES] Failed to enable feature ${feature.feature_name} for guild ${guildId}:`, error);
        throw error;
      }
    });

    await Promise.all(insertPromises);

    console.log(`[AUTO-FEATURES] Successfully set up ${features.length} default features for guild ${guildId}`);

    return {
      success: true,
      featuresEnabled: features.length,
      features: features.map((f: any) => f.feature_name),
      message: `Auto-enabled ${features.length} free features`
    };

  } catch (error) {
    console.error(`[AUTO-FEATURES] Error setting up default features for guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Check if a guild has had default features set up
 * 
 * @param guildId - The Discord guild ID
 * @returns Promise<boolean>
 */
export async function hasDefaultFeaturesSetup(guildId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM guild_features WHERE guild_id = ?`,
      [guildId]
    );

    let count = 0;
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      count = result[0][0]?.count || 0;
    } else if (Array.isArray(result) && result.length > 0) {
      count = result[0]?.count || 0;
    }

    return count > 0;
  } catch (error) {
    console.error(`[AUTO-FEATURES] Error checking default features setup for guild ${guildId}:`, error);
    return false;
  }
}
