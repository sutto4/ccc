// Service Quotas API Route
import { NextResponse } from "next/server";
import { AuthMiddleware } from "@/lib/auth-middleware";
import { serviceQuotas } from "@/lib/service-quotas";

// GET: Fetch service quota status
export const GET = AuthMiddleware.withAuth(async (req: Request, _ctx: unknown, { discordId }) => {
  // Check if user is admin
  const isAdmin = await checkAdminAccess(discordId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const serviceName = url.searchParams.get('service');
    const includeViolations = url.searchParams.get('include_violations') === 'true';
    const hours = parseInt(url.searchParams.get('hours') || '24');

    // Get quota status
    const quotaStatus = await serviceQuotas.getQuotaStatus(serviceName || undefined);

    // Get violations if requested
    let violations = [];
    if (includeViolations) {
      violations = await serviceQuotas.getQuotaViolations(serviceName || undefined, 100);
    }

    // Get usage stats for each service
    const serviceStats = await Promise.all(
      quotaStatus.map(async (status) => {
        const stats = await serviceQuotas.getUsageStats(status.serviceName, hours);
        return {
          ...status,
          usageStats: stats
        };
      })
    );

    return NextResponse.json({
      quotaStatus: serviceStats,
      violations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching service quotas:', error);
    return NextResponse.json({ error: "Failed to fetch service quotas" }, { status: 500 });
  }
});

// POST: Update quota usage (for internal tracking)
export const POST = AuthMiddleware.withAuth(async (req: Request, _ctx: unknown, { discordId }) => {
  try {
    const body = await req.json();
    const { serviceName, quotaType, requestCount = 1, endpoint, userId, ipAddress } = body;

    if (!serviceName || !quotaType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Track the usage
    await serviceQuotas.trackUsage(serviceName, quotaType, requestCount, endpoint, userId, ipAddress);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking quota usage:', error);
    return NextResponse.json({ error: "Failed to track quota usage" }, { status: 500 });
  }
});

// Simple admin check - replace with your actual admin logic
async function checkAdminAccess(discordId: string): Promise<boolean> {
  // Add your admin user IDs here
  const adminUserIds = [
    'YOUR_DISCORD_ID_HERE', // Replace with your Discord ID
    // Add more admin IDs as needed
  ];
  
  // For now, allow all authenticated users to access quotas
  // TODO: Replace with proper admin check
  return true;
}
