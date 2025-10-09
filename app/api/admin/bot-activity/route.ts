import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET current bot activity
export const GET = async (req: Request) => {
  const auth = await authMiddleware(req);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  // TODO: Implement your admin check logic here
  // For now, allowing all authenticated users - you should add proper admin validation
  // Example: if (!isAdmin(auth.user.id)) { return NextResponse.json({ error: 'Admin access required' }, { status: 403 }); }

  try {
    // Use the bot webhook URL from env or default to production
    // For local dev, set BOT_WEBHOOK_URL=http://localhost:3002 in .env.local
    const botWebhookUrl = process.env.BOT_WEBHOOK_URL || 'https://servermate.gg';
    const response = await fetch(`${botWebhookUrl}/api/bot/activity`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.BOT_API_SECRET || 'default-secret'}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Bot API responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ADMIN-BOT-ACTIVITY] Error fetching bot activity:', error);
    return NextResponse.json({ error: 'Failed to fetch bot activity' }, { status: 500 });
  }
};

// POST update bot activity
export const POST = async (req: Request) => {
  const auth = await authMiddleware(req);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  // TODO: Implement your admin check logic here
  // For now, allowing all authenticated users - you should add proper admin validation
  // Example: if (!isAdmin(auth.user.id)) { return NextResponse.json({ error: 'Admin access required' }, { status: 403 }); }

  try {
    const body = await req.json();
    const { text, type } = body;

    if (!text || !type) {
      return NextResponse.json({ error: 'text and type are required' }, { status: 400 });
    }

    const validTypes = ['PLAYING', 'WATCHING', 'LISTENING', 'STREAMING'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'type must be one of: PLAYING, WATCHING, LISTENING, STREAMING' }, { status: 400 });
    }

    // Use localhost:3002 as the bot webhook server URL (default port)
    const botWebhookUrl = process.env.BOT_WEBHOOK_URL || 'http://localhost:3002';
    const response = await fetch(`${botWebhookUrl}/api/bot/activity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BOT_API_SECRET || 'default-secret'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, type })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Bot API responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ADMIN-BOT-ACTIVITY] Error updating bot activity:', error);
    return NextResponse.json({ error: 'Failed to update bot activity' }, { status: 500 });
  }
};
