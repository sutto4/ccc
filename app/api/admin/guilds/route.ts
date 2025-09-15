import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { AuthMiddleware } from '@/lib/auth-middleware';

export const GET = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    // Simple query first - get basic guild data with no filters
    const guilds = await query('SELECT * FROM guilds ORDER BY created_at DESC LIMIT 50');

    return NextResponse.json({
      guilds,
      pagination: {
        total: guilds.length,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    });

  } catch (error) {
    console.error('[ADMIN-GUILDS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guilds' },
      { status: 500 }
    );
  }
});