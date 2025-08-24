import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId, guildIds, planType } = await request.json();

    if (!subscriptionId || !guildIds || !Array.isArray(guildIds) || guildIds.length === 0) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    // Get subscription limits
    const limitsResult = await query(
      "SELECT max_servers FROM subscription_limits WHERE subscription_id = ?",
      [subscriptionId]
    );

    if (!limitsResult || limitsResult.length === 0) {
      return NextResponse.json({ error: "Subscription plan not found" }, { status: 404 });
    }

    const maxServers = limitsResult[0].max_servers;

    // Validate server count
    if (guildIds.length > maxServers) {
      return NextResponse.json({ 
        error: `Plan allows maximum ${maxServers} servers, but ${guildIds.length} were selected` 
      }, { status: 400 });
    }

    // Check if user owns these guilds
    const guildOwnershipResult = await query(
      "SELECT guild_id FROM guilds WHERE guild_id IN (?) AND user_id = ?",
      [guildIds, session.user.id]
    );

    if (guildOwnershipResult.length !== guildIds.length) {
      return NextResponse.json({ error: "Some selected servers are not accessible" }, { status: 403 });
    }

    // Begin transaction
    await query("START TRANSACTION");

    try {
      // Remove existing allocations for this subscription
      await query(
        "DELETE FROM subscription_allocations WHERE subscription_id = ? AND user_id = ?",
        [subscriptionId, session.user.id]
      );

      // Add new allocations
      for (const guildId of guildIds) {
        await query(
          "INSERT INTO subscription_allocations (user_id, subscription_id, guild_id) VALUES (?, ?, ?)",
          [session.user.id, subscriptionId, guildId]
        );
      }

      // Update guild premium status
      await query(
        "UPDATE guilds SET premium = TRUE, subscription_id = ? WHERE guild_id IN (?)",
        [subscriptionId, guildIds]
      );

      // Update subscription usage count
      await query(
        "UPDATE subscription_limits SET used_servers = ? WHERE subscription_id = ?",
        [guildIds.length, subscriptionId]
      );

      await query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `Successfully allocated subscription to ${guildIds.length} server(s)`,
        allocatedGuilds: guildIds
      });

    } catch (error) {
      await query("ROLLBACK");
      throw error;
    }

  } catch (error) {
    console.error("Subscription allocation error:", error);
    return NextResponse.json({ 
      error: "Failed to allocate subscription",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
    }

    // Get current allocation for this subscription
    const allocationResult = await query(
      "SELECT guild_id FROM subscription_allocations WHERE subscription_id = ? AND user_id = ? AND is_active = TRUE",
      [subscriptionId, session.user.id]
    );

    const allocatedGuildIds = allocationResult.map(row => row.guild_id);

    // Get subscription details
    const subscriptionResult = await query(
      "SELECT plan_type, max_servers, used_servers FROM subscription_limits WHERE subscription_id = ?",
      [subscriptionId]
    );

    if (!subscriptionResult || subscriptionResult.length === 0) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const subscription = subscriptionResult[0];

    return NextResponse.json({
      success: true,
      allocation: {
        subscriptionId,
        planType: subscription.plan_type,
        maxServers: subscription.max_servers,
        usedServers: subscription.used_servers,
        allocatedGuildIds
      }
    });

  } catch (error) {
    console.error("Get allocation error:", error);
    return NextResponse.json({ 
      error: "Failed to get subscription allocation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
