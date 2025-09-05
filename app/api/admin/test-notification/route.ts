import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  // Test notifications are disabled
  return NextResponse.json({
    error: 'Test notifications are disabled',
    message: 'This endpoint has been disabled as requested'
  }, { status: 403 });
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin users to clean up test notifications
    if (session.role !== 'admin' && session.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Clean up test notifications that contain "Test notification" in the message
    const result = await query(
      "DELETE FROM user_notifications WHERE message LIKE '%Test notification%'"
    );

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.affectedRows} test notifications`,
      deletedCount: result.affectedRows
    });

  } catch (error) {
    console.error('Error cleaning up test notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
