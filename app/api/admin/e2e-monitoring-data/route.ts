import { NextRequest, NextResponse } from 'next/server';
import { e2eTracker } from '@/lib/e2e-tracker';
import { botMonitor } from '@/lib/bot-monitor';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (sessionId) {
      // Return detailed session data
      const session = e2eTracker.getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Get bot activities for this session
      const botActivities = e2eTracker.getBotActivitiesForSession(sessionId);

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

      // Get bot data
      const botSummary = botMonitor.getBotSummary();
      const recentBotActivities = botMonitor.getRecentActivities(20);

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
        botStats: {
          status: botSummary,
          recentActivities: recentBotActivities,
          commandCount: recentBotActivities.length,
          activeGuilds: botSummary.activeGuilds,
          healthScore: botSummary.healthScore
        }
      };

      return NextResponse.json({
        sessions: allSessions,
        sessionSummaries,
        systemStats
      });
    }
  } catch (error) {
    console.error('[E2E-MONITORING-API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}
