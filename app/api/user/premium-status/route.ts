import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has any premium guilds
    const premiumGuilds = await query(
      'SELECT COUNT(*) as count FROM guilds WHERE status = "premium" AND guild_id IN (SELECT guild_id FROM server_access_control WHERE user_id = ? AND has_access = 1)',
      [session.user.id]
    );

    const isPremium = premiumGuilds[0]?.count > 0;

    return NextResponse.json({
      isPremium,
      premiumGuildCount: premiumGuilds[0]?.count || 0
    });

  } catch (error) {
    console.error('Error checking premium status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
