import { NextResponse } from 'next/server';
import { resetPool, getPoolStatus } from '@/lib/db';

export async function POST() {
  try {
    const beforeStatus = getPoolStatus();
    await resetPool();
    const afterStatus = getPoolStatus();
    
    return NextResponse.json({
      message: 'Database pool reset successfully',
      before: beforeStatus,
      after: afterStatus
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset pool', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
