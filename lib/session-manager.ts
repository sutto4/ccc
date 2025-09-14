import { TokenManager, TokenPair } from './token-manager';

export interface SessionState {
  isValid: boolean;
  lastValidated: number;
  refreshAttempts: number;
  userId?: string;
}

export class SessionManager {
  private static readonly SESSION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private static readonly MAX_REFRESH_ATTEMPTS = 5; // Allow more attempts for better reliability
  
  private static sessionCache = new Map<string, SessionState>();

  /**
   * Get or create session state for a user
   */
  static getSessionState(userId: string): SessionState {
    const cached = this.sessionCache.get(userId);
    if (cached && (Date.now() - cached.lastValidated) < this.SESSION_CACHE_TTL) {
      return cached;
    }

    const newState: SessionState = {
      isValid: false,
      lastValidated: Date.now(),
      refreshAttempts: 0,
      userId
    };

    this.sessionCache.set(userId, newState);
    return newState;
  }

  /**
   * Update session state
   */
  static updateSessionState(userId: string, updates: Partial<SessionState>): void {
    const current = this.getSessionState(userId);
    const updated = { ...current, ...updates, lastValidated: Date.now() };
    this.sessionCache.set(userId, updated);
  }

  /**
   * Mark session as invalid
   */
  static invalidateSession(userId: string): void {
    this.updateSessionState(userId, {
      isValid: false,
      refreshAttempts: this.MAX_REFRESH_ATTEMPTS
    });
    TokenManager.clearUserCache(userId);
  }

  /**
   * Check if session can be refreshed
   */
  static canRefresh(userId: string): boolean {
    const state = this.getSessionState(userId);
    return state.refreshAttempts < this.MAX_REFRESH_ATTEMPTS;
  }

  /**
   * Increment refresh attempts
   */
  static incrementRefreshAttempts(userId: string): void {
    const state = this.getSessionState(userId);
    this.updateSessionState(userId, {
      refreshAttempts: state.refreshAttempts + 1
    });
  }

  /**
   * Reset refresh attempts on successful refresh
   */
  static resetRefreshAttempts(userId: string): void {
    this.updateSessionState(userId, {
      refreshAttempts: 0,
      isValid: true
    });
  }

  /**
   * Clear all sessions
   */
  static clearAllSessions(): void {
    this.sessionCache.clear();
  }

  /**
   * Clear session for specific user
   */
  static clearUserSession(userId: string): void {
    this.sessionCache.delete(userId);
    TokenManager.clearUserCache(userId);
  }
}
