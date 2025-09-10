// Client-side E2E tracking - NO database imports
// This is a lightweight version that sends data to server APIs

export interface ClientJourneyStep {
  step: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  errors?: string[];
}

export interface ClientSession {
  sessionId: string;
  userId: string;
  discordId?: string;
  startTime: number;
  currentStep?: string;
  journey: ClientJourneyStep[];
}

class ClientE2ETracker {
  private static instance: ClientE2ETracker;
  private session: ClientSession | null = null;
  private apiBaseUrl = '/api';

  static getInstance(): ClientE2ETracker {
    if (!ClientE2ETracker.instance) {
      ClientE2ETracker.instance = new ClientE2ETracker();
    }
    return ClientE2ETracker.instance;
  }

  startSession(userId: string, discordId?: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.session = {
      sessionId,
      userId,
      discordId,
      startTime: Date.now(),
      journey: [{
        step: 'session_start',
        timestamp: Date.now(),
        metadata: { userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown' }
      }]
    };

    console.log(`🔄 [CLIENT-E2E] Session started: ${sessionId} for user ${userId}`);
    return sessionId;
  }

  trackStep(step: string, metadata?: Record<string, any>): void {
    if (!this.session) {
      console.warn('⚠️ [CLIENT-E2E] No active session');
      return;
    }

    const journeyStep: ClientJourneyStep = {
      step,
      timestamp: Date.now(),
      metadata,
      errors: []
    };

    // Calculate duration from previous step
    const previousStep = this.session.journey[this.session.journey.length - 1];
    if (previousStep) {
      journeyStep.duration = journeyStep.timestamp - previousStep.timestamp;
    }

    this.session.journey.push(journeyStep);
    this.session.currentStep = step;

    // Reduced logging to prevent console spam
    if (step === 'page_load' || step === 'guilds_fetch_start' || step === 'guilds_fetch_success') {
      console.log(`📍 [CLIENT-E2E] ${this.session.sessionId}: ${step}`);
    }

    // Send to server API (fire and forget)
    fetch(`${this.apiBaseUrl}/admin/e2e-monitoring-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session.sessionId,
        step,
        metadata,
        timestamp: journeyStep.timestamp,
        duration: journeyStep.duration
      })
    }).catch(err => {
      // Silently fail - don't break user experience
      console.warn('Failed to send tracking data:', err);
    });
  }

  trackError(error: {
    type: 'js' | 'network' | 'api' | 'auth';
    message: string;
    stack?: string;
    context?: Record<string, any>;
  }): void {
    if (!this.session) return;

    console.error(`❌ [CLIENT-E2E] ${this.session.sessionId} Error: ${error.type} - ${error.message}`);

    // Add error to current step if exists
    const currentStep = this.session.journey[this.session.journey.length - 1];
    if (currentStep) {
      currentStep.errors = currentStep.errors || [];
      currentStep.errors.push(error.message);
    }

    // Send error to server (fire and forget)
    fetch(`${this.apiBaseUrl}/admin/e2e-monitoring-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.session.sessionId,
        error,
        timestamp: Date.now()
      })
    }).catch(err => {
      // Silently fail
    });
  }

  async endSession(): Promise<void> {
    if (!this.session) return;

    await this.trackStep('session_end', {
      totalDuration: Date.now() - this.session.startTime,
      totalSteps: this.session.journey.length
    });

    console.log(`🏁 [CLIENT-E2E] Session ended: ${this.session.sessionId}`);
    this.session = null;
  }

  getSessionId(): string | null {
    return this.session?.sessionId || null;
  }
}

// Global instance
export const clientE2ETracker = ClientE2ETracker.getInstance();

// Helper functions
export function startClientSession(userId: string, discordId?: string): string {
  return clientE2ETracker.startSession(userId, discordId);
}

export function trackClientStep(step: string, metadata?: any): void {
  clientE2ETracker.trackStep(step, metadata);
}

export function trackClientError(error: Parameters<ClientE2ETracker['trackError']>[0]): void {
  clientE2ETracker.trackError(error);
}

export async function endClientSession(): Promise<void> {
  await clientE2ETracker.endSession();
}

// React hook for client-side tracking
export function useClientE2ETracking() {
  return {
    trackStep: (step: string, metadata?: any) => clientE2ETracker.trackStep(step, metadata),
    trackError: (error: Parameters<ClientE2ETracker['trackError']>[0]) => clientE2ETracker.trackError(error),
    getSessionId: () => clientE2ETracker.getSessionId()
  };
}
