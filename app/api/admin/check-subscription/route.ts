import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');
    
    if (!subscriptionId) {
      return NextResponse.json({
        success: false,
        error: 'subscriptionId query parameter is required'
      }, { status: 400 });
    }
    
    console.log(`Checking subscription ${subscriptionId}...`);
    
    // Check subscription_allocations table
    const allocationsResult = await query(
      "SELECT * FROM subscription_allocations WHERE subscription_id = ?",
      [subscriptionId]
    );
    
    // Check subscription_limits table
    const limitsResult = await query(
      "SELECT * FROM subscription_limits WHERE subscription_id = ?",
      [subscriptionId]
    );
    
    // Check guilds table for this subscription
    const guildsResult = await query(
      "SELECT guild_id, guild_name, premium, subscription_id FROM guilds WHERE subscription_id = ?",
      [subscriptionId]
    );
    
    return NextResponse.json({
      success: true,
      subscriptionId: subscriptionId,
      allocations: allocationsResult,
      limits: limitsResult,
      guilds: guildsResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to check subscription:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
