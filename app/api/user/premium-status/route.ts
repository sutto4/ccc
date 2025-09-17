import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest, _ctx: unknown) => {
  // Simple auth validation
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token || !(token as any).discordId) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        message: 'Please login to continue',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }

  const discordId = (token as any).discordId as string;

  if (!discordId) {
    return NextResponse.json(
      {
        error: 'Authentication expired',
        message: 'Please login again',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }

  try {
    // Check if user has any premium guilds
    const premiumGuilds = await query(
      'SELECT COUNT(*) as count FROM guilds WHERE status = "premium" AND guild_id IN (SELECT guild_id FROM server_access_control WHERE user_id = ? AND has_access = 1)',
      [discordId]
    );

    const isPremium = (premiumGuilds as any[])[0]?.count > 0;

    return NextResponse.json({
      isPremium,
      premiumGuildCount: (premiumGuilds as any[])[0]?.count || 0
    });
  } catch (error) {
    console.error('Error checking premium status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
