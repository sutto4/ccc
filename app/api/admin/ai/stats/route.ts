import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you might want to implement proper admin check)
    // For now, we'll assume the session user is admin
    // You should implement proper admin role checking here

    // Get global AI statistics
    const [statsRows] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT g.guild_id) as total_guilds,
        COUNT(DISTINCT CASE WHEN gac.enabled = 1 THEN g.guild_id END) as active_guilds,
        COALESCE(SUM(gau.total_requests), 0) as total_requests,
        COALESCE(SUM(gau.total_tokens), 0) as total_tokens,
        COALESCE(SUM(gau.total_cost), 0) as total_cost,
        COALESCE(SUM(gau.successful_requests), 0) as successful_requests,
        COALESCE(SUM(gau.failed_requests), 0) as failed_requests
      FROM guilds g
      LEFT JOIN guild_ai_config gac ON g.guild_id = gac.guild_id
      LEFT JOIN (
        SELECT 
          guild_id,
          COUNT(*) as total_requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost_usd) as total_cost,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests
        FROM guild_ai_usage
        GROUP BY guild_id
      ) gau ON g.guild_id = gau.guild_id
    `);

    const stats = Array.isArray(statsRows) && statsRows.length > 0 ? statsRows[0] as any : {
      total_guilds: 0,
      active_guilds: 0,
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      successful_requests: 0,
      failed_requests: 0
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching AI stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
