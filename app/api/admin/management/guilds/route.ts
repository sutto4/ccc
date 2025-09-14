import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const guilds = await query(`
      SELECT 
        guild_id,
        guild_name,
        status,
        created_at
      FROM guilds 
      WHERE status = 'active'
      ORDER BY guild_name ASC
    `);

    return NextResponse.json({ guilds });
  } catch (error) {
    console.error('Failed to fetch guilds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guilds' },
      { status: 500 }
    );
  }
}

