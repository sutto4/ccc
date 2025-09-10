import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { env } from "@/lib/env"
import { isAdmin } from "@/lib/db"
import { TokenManager } from "./token-manager"
import { SessionManager } from "./session-manager"

// Database connection helper for Discord bot database
async function query(sql: string, params?: any[]) {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.APP_DB_HOST || process.env.BOT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    user: process.env.APP_DB_USER || process.env.BOT_DB_USER || process.env.DB_USER || 'root',
    password: process.env.APP_DB_PASSWORD || process.env.BOT_DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.APP_DB_NAME || process.env.BOT_DB_NAME || 'chester_bot',
    port: Number(process.env.APP_DB_PORT || process.env.BOT_DB_PORT || process.env.DB_PORT || 3306),
  });

  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
}

// Log user login events
async function logUserLogin(discordId: string, email?: string, username?: string) {
  try {
    // Check if this is a first-time login
    const existingLogins = await query(
      'SELECT COUNT(*) as count FROM user_logins WHERE discord_id = ?',
      [discordId]
    );

    const loginType = (existingLogins as any)[0]?.count > 0 ? 'returning' : 'first_time';

    // Log the login event
    await query(
      'INSERT INTO user_logins (discord_id, email, username, login_type, created_at) VALUES (?, ?, ?, ?, NOW())',
      [discordId, email || null, username || null, loginType]
    );

    console.log(`[USER-LOGIN] ${loginType === 'first_time' ? '🎉' : '👋'} ${username || 'Unknown'} (${discordId}) - ${loginType} login`);

  } catch (error) {
    console.error('[USER-LOGIN] Failed to log login event:', error);
    // Don't fail the auth flow if logging fails
  }
}

// Validate required environment variables
if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
  console.error("Missing required Discord OAuth environment variables");
  console.error("DISCORD_CLIENT_ID:", env.DISCORD_CLIENT_ID ? "SET" : "MISSING");
  console.error("DISCORD_CLIENT_SECRET:", env.DISCORD_CLIENT_SECRET ? "SET" : "MISSING");
}

export const authOptions: NextAuthOptions = {
  providers: [
    Discomight nee rdProvider({
      clientId: env.DISCORD_CLIENT_ID || "",
      clientSecret: env.DISCORD_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "identify guilds email guilds.members.read guilds.join",
          // Remove prompt: "consent" - it's not helping and causes UX issues
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/signin",
    error: "/signin", // Redirect auth errors to signin
  },
  // Configure logging (suppress debug messages in production)
  logger: {
    error(code, ...message) {
      console.error("NextAuth Error:", code, ...message);
    },
    warn(code, ...message) {
      // Suppress the DEBUG_ENABLED warning in production
      if (code !== 'DEBUG_ENABLED') {
        console.warn("NextAuth Warning:", code, ...message);
      }
    },
    debug(code, ...message) {
      // Only log debug messages in development
      if (process.env.NODE_ENV === 'development') {
        console.log("NextAuth Debug:", code, ...message);
      }
    },
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Handle initial login
      if (account && profile) {
        console.log('[AUTH] New login - storing tokens');
        console.log('[AUTH] Account data:', {
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at,
          expiresAtFormatted: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : 'N/A',
          timeUntilExpiry: account.expires_at ? (account.expires_at - (Date.now() / 1000)) : 'N/A',
          // Check if expires_at might be in milliseconds
          possibleMsExpiry: account.expires_at ? new Date(account.expires_at).toISOString() : 'N/A',
          isProbablyMs: account.expires_at ? (account.expires_at > Date.now()) : false
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(token as any).accessToken = account.access_token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(token as any).refreshToken = account.refresh_token
        // Discord returns expires_at in seconds (standard OAuth2)
        let expiresAt = account.expires_at;
        if (!expiresAt) {
          // Default to 7 days if not provided
          expiresAt = Math.floor(Date.now() / 1000) + 604800;
          console.log('[AUTH] No expires_at provided, defaulting to 7 days');
        } else {
          console.log('[AUTH] Discord provided expires_at:', expiresAt, 'formatted:', new Date(expiresAt * 1000).toISOString());
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(token as any).expiresAt = expiresAt

        console.log('[AUTH] Token stored:', {
          hasAccessToken: !!(token as any).accessToken,
          hasRefreshToken: !!(token as any).refreshToken,
          expiresAt: (token as any).expiresAt,
          discordId: token.discordId,
          expiresAtFormatted: (token as any).expiresAt ? new Date((token as any).expiresAt * 1000).toISOString() : 'N/A'
        });

        // Attach Discord identity info
        token.discordId = (profile as any).id
        token.name = token.name || ((profile as any).global_name as string | undefined) || token.name

        // Clear any expired token tracking for fresh login
        TokenManager.clearExpiredTokens();

        // Log the user login
        if ((profile as any).id) {
          const userEmail = (profile as any).email as string | undefined;
          const userUsername = (profile as any).username as string | undefined;
          await logUserLogin((profile as any).id, userEmail, userUsername);
        }

        // Check database for user role
        if ((profile as any).id && !token.role) {
          try {
            if (env.DB_HOST && env.DB_USER && env.DB_NAME) {
              const isUserAdmin = await isAdmin((profile as any).id);
              token.role = isUserAdmin ? "admin" : "viewer";
            } else {
              token.role = "viewer";
            }
          } catch (error) {
            console.error("Error checking user role:", error);
            token.role = "viewer";
          }
        }

        // Initialize session state
        if ((profile as any).id) {
          SessionManager.updateSessionState((profile as any).id, {
            isValid: true,
            refreshAttempts: 0,
            lastRefresh: Date.now()
          });
        }

        return token;
      }

      // Handle token refresh for existing sessions
      const now = Date.now() / 1000; // Convert to seconds
      const accessToken = (token as any).accessToken;
      const refreshToken = (token as any).refreshToken;
      const expiresAt = (token as any).expiresAt;

      console.log('[AUTH] Token check:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        expiresAt: expiresAt,
        now: now,
        isExpired: expiresAt ? now > expiresAt : false,
        timeUntilExpiry: expiresAt ? expiresAt - now : 'N/A',
        currentTimeFormatted: new Date(now * 1000).toISOString(),
        expiryTimeFormatted: expiresAt ? new Date(expiresAt * 1000).toISOString() : 'N/A'
      });

      // Check if token needs refresh (only when actually expired or very close to expiry)
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
      const shouldRefresh = accessToken && refreshToken && expiresAt && (now > expiresAt || timeUntilExpiry < 21600); // Refresh if expired or < 6 hours left

      if (shouldRefresh) {
        // Check if we should attempt refresh (prevent infinite loops)
        const userId = (token as any).discordId;
        const sessionState = userId ? SessionManager.getSessionState(userId) : null;

        // Prevent refresh attempts more than once every 30 seconds
        if (sessionState?.lastRefresh && (Date.now() - sessionState.lastRefresh) < 30000) {
          console.log('[AUTH] Skipping refresh - too soon since last attempt');
          return token;
        }

        // Limit refresh attempts to prevent infinite loops
        if (sessionState && sessionState.refreshAttempts >= 3) {
          console.log('[AUTH] Too many refresh attempts, forcing re-login');
          (token as any).accessToken = null;
          (token as any).refreshToken = null;
          (token as any).expiresAt = null;
          token.exp = Math.floor(Date.now() / 1000) - 1;
          return token;
        }

        console.log('[AUTH] Token needs refresh:', {
          timeUntilExpiry: `${Math.round(timeUntilExpiry / 3600)} hours (${Math.round(timeUntilExpiry)}s)`,
          isExpired: now > expiresAt,
          willExpireSoon: timeUntilExpiry < 21600,
          refreshAttempts: sessionState?.refreshAttempts || 0
        });

        try {
          const refreshResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: env.DISCORD_CLIENT_ID || '',
              client_secret: env.DISCORD_CLIENT_SECRET || '',
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('[AUTH] ✅ Token refresh successful', {
              hasAccessToken: !!refreshData.access_token,
              hasRefreshToken: !!refreshData.refresh_token,
              expiresIn: refreshData.expires_in,
              expiresInFormatted: refreshData.expires_in ? `${refreshData.expires_in / 86400} days` : 'N/A'
            });

            // Update token with refreshed data
            (token as any).accessToken = refreshData.access_token;
            (token as any).refreshToken = refreshData.refresh_token || refreshToken;
            (token as any).expiresAt = Math.floor(Date.now() / 1000) + (refreshData.expires_in || 604800); // Default to 7 days

            console.log('[AUTH] Updated token with refreshed data');

            // Update session state on successful refresh
            if (userId) {
              SessionManager.updateSessionState(userId, {
                isValid: true,
                refreshAttempts: (sessionState?.refreshAttempts || 0) + 1,
                lastRefresh: Date.now()
              });
            }
          } else {
            console.error('[AUTH] ❌ Token refresh failed:', refreshResponse.status, await refreshResponse.text());
            // Clear tokens to force re-login
            (token as any).accessToken = null;
            (token as any).refreshToken = null;
            (token as any).expiresAt = null;
            token.exp = Math.floor(Date.now() / 1000) - 1; // Force session expiry
            console.log('[AUTH] Cleared tokens due to refresh failure - user will need to re-login');

            // Update session state on refresh failure
            if (userId) {
              SessionManager.updateSessionState(userId, {
                isValid: false,
                refreshAttempts: (sessionState?.refreshAttempts || 0) + 1,
                lastRefresh: Date.now()
              });
            }
          }
        } catch (error) {
          console.error('[AUTH] Token refresh error:', error);
          // Clear tokens to force re-login
          (token as any).accessToken = null;
          (token as any).refreshToken = null;
          (token as any).expiresAt = null;
          token.exp = Math.floor(Date.now() / 1000) - 1; // Force session expiry

          // Update session state on refresh error
          if (userId) {
            SessionManager.updateSessionState(userId, {
              isValid: false,
              refreshAttempts: (sessionState?.refreshAttempts || 0) + 1,
              lastRefresh: Date.now()
            });
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).id = token.sub
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).discordId = (token as any).discordId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session as any).role = (token as any).role ?? "viewer"
        // SECURITY: Never include access tokens in session - they should only be in JWT
        // ;(session as any).accessToken = (token as any).accessToken
      }
      return session
    },
  },
}

// Utility function to force token refresh for API routes
export async function forceTokenRefresh(req: NextRequest): Promise<boolean> {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token || !(token as any).accessToken || !(token as any).refreshToken) {
      return false;
    }

    const refreshToken = (token as any).refreshToken;
    const refreshResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (refreshResponse.ok) {
      console.log('[AUTH] Force token refresh successful');
      return true;
    }

    console.error('[AUTH] Force token refresh failed:', refreshResponse.status);
    return false;
  } catch (error) {
    console.error('[AUTH] Force token refresh error:', error);
    return false;
  }
}

export default NextAuth(authOptions);
