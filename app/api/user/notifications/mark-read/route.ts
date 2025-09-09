import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/db';

export const POST = async (request: NextRequest, _ctx: unknown) => {
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
    const body = await request.json();
    const { notificationIds } = body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    // Mark notifications as read
    const placeholders = notificationIds.map(() => '?').join(',');
    const result = await query(
      `UPDATE user_notifications SET read_at = NOW() WHERE id IN (${placeholders}) AND user_id = ?`,
      [...notificationIds, discordId]
    );

    console.log(`[MARK-READ] Marked ${(result as any).changedRows} notifications as read for user ${discordId}`);
    console.log(`[MARK-READ] Notification IDs:`, notificationIds);

    return NextResponse.json({
      success: true,
      markedRead: (result as any).changedRows
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
