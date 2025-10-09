import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST refresh bot activity with user count
export const POST = async (req: Request) => {
  const auth = await authMiddleware(req);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  // TODO: Implement your admin check logic here
  // For now, allowing all authenticated users - you should add proper admin validation
  // Example: if (!isAdmin(auth.user.id)) { return NextResponse.json({ error: 'Admin access required' }, { status: 403 }); }

  try {
    // Use the bot webhook URL from env or default to production
    // For local dev, set BOT_WEBHOOK_URL=https://servermate.gg in .env.local
    const botWebhookUrl = process.env.BOT_WEBHOOK_URL || 'https://servermate.gg';
    const apiSecret = process.env.BOT_API_SECRET || 'default-secret';
    
    const response = await fetch(`${botWebhookUrl}/api/bot/activity/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiSecret}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Bot API responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ADMIN-BOT-ACTIVITY-REFRESH] Error refreshing bot activity:', error);
    return NextResponse.json({ error: 'Failed to refresh bot activity' }, { status: 500 });
  }
};
