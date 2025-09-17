import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { apiAnalytics } from "@/lib/api-analytics-db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Fetch API analytics data
export const GET = async (req: Request) => {
  // Check authentication
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  // Check if user is admin
  if (auth.user.role !== 'admin' && auth.user.role !== 'owner') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const [stats, recentRequests, topEndpoints, topUsers, hourlyStats] = await Promise.all([
      apiAnalytics.getStats(),
      apiAnalytics.getRecentRequests(50),
      apiAnalytics.getTopEndpoints(10),
      apiAnalytics.getTopUsers(10),
      apiAnalytics.getHourlyStats()
    ]);

    return NextResponse.json({
      stats: {
        ...stats,
        successRate: apiAnalytics.getSuccessRate(stats),
        errorRate: apiAnalytics.getErrorRate(stats),
        rateLimitRate: apiAnalytics.getRateLimitRate(stats)
      },
      recentRequests,
      topEndpoints,
      topUsers,
      hourlyStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
};

// POST: Clear analytics data
export const POST = AuthMiddleware.withAuth(async (req: Request, _ctx: unknown, { discordId }) => {
  const isAdmin = await checkAdminAccess(discordId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'cleanup') {
      apiAnalytics.cleanup();
      return NextResponse.json({ message: "Analytics data cleaned up" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('Error processing analytics action:', error);
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
  }
});

// Simple admin check - replace with your actual admin logic
async function checkAdminAccess(discordId: string): Promise<boolean> {
  // Add your admin user IDs here
  const adminUserIds = [
    'YOUR_DISCORD_ID_HERE', // Replace with your Discord ID
    // Add more admin IDs as needed
  ];
  
  // For now, allow all authenticated users to access analytics
  // TODO: Replace with proper admin check
  return true;
}
