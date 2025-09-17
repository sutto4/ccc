import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    // Get table structure
    const columns = await query('DESCRIBE guilds');
    
    // Get a sample row to see actual data
    const sampleRows = await query('SELECT * FROM guilds LIMIT 1');
    
    return NextResponse.json({
      columns,
      sampleRow: sampleRows[0] || null,
      totalRows: await query('SELECT COUNT(*) as count FROM guilds').then(r => r[0]?.count || 0)
    });

  } catch (error) {
    console.error('[DESCRIBE-GUILDS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to describe guilds table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
