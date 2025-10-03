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

    // Get guild AI usage data
    const [guildRows] = await pool.execute(`
      SELECT 
        g.guild_id,
        g.name as guild_name,
        COALESCE(gac.enabled, 0) as enabled,
        COALESCE(usage_stats.total_requests, 0) as total_requests,
        COALESCE(usage_stats.total_tokens, 0) as total_tokens,
        COALESCE(usage_stats.total_cost, 0) as total_cost,
        usage_stats.last_used
      FROM guilds g
      LEFT JOIN guild_ai_config gac ON g.guild_id = gac.guild_id
      LEFT JOIN (
        SELECT 
          guild_id,
          COUNT(*) as total_requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost_usd) as total_cost,
          MAX(created_at) as last_used
        FROM guild_ai_usage
        GROUP BY guild_id
      ) usage_stats ON g.guild_id = usage_stats.guild_id
      ORDER BY usage_stats.total_requests DESC, g.name ASC
    `);

    const guilds = Array.isArray(guildRows) ? guildRows : [];

    return NextResponse.json(guilds);

  } catch (error) {
    console.error('Error fetching guild AI usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
