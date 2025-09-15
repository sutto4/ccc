import { NextResponse } from 'next/server';
import { resetPool, getPoolStatus } from '@/lib/db';

export async function POST() {
  try {
    console.log('[RESET-POOL] Starting pool reset...');
    const beforeStatus = getPoolStatus();
    console.log('[RESET-POOL] Before status:', beforeStatus);
    
    await resetPool();
    console.log('[RESET-POOL] Reset completed');
    
    const afterStatus = getPoolStatus();
    console.log('[RESET-POOL] After status:', afterStatus);
    
    return NextResponse.json({
      message: 'Database pool reset successfully',
      before: beforeStatus,
      after: afterStatus
    });
  } catch (error) {
    console.error('[RESET-POOL] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset pool', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
