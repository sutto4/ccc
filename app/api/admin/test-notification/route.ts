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
    const { message, type, data } = body;

    if (!message || !type) {
      return NextResponse.json({ error: 'Message and type are required' }, { status: 400 });
    }

    // Create test notification for the current user
    const dataToStore = { ...data, timestamp: new Date().toISOString() };
    const dataJson = JSON.stringify(dataToStore);

    const result = await query(
      "INSERT INTO user_notifications (user_id, type, message, data) VALUES (?, ?, ?, ?)",
      [session.user.id, type, message, dataJson]
    );

    return NextResponse.json({
      success: true,
      message: 'Test notification created successfully',
      notificationId: result.insertId
    });

  } catch (error) {
    console.error('Error creating test notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
