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

    // Get user's notifications
    const notifications = await query(
      'SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [session.user.id]
    );

    // Only log notification count in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[USER-NOTIFICATIONS] Found ${notifications.length} notifications for user ${session.user.id}`);
    }

    return NextResponse.json(notifications);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
