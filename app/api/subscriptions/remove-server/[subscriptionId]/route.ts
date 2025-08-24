import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId } = params;
    const { guildId } = await request.json();

    if (!guildId) {
      return NextResponse.json({ error: "Guild ID is required" }, { status: 400 });
    }

    // Verify the user owns this subscription
    const subscriptionCheck = await query(
      "SELECT user_id FROM subscription_allocations WHERE subscription_id = ? AND user_id = ? LIMIT 1",
      [subscriptionId, session.user.id]
    );

    if (!subscriptionCheck || subscriptionCheck.length === 0) {
      return NextResponse.json({ error: "Subscription not found or access denied" }, { status: 403 });
    }

    // Begin transaction
    await query("START TRANSACTION");

    try {
      // Remove the guild from subscription allocations
      await query(
        "UPDATE subscription_allocations SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE subscription_id = ? AND guild_id = ?",
        [subscriptionId, guildId]
      );

      // Update guild premium status
      await query(
        "UPDATE guilds SET premium = FALSE, subscription_id = NULL, subscription_status = NULL, current_period_start = NULL, current_period_end = NULL, cancel_at_period_end = FALSE, premium_expires_at = NULL WHERE guild_id = ?",
        [guildId]
      );

      // Disable premium features for this guild
      const premiumFeatures = await query(
        "SELECT feature_key, feature_name FROM features WHERE minimum_package = 'premium' AND is_active = 1"
      );

      if (Array.isArray(premiumFeatures) && premiumFeatures.length > 0) {
        for (const feature of premiumFeatures) {
          const featureName = feature.feature_key || feature.feature_name;
          await query(
            "INSERT INTO guild_features (guild_id, feature_name, enabled) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE enabled = 0, updated_at = CURRENT_TIMESTAMP",
            [guildId, featureName]
          );
        }
      }

      // Update subscription usage count
      await query(
        "UPDATE subscription_limits SET used_servers = used_servers - 1 WHERE subscription_id = ?",
        [subscriptionId]
      );

      await query("COMMIT");

      // Get updated allocation info
      const updatedAllocation = await query(
        "SELECT used_servers FROM subscription_limits WHERE subscription_id = ?",
        [subscriptionId]
      );

      const availableSlots = updatedAllocation[0]?.used_servers || 0;

      return NextResponse.json({
        success: true,
        message: `Server ${guildId} removed from allocation successfully`,
        availableSlots
      });

    } catch (error) {
      await query("ROLLBACK");
      throw error;
    }

  } catch (error) {
    console.error("Failed to remove server from allocation:", error);
    return NextResponse.json({ 
      error: "Failed to remove server from allocation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
