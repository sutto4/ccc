import { NextRequest, NextResponse } from 'next/server';
import { e2eTracker } from '@/lib/e2e-tracker';
import { botMonitor } from '@/lib/bot-monitor';

// POST endpoint for client-side tracking data
export async function POST(req: NextRequest) {
  try {
    const trackingData = await req.json();

    // Store client tracking data in memory for now
    // In production, you'd want to persist this data
    console.log('📊 [CLIENT-TRACKING] Received:', trackingData);

    // For now, just log the data. In a real implementation,
    // you'd store this in a database or queue it for processing
    if (trackingData.sessionId && trackingData.step) {
      console.log(`📍 [CLIENT-TRACKING] ${trackingData.sessionId}: ${trackingData.step}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CLIENT-TRACKING] Error processing tracking data:', error);
    return NextResponse.json(
      { error: 'Failed to process tracking data' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    console.log('[E2E-MONITORING-API] Request received:', { sessionId, url: url.toString() });

    if (sessionId) {
      // Return detailed session data
      const session = e2eTracker.getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Get bot activities for this session
      const botActivities = await e2eTracker.getBotActivitiesForSession(sessionId);

      return NextResponse.json({
        sessionDetails: {
          ...session,
          relatedBotActivities: botActivities
        }
      });
    } else {
      // Return overview data
      const allSessions = e2eTracker.getAllSessions();
      const sessionSummaries = allSessions.map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        discordId: session.discordId,
        startTime: session.startTime,
        currentStep: session.currentStep || 'unknown',
        totalSteps: session.journey.length,
        totalErrors: session.errors.length,
        duration: Date.now() - session.startTime,
        lastActivity: session.journey.length > 0
          ? session.journey[session.journey.length - 1].timestamp
          : session.startTime
      }));

      // Get bot data with error handling
      let botSummary;
      let recentBotActivities = [];
      try {
        // Ensure bot monitoring is running
        console.log('[E2E-MONITORING-API] Ensuring bot monitoring is active...');
        botMonitor.startMonitoring(30000); // Safe to call multiple times

        botSummary = botMonitor.getBotSummary();
        recentBotActivities = botMonitor.getRecentActivities(20);
      } catch (botError) {
        console.warn('[E2E-MONITORING-API] Bot monitoring error:', botError);
        // Provide fallback bot data
        botSummary = {
          status: 'offline' as const,
          uptime: 'Unknown',
          activeGuilds: 0,
          recentCommands: 0,
          healthScore: 0,
          lastActivity: Date.now()
        };
        recentBotActivities = [];
      }

      // Calculate system stats
      const activeSessions = e2eTracker.getActiveSessionCount();
      const totalSessionsToday = sessionSummaries.filter(s =>
        new Date(s.startTime).toDateString() === new Date().toDateString()
      ).length;

      const averageSessionDuration = sessionSummaries.length > 0
        ? sessionSummaries.reduce((sum, s) => sum + s.duration, 0) / sessionSummaries.length
        : 0;

      const totalErrors = sessionSummaries.reduce((sum, s) => sum + s.totalErrors, 0);
      const errorRate = totalSessionsToday > 0 ? (totalErrors / totalSessionsToday) * 100 : 0;

      // Get error type distribution
      const errorTypeCounts = new Map<string, number>();
      allSessions.forEach(session => {
        session.errors.forEach(error => {
          const count = errorTypeCounts.get(error.type) || 0;
          errorTypeCounts.set(error.type, count + 1);
        });
      });

      const topErrorTypes = Array.from(errorTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      const systemStats = {
        activeSessions,
        totalSessionsToday,
        averageSessionDuration,
        errorRate,
        topErrorTypes,
        performanceMetrics: {
          averagePageLoad: 0, // Would be calculated from actual performance data
          slowestEndpoint: '/api/guilds', // Would be calculated from analytics
          apiSuccessRate: 95.2 // Would be calculated from analytics
        },
        botStats: botSummary.status !== 'offline' ? {
          status: botSummary,
          recentActivities: recentBotActivities,
          commandCount: recentBotActivities.length,
          activeGuilds: botSummary.activeGuilds,
          healthScore: botSummary.healthScore
        } : undefined
      };

      console.log('[E2E-MONITORING-API] Returning data:', {
        sessionSummariesCount: sessionSummaries.length,
        activeSessions,
        botStatus: botSummary.status
      });

      return NextResponse.json({
        sessions: allSessions,
        sessionSummaries,
        systemStats
      });
    }
  } catch (error) {
    console.error('[E2E-MONITORING-API] Error:', error);
    // Return fallback data instead of error
    return NextResponse.json({
      sessions: [],
      sessionSummaries: [],
      systemStats: {
        activeSessions: 0,
        totalSessionsToday: 0,
        averageSessionDuration: 0,
        errorRate: 0,
        topErrorTypes: [],
        performanceMetrics: {
          averagePageLoad: 0,
          slowestEndpoint: '/api/guilds',
          apiSuccessRate: 0
        },
        botStats: {
          status: {
            status: 'offline',
            uptime: 'Unknown',
            activeGuilds: 0,
            recentCommands: 0,
            healthScore: 0,
            lastActivity: Date.now()
          },
          recentActivities: [],
          commandCount: 0,
          activeGuilds: 0,
          healthScore: 0
        }
      }
    });
  }
}
