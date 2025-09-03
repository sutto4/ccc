import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds } = body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    // Mark notifications as read
    const placeholders = notificationIds.map(() => '?').join(',');
    const result = await query(
      `UPDATE user_notifications SET read_at = NOW() WHERE id IN (${placeholders}) AND user_id = ?`,
      [...notificationIds, session.user.id]
    );

    console.log(`[MARK-READ] Marked ${result.changedRows} notifications as read for user ${session.user.id}`);
    console.log(`[MARK-READ] Notification IDs:`, notificationIds);

    return NextResponse.json({
      success: true,
      markedRead: result.changedRows
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
