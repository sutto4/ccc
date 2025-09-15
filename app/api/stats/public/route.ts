import { NextResponse } from "next/server";
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get total active servers and member counts from database
    const [totalServersResult, totalMembersResult] = await Promise.all([
      query("SELECT COUNT(*) as count FROM guilds WHERE status = 'active' OR status IS NULL"),
      query("SELECT SUM(member_count) as total FROM guilds WHERE (status = 'active' OR status IS NULL) AND member_count IS NOT NULL")
    ]);

    // Extract counts from results
    const totalServers = Array.isArray(totalServersResult) && totalServersResult.length > 0 ? Number(totalServersResult[0].count) : 0;
    const totalMembers = Array.isArray(totalMembersResult) && totalMembersResult.length > 0 ? Number(totalMembersResult[0].total) : 0;

    const stats = {
      totalServers,
      totalMembers,
      activeServers: totalServers,
      averageMembersPerServer: totalServers > 0 ? Math.round(totalMembers / totalServers) : 0
    };

    console.log(`[STATS] Returning stats from database:`, stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[STATS] Error fetching public stats:', error);
    // Return fallback stats on error
    return NextResponse.json({
      totalServers: 0,
      totalMembers: 0,
      activeServers: 0,
      averageMembersPerServer: 0
    });
  }
}
