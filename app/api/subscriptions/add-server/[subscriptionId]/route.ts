import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = await params;
    const { serverId } = await request.json();

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 });
    }

    // Get subscription details from subscription_limits to check available slots
    const subscriptionResult = await query(
      'SELECT plan_type, max_servers, used_servers FROM subscription_limits WHERE subscription_id = ?',
      [subscriptionId]
    );

    if (!Array.isArray(subscriptionResult) || subscriptionResult.length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const subscription = subscriptionResult[0];
    const maxServers = subscription.max_servers || 1;
    const currentUsed = subscription.used_servers || 0;

    // Check if subscription has available slots
    if (currentUsed >= maxServers) {
      return NextResponse.json({ 
        error: 'Subscription has no available slots' 
      }, { status: 400 });
    }

    // Check if the server is already allocated to this subscription
    const existingAllocation = await query(
      'SELECT * FROM subscription_allocations WHERE subscription_id = ? AND guild_id = ? AND user_id = ?',
      [subscriptionId, serverId, session.user.id]
    );

    if (Array.isArray(existingAllocation) && existingAllocation.length > 0) {
      return NextResponse.json({ 
        error: 'Server is already allocated to this subscription' 
      }, { status: 400 });
    }

    // Check if the server is allocated to another subscription
    const otherAllocation = await query(
      'SELECT * FROM subscription_allocations WHERE guild_id = ? AND is_active = 1',
      [serverId]
    );

    if (Array.isArray(otherAllocation) && otherAllocation.length > 0) {
      return NextResponse.json({ 
        error: 'Server is already allocated to another subscription' 
      }, { status: 400 });
    }

    // Add the server to the subscription
    await query(
      'INSERT INTO subscription_allocations (user_id, subscription_id, guild_id, is_active) VALUES (?, ?, ?, 1)',
      [session.user.id, subscriptionId, serverId]
    );

    // Update the guild status to active if it was 'left'
    await query(
      'UPDATE guilds SET status = "active", updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [serverId]
    );

    // Update subscription usage count
    await query(
      'UPDATE subscription_limits SET used_servers = ? WHERE subscription_id = ?',
      [currentUsed + 1, subscriptionId]
    );

    // Notify the bot to enable premium features for this server
    try {
      const botApiUrl = process.env.BOT_API_URL || 'http://localhost:3001';
      const botApiKey = process.env.BOT_API_KEY;
      
      if (botApiKey) {
        const botResponse = await fetch(`${botApiUrl}/guilds/${serverId}/enable-premium`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${botApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscriptionId,
            planType: subscription.plan_type,
            action: 'server_added'
          })
        });
        
        if (botResponse.ok) {
          console.log(`Bot notified successfully for guild ${serverId}`);
        } else {
          console.log(`Bot notification failed for guild ${serverId}, status: ${botResponse.status}`);
        }
      } else {
        console.log('BOT_API_KEY not configured, skipping bot notification');
      }
    } catch (error) {
      console.log(`Bot notification failed for guild ${serverId}:`, error);
      // Don't fail the entire operation if bot notification fails
    }

    const availableSlots = maxServers - (currentUsed + 1);

    return NextResponse.json({
      success: true,
      message: `Server ${serverId} added to subscription successfully`,
      availableSlots,
      totalAllocated: currentUsed + 1
    });

  } catch (error) {
    console.error('Error adding server to subscription:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
