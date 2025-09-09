import { env } from "@/lib/env";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface TokenValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  error?: string;
}

export class TokenManager {
  private static readonly VALIDATION_CACHE_TTL = 1 * 60 * 1000; // 1 minute
  private static readonly REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes before expiry (even less aggressive)

  private static validationCache = new Map<string, { isValid: boolean; timestamp: number }>();
  private static refreshAttempts = new Map<string, number>();
  private static refreshInProgress = new Set<string>(); // Prevent concurrent refreshes
  private static expiredRefreshTokens = new Set<string>(); // Track expired refresh tokens

  /**
   * Validate a token with Discord API
   */
  static async validateToken(accessToken: string): Promise<TokenValidationResult> {
    if (!accessToken || accessToken.length < 10) {
      return { isValid: false, needsRefresh: false, error: 'Invalid token format' };
    }

    // Check cache first
    const cached = this.validationCache.get(accessToken);
    if (cached && (Date.now() - cached.timestamp) < this.VALIDATION_CACHE_TTL) {
      return { isValid: cached.isValid, needsRefresh: false };
    }

    try {
      // Use /api/users/@me/guilds instead of /api/users/@me for better validation
      // This endpoint requires authentication and returns user's guilds
      const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'ServerMate/1.0'
        }
      });

      const isValid = response.ok;

      console.log(`[TOKEN-MANAGER] Token validation result:`, {
        endpoint: 'https://discord.com/api/users/@me/guilds',
        status: response.status,
        statusText: response.statusText,
        isValid
      });

      // Cache the result
      this.validationCache.set(accessToken, { isValid, timestamp: Date.now() });
      
      // If token is invalid, clear the cache to prevent reuse
      if (!isValid) {
        this.validationCache.delete(accessToken);
      }

      return {
        isValid,
        needsRefresh: false,
        error: isValid ? undefined : `Discord API returned ${response.status}`
      };
    } catch (error) {
      console.error('[TOKEN-MANAGER] Validation error:', error);
      return { 
        isValid: false, 
        needsRefresh: false, 
        error: 'Network error during validation' 
      };
    }
  }

  /**
   * Check if token needs refresh based on expiry time
   */
  static needsRefresh(expiresAt: number): boolean {
    // expiresAt is stored as Unix timestamp (seconds), convert to milliseconds for comparison
    const expiresAtMs = expiresAt * 1000;
    const timeUntilExpiry = expiresAtMs - Date.now();
    return timeUntilExpiry < this.REFRESH_THRESHOLD;
  }

  /**
   * Refresh an access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    if (!refreshToken) {
      console.error('[TOKEN-MANAGER] No refresh token provided');
      return null;
    }

    // Check if this refresh token is known to be expired
    if (this.expiredRefreshTokens.has(refreshToken)) {
      console.log('[TOKEN-MANAGER] ⚠️ Refresh token already known to be expired, skipping');
      return null;
    }

    // Check if any refresh is already in progress (not just for this specific token)
    if (this.refreshInProgress.size > 0) {
      console.log(`[TOKEN-MANAGER] ⚠️ Refresh already in progress (${this.refreshInProgress.size} active), skipping`);
      return null;
    }

    // Small delay to ensure no race conditions
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mark refresh as in progress for any token
    this.refreshInProgress.add('global-refresh');

    try {
      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID || '',
          client_secret: env.DISCORD_CLIENT_SECRET || '',
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Reset refresh attempts on success
        this.refreshAttempts.delete(refreshToken);
        
        // Clear validation cache for old token
        this.validationCache.clear();
        
        console.log('[TOKEN-MANAGER] ✅ Token refreshed successfully');
        
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + data.expires_in
        };
      } else {
        const errorText = await response.text();
        console.error('[TOKEN-MANAGER] ❌ Refresh failed:', response.status, errorText);
        
        // If it's an invalid_grant error, the refresh token is expired (normal after 30 days)
        if (response.status === 400 && errorText.includes('invalid_grant')) {
          console.error('[TOKEN-MANAGER] Refresh token expired - marking as expired');
          this.expiredRefreshTokens.add(refreshToken);
          return null;
        }
        
        // Increment refresh attempts for other errors
        this.refreshAttempts.set(refreshToken, attempts + 1);
        
        return null;
      }
    } catch (error) {
      console.error('[TOKEN-MANAGER] ❌ Refresh exception:', error);

      // For network errors, be more lenient and allow retries
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        console.log('[TOKEN-MANAGER] Network error during refresh - will retry');
        this.refreshAttempts.set(refreshToken, attempts + 1);
      } else {
        // For other errors, mark as failed
        this.refreshAttempts.set(refreshToken, this.MAX_REFRESH_ATTEMPTS);
      }

      return null;
    } finally {
      // Always remove the refresh in progress flag
      this.refreshInProgress.delete('global-refresh');
    }
  }

  /**
   * Revoke a token with Discord
   */
  static async revokeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://discord.com/api/oauth2/token/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID || '',
          client_secret: env.DISCORD_CLIENT_SECRET || '',
          token: accessToken,
        }),
      });

      if (response.ok) {
        console.log('[TOKEN-MANAGER] ✅ Token revoked successfully');
        return true;
      } else {
        console.error('[TOKEN-MANAGER] ❌ Revoke failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('[TOKEN-MANAGER] ❌ Revoke exception:', error);
      return false;
    }
  }

  /**
   * Clear all cached data for a user
   */
  static clearUserCache(userId: string): void {
    // Clear validation cache
    this.validationCache.clear();

    // Clear refresh attempts
    this.refreshAttempts.clear();

    // Clear refresh in progress flags
    this.refreshInProgress.clear();

    console.log(`[TOKEN-MANAGER] Cleared cache for user ${userId}`);
  }

  /**
   * Clear expired refresh token tracking (call when user signs in again)
   */
  static clearExpiredTokens(): void {
    console.log(`[TOKEN-MANAGER] Clearing expired token tracking`);
    this.expiredRefreshTokens.clear();
  }

  /**
   * Clear validation cache for a specific token
   */
  static clearTokenValidationCache(accessToken: string): void {
    console.log(`[TOKEN-MANAGER] Clearing validation cache for token`);
    this.validationCache.delete(accessToken);
  }

  /**
   * Get token validation status with caching
   */
  static async getTokenStatus(accessToken: string, expiresAt: number): Promise<TokenValidationResult> {
    // Check if token needs refresh
    if (this.needsRefresh(expiresAt)) {
      return { isValid: true, needsRefresh: true };
    }

    // Validate token
    return await this.validateToken(accessToken);
  }
}
