import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OverviewStats {
  totalServers: number;
  totalUsers: number;
  activeServers: number;
  premiumServers: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  uptime: string;
}

export const GET = async (request: NextRequest) => {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    // Get basic guild stats
    const [guildStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total_servers,
          SUM(CASE WHEN status = 'active' OR status IS NULL THEN 1 ELSE 0 END) as active_servers,
          SUM(CASE WHEN premium = 1 THEN 1 ELSE 0 END) as premium_servers,
          SUM(COALESCE(member_count, 0)) as total_users
        FROM guilds
      `)
    ]);

    const stats = guildStats[0] || {
      total_servers: 0,
      active_servers: 0,
      premium_servers: 0,
      total_users: 0
    };

    // Calculate system health (simple heuristic for now)
    const healthRatio = stats.total_servers > 0 ? stats.active_servers / stats.total_servers : 1;
    let systemHealth: 'healthy' | 'warning' | 'error' = 'healthy';
    
    if (healthRatio < 0.5) {
      systemHealth = 'error';
    } else if (healthRatio < 0.8) {
      systemHealth = 'warning';
    }

    // Calculate uptime (placeholder - in production this would be from monitoring)
    const uptimeHours = Math.floor(process.uptime() / 3600);
    const uptimeDays = Math.floor(uptimeHours / 24);
    const remainingHours = uptimeHours % 24;
    
    let uptime = '';
    if (uptimeDays > 0) {
      uptime = `${uptimeDays}d ${remainingHours}h`;
    } else {
      uptime = `${remainingHours}h`;
    }

    const overviewStats: OverviewStats = {
      totalServers: parseInt(stats.total_servers.toString()),
      totalUsers: parseInt(stats.total_users.toString()),
      activeServers: parseInt(stats.active_servers.toString()),
      premiumServers: parseInt(stats.premium_servers.toString()),
      systemHealth,
      uptime
    };

    return NextResponse.json(overviewStats);

  } catch (error) {
    console.error('[OVERVIEW-STATS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview stats' },
      { status: 500 }
    );
  }
};
