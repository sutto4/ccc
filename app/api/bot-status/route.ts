// API endpoint for Discord bot to report status to E2E tracker
import { NextRequest, NextResponse } from 'next/server';
import { type BotStatus } from '@/lib/bot-monitor';

export async function POST(req: NextRequest) {
  try {
    const statusData = await req.json();

    // Validate and structure the status data
    const botStatus: Partial<BotStatus> = {
      online: statusData.online ?? true,
      uptime: statusData.uptime || 0,
      activeGuilds: statusData.activeGuilds || statusData.guilds || 0,
      totalUsers: statusData.totalUsers || statusData.users || 0,
      commandsProcessed: statusData.commandsProcessed || 0,
      memoryUsage: statusData.memoryUsage || 0,
      cpuUsage: statusData.cpuUsage || 0,
      lastActivity: Date.now(),
      version: statusData.version || 'unknown',
      nodeVersion: statusData.nodeVersion || process.version
    };

    // Store in memory for bot monitor
    // This simulates what would be stored in a more persistent way
    (global as any).latestBotStatus = botStatus;

    console.log(`🤖 [BOT-STATUS] Status update: ${botStatus.activeGuilds} guilds, ${botStatus.commandsProcessed} commands`);

    return NextResponse.json({
      success: true,
      message: 'Bot status recorded',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BOT-STATUS] Error processing bot status:', error);
    return NextResponse.json(
      { error: 'Failed to process bot status' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current bot status
export async function GET() {
  try {
    const latestStatus = (global as any).latestBotStatus;

    if (!latestStatus) {
      return NextResponse.json({
        online: false,
        uptime: 0,
        activeGuilds: 0,
        totalUsers: 0,
        commandsProcessed: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        lastActivity: 0,
        version: 'unknown',
        nodeVersion: process.version
      });
    }

    // Add freshness check
    const isFresh = Date.now() - latestStatus.lastActivity < 60000; // 1 minute

    return NextResponse.json({
      ...latestStatus,
      isFresh,
      lastUpdateAge: Date.now() - latestStatus.lastActivity
    });

  } catch (error) {
    console.error('[BOT-STATUS] Error retrieving bot status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve bot status' },
      { status: 500 }
    );
  }
}
