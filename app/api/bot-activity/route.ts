// API endpoint for Discord bot to report activities to E2E tracker
import { NextRequest, NextResponse } from 'next/server';
import { trackBotCommand, type BotCommandActivity } from '@/lib/bot-monitor';
import { e2eTracker } from '@/lib/e2e-tracker';

export async function POST(req: NextRequest) {
  try {
    const activity: BotCommandActivity = await req.json();

    // Validate required fields
    if (!activity.command || !activity.userId || !activity.guildId || !activity.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: command, userId, guildId, timestamp' },
        { status: 400 }
      );
    }

    // Track the bot command
    await trackBotCommand(activity);

    // Try to correlate with active E2E sessions
    const activeSessions = e2eTracker.getAllSessions();
    const relatedSessions = activeSessions.filter(session =>
      session.discordId === activity.userId
    );

    // Link bot activity to related user sessions
    for (const session of relatedSessions) {
      await e2eTracker.trackBotInteraction(session.sessionId, activity);
    }

    console.log(`🤖 [BOT-ACTIVITY] Recorded command: ${activity.command} by ${activity.userId} in ${activity.guildId}`);

    return NextResponse.json({
      success: true,
      message: 'Bot activity recorded',
      linkedSessions: relatedSessions.length
    });

  } catch (error) {
    console.error('[BOT-ACTIVITY] Error processing bot activity:', error);
    return NextResponse.json(
      { error: 'Failed to process bot activity' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve recent bot activities
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const guildId = url.searchParams.get('guildId');

    // Import bot monitor to get activities
    const { botMonitor } = await import('@/lib/bot-monitor');
    let activities = botMonitor.getRecentActivities(limit);

    // Filter by guild if specified
    if (guildId) {
      activities = activities.filter(activity => activity.guildId === guildId);
    }

    return NextResponse.json({
      activities,
      count: activities.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BOT-ACTIVITY] Error retrieving bot activities:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve bot activities' },
      { status: 500 }
    );
  }
}
