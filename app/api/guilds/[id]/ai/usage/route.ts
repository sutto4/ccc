import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guildId = (await params).id;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    // Check if guild exists
    const guildRows = await query(
      'SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1',
      [guildId]
    );

    if (!Array.isArray(guildRows) || guildRows.length === 0) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get usage statistics
    const statsRows = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
        COALESCE(AVG(tokens_used), 0) as avg_tokens_per_request,
        COALESCE(AVG(cost_usd), 0) as avg_cost_per_request
      FROM guild_ai_usage 
      WHERE guild_id = ? AND created_at >= ?
    `, [guildId, startDate]);

    const stats = Array.isArray(statsRows) && statsRows.length > 0 ? statsRows[0] as any : {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      successful_requests: 0,
      failed_requests: 0,
      avg_tokens_per_request: 0,
      avg_cost_per_request: 0
    };

    // Get recent usage (last 10 requests)
    const recentRows = await query(`
      SELECT 
        user_id,
        command_type,
        channel_id,
        message_count,
        tokens_used,
        cost_usd,
        success,
        error_message,
        created_at
      FROM guild_ai_usage 
      WHERE guild_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [guildId]);

    const recentUsage = Array.isArray(recentRows) ? recentRows : [];

    return NextResponse.json({
      ...stats,
      recent_usage: recentUsage
    });

  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
