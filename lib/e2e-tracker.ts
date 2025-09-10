// Enhanced End-to-End User Journey Tracking
import { apiAnalytics } from './api-analytics-db';
import { botMonitor, trackBotCommand, type BotCommandActivity } from './bot-monitor';

export interface UserJourneyStep {
  step: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  errors?: string[];
}

export interface UserSession {
  sessionId: string;
  userId: string;
  discordId: string;
  startTime: number;
  currentStep?: string;
  journey: UserJourneyStep[];
  browserInfo?: {
    userAgent: string;
    platform: string;
    language: string;
    cookieEnabled: boolean;
    online: boolean;
  };
  performanceData?: {
    domContentLoaded?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    firstInputDelay?: number;
    cumulativeLayoutShift?: number;
  };
  errors: Array<{
    type: 'js' | 'network' | 'api' | 'auth';
    message: string;
    stack?: string;
    timestamp: number;
    context?: Record<string, any>;
  }>;
}

class E2ETracker {
  private static instance: E2ETracker;
  private sessions = new Map<string, UserSession>();
  private journeySteps = [
    'page_load',
    'authentication_start',
    'authentication_complete',
    'guilds_fetch',
    'guilds_display',
    'guild_select',
    'page_navigation',
    'data_fetch',
    'user_interaction',
    'form_submit',
    'api_call',
    'error_occurred',
    'session_end'
  ];

  static getInstance(): E2ETracker {
    if (!E2ETracker.instance) {
      E2ETracker.instance = new E2ETracker();
    }
    return E2ETracker.instance;
  }

  startSession(userId: string, discordId: string, sessionId?: string): string {
    const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: UserSession = {
      sessionId: id,
      userId,
      discordId,
      startTime: Date.now(),
      journey: [{
        step: 'session_start',
        timestamp: Date.now(),
        metadata: { userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server' }
      }],
      errors: []
    };

    this.sessions.set(id, session);

    console.log(`🔄 [E2E-TRACKER] Session started: ${id} for user ${userId}`);

    // Clean up old sessions (keep last 1000)
    if (this.sessions.size > 1000) {
      const oldestSessions = Array.from(this.sessions.keys()).slice(0, 100);
      oldestSessions.forEach(key => this.sessions.delete(key));
    }

    return id;
  }

  trackStep(sessionId: string, step: string, metadata?: Record<string, any>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ [E2E-TRACKER] Session not found: ${sessionId}`);
      return;
    }

    const journeyStep: UserJourneyStep = {
      step,
      timestamp: Date.now(),
      metadata,
      errors: []
    };

    // Calculate duration from previous step
    const previousStep = session.journey[session.journey.length - 1];
    if (previousStep) {
      journeyStep.duration = journeyStep.timestamp - previousStep.timestamp;
    }

    session.journey.push(journeyStep);
    session.currentStep = step;

    console.log(`📍 [E2E-TRACKER] ${sessionId}: ${step}${journeyStep.duration ? ` (+${journeyStep.duration}ms)` : ''}`, metadata || '');

    // Log to analytics if it's an API call
    if (step.includes('api') || step.includes('fetch')) {
      apiAnalytics.logRequest({
        id: `e2e_${sessionId}_${step}_${Date.now()}`,
        endpoint: step,
        method: 'TRACK',
        userId: session.userId,
        discordId: session.discordId,
        userJourneyStep: step,
        sessionId,
        environment: (process.env.NODE_ENV as any) || 'production',
        timestamp: new Date().toISOString(),
        statusCode: 200,
        responseTime: journeyStep.duration || 0,
        ...metadata
      }).catch(err => console.error('Failed to log E2E analytics:', err));
    }
  }

  trackError(sessionId: string, error: {
    type: 'js' | 'network' | 'api' | 'auth';
    message: string;
    stack?: string;
    context?: Record<string, any>;
  }): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ [E2E-TRACKER] Session not found for error: ${sessionId}`);
      return;
    }

    const errorEntry = {
      ...error,
      timestamp: Date.now()
    };

    session.errors.push(errorEntry);

    console.error(`❌ [E2E-TRACKER] ${sessionId} Error: ${error.type} - ${error.message}`, error.context || '');

    // Log error to current step if exists
    const currentStep = session.journey[session.journey.length - 1];
    if (currentStep) {
      currentStep.errors = currentStep.errors || [];
      currentStep.errors.push(error.message);
    }
  }

  updateBrowserInfo(sessionId: string, browserInfo: UserSession['browserInfo']): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.browserInfo = browserInfo;
    }
  }

  updatePerformanceData(sessionId: string, performanceData: UserSession['performanceData']): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.performanceData = performanceData;
      console.log(`⚡ [E2E-TRACKER] ${sessionId} Performance:`, performanceData);
    }
  }

  endSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ [E2E-TRACKER] Cannot end session - not found: ${sessionId}`);
      return null;
    }

    // Add session end step
    this.trackStep(sessionId, 'session_end', {
      totalDuration: Date.now() - session.startTime,
      totalSteps: session.journey.length,
      totalErrors: session.errors.length
    });

    console.log(`🏁 [E2E-TRACKER] Session ended: ${sessionId} (${session.journey.length} steps, ${session.errors.length} errors)`);

    // Remove from active sessions
    this.sessions.delete(sessionId);

    return session;
  }

  getSession(sessionId: string): UserSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getAllSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  // Utility method to track common user flows
  trackUserFlow(sessionId: string, flow: 'login' | 'guild_selection' | 'admin_access' | 'user_management' | 'role_management', step: string, metadata?: any): void {
    this.trackStep(sessionId, `${flow}_${step}`, metadata);
  }

  // Performance monitoring
  trackApiCall(sessionId: string, endpoint: string, method: string, startTime: number, statusCode: number, error?: string): void {
    const duration = Date.now() - startTime;
    this.trackStep(sessionId, `api_${endpoint.replace('/', '_')}`, {
      method,
      statusCode,
      duration,
      error: error || null
    });
  }

  // Bot activity tracking
  trackBotInteraction(sessionId: string, activity: BotCommandActivity): void {
    // Track the bot command
    trackBotCommand(activity);

    // If this session involves the same user, link the bot activity to the user journey
    this.trackStep(sessionId, `bot_command_${activity.command}`, {
      command: activity.command,
      guildId: activity.guildId,
      channelId: activity.channelId,
      userId: activity.userId,
      responseTime: activity.responseTime,
      success: activity.success,
      errorMessage: activity.errorMessage,
      args: activity.args
    });
  }

  // Track user-bot interaction correlation
  trackUserBotCorrelation(sessionId: string, webUserId: string, discordUserId: string, guildId: string): void {
    this.trackStep(sessionId, 'user_bot_correlation', {
      webUserId,
      discordUserId,
      guildId,
      timestamp: Date.now()
    });

    console.log(`🔗 [E2E-TRACKER] Linked web user ${webUserId} with Discord user ${discordUserId} in guild ${guildId}`);
  }

  // Get bot activities related to a session
  getBotActivitiesForSession(sessionId: string): BotCommandActivity[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    // Get recent bot activities that might be related to this user
    const allBotActivities = botMonitor.getRecentActivities(100);
    const userDiscordId = session.discordId;

    // Filter activities by the user's Discord ID
    return allBotActivities.filter(activity =>
      activity.userId === userDiscordId ||
      activity.guildId === session.journey.find(step =>
        step.step.includes('guild_select') && step.metadata?.guildId
      )?.metadata?.guildId
    );
  }
}

// Global instance
export const e2eTracker = E2ETracker.getInstance();

// Helper functions for easy integration
export function startUserSession(userId: string, discordId: string, sessionId?: string): string {
  return e2eTracker.startSession(userId, discordId, sessionId);
}

export function trackUserStep(sessionId: string, step: string, metadata?: any): void {
  e2eTracker.trackStep(sessionId, step, metadata);
}

export function trackUserError(sessionId: string, error: Parameters<E2ETracker['trackError']>[1]): void {
  e2eTracker.trackError(sessionId, error);
}

export function endUserSession(sessionId: string): UserSession | null {
  return e2eTracker.endSession(sessionId);
}

// React hook for frontend integration
export function useE2ETracking(sessionId: string) {
  return {
    trackStep: (step: string, metadata?: any) => e2eTracker.trackStep(sessionId, step, metadata),
    trackError: (error: Parameters<E2ETracker['trackError']>[1]) => e2eTracker.trackError(sessionId, error),
    updateBrowserInfo: (browserInfo: UserSession['browserInfo']) => e2eTracker.updateBrowserInfo(sessionId, browserInfo),
    updatePerformanceData: (performanceData: UserSession['performanceData']) => e2eTracker.updatePerformanceData(sessionId, performanceData)
  };
}
