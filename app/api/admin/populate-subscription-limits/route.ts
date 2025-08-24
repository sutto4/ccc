import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { subscriptionId, planType, maxServers } = await request.json();
    
    if (!subscriptionId || !planType || !maxServers) {
      return NextResponse.json({
        success: false,
        error: 'subscriptionId, planType, and maxServers are required'
      }, { status: 400 });
    }
    
    console.log(`Populating subscription limits for ${subscriptionId} with plan ${planType} and max ${maxServers} servers`);
    
    // Check if record already exists
    const existingRecord = await query(
      "SELECT * FROM subscription_limits WHERE subscription_id = ?",
      [subscriptionId]
    );
    
    if (existingRecord && existingRecord.length > 0) {
      // Update existing record
      await query(
        "UPDATE subscription_limits SET plan_type = ?, max_servers = ?, updated_at = CURRENT_TIMESTAMP WHERE subscription_id = ?",
        [planType, maxServers, subscriptionId]
      );
      console.log(`Updated existing subscription limits for ${subscriptionId}`);
    } else {
      // Create new record
      await query(
        "INSERT INTO subscription_limits (subscription_id, plan_type, max_servers, used_servers, created_at, updated_at) VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        [subscriptionId, planType, maxServers]
      );
      console.log(`Created new subscription limits for ${subscriptionId}`);
    }
    
    // Get the current allocation count for this subscription
    const allocationCount = await query(
      "SELECT COUNT(*) as count FROM subscription_allocations WHERE subscription_id = ? AND is_active = 1",
      [subscriptionId]
    );
    
    const currentCount = allocationCount[0]?.count || 0;
    
    // Update the used_servers count
    await query(
      "UPDATE subscription_limits SET used_servers = ? WHERE subscription_id = ?",
      [currentCount, subscriptionId]
    );
    
    console.log(`Updated used_servers to ${currentCount} for subscription ${subscriptionId}`);
    
    return NextResponse.json({
      success: true,
      message: `Subscription limits populated successfully for ${subscriptionId}`,
      planType,
      maxServers,
      usedServers: currentCount
    });
    
  } catch (error) {
    console.error('Failed to populate subscription limits:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
