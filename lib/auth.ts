import type { NextAuthOptions } from "next-auth"
import NextAuth, { getServerSession } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import { env } from "@/lib/env"
import { isAdmin, query } from "@/lib/db"
import { TokenManager } from "./token-manager"
import { SessionManager } from "./session-manager"
import { RefreshTokenManager } from "./refresh-token-manager"
import { SystemLogger } from "./system-logger"

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
  } catch (error) {
    console.error('Error logging user login:', error);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID!,
      clientSecret: env.DISCORD_CLIENT_SECRET!,
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
    maxAge: 7 * 24 * 60 * 60, // 7 days - shorter session for better stability
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
    async jwt({ token, account, profile, trigger }) {
      try {
        // If this is a new login (account is present)
        if (account && profile) {
          console.log('[AUTH] New login detected for user:', (profile as any).username);

          // Ensure token has proper structure
          if (!token) {
            token = {};
          }

          // Store basic token data with null checks
          token.accessToken = account.access_token || null;
          
          // Store refresh token securely in database
          if (account.refresh_token) {
            const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await RefreshTokenManager.storeRefreshToken((profile as any).id, account.refresh_token, refreshTokenExpiresAt);
          }
          
          // Set token expiry - Discord tokens typically last 1 hour
          const accessTokenExpiresAt = account.expires_at || (Math.floor(Date.now() / 1000) + 3600);
          token.accessTokenExpiresAt = accessTokenExpiresAt;
          token.expiresAt = accessTokenExpiresAt;

          // Store Discord profile data with null checks
          token.discordId = (profile as any).id || null;
          token.discordUsername = (profile as any).username || null;
          token.discordDiscriminator = (profile as any).discriminator || null;

          // Log the user login (system logs)
          if (profile) {
            const userId = String((profile as any).id);
            const userEmail = (profile as any).email as string | undefined;
            const userUsername = (profile as any).username as string | undefined;
            await SystemLogger.logUserLogin({ id: userId, name: userUsername, email: userEmail, role: token.role as string | undefined });
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

          console.log('[AUTH] Token setup completed for user:', (profile as any).username);
        }

        // Handle token refresh - only when token is actually expired or about to expire
        if (trigger === 'update' || token.accessTokenExpiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const accessTokenExpiresAt = token.accessTokenExpiresAt;
          
          // Only refresh if token is expired or will expire in the next 5 minutes
          if (accessTokenExpiresAt && now >= (accessTokenExpiresAt - 300)) {
            console.log('[AUTH] Access token expired or expiring soon, attempting refresh...');

            try {
              // Get refresh token from database
              const discordId = token.discordId;
              if (!discordId) {
                console.log('[AUTH] No Discord ID found, user will need to re-login');
                return {
                  ...token,
                  error: 'RefreshTokenExpired'
                };
              }

              const refreshToken = await RefreshTokenManager.getRefreshToken(discordId);
              
              if (!refreshToken) {
                console.log('[AUTH] No valid refresh token found, user will need to re-login');
                return {
                  ...token,
                  error: 'RefreshTokenExpired'
                };
              }

              const refreshedToken = await TokenManager.refreshToken(refreshToken);
              if (refreshedToken) {
                console.log('[AUTH] Token refreshed successfully');
                // Update token with new values
                token.accessToken = refreshedToken.accessToken;
                token.accessTokenExpiresAt = refreshedToken.expiresAt;
                // Update the expiresAt for backward compatibility
                token.expiresAt = refreshedToken.expiresAt;
                
                // If a new refresh token is provided, rotate it in the database
                if (refreshedToken.refreshToken) {
                  const newRefreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                  await RefreshTokenManager.rotateRefreshToken(discordId, refreshedToken.refreshToken, newRefreshTokenExpiresAt);
                }
              } else {
                console.log('[AUTH] Token refresh failed, user will need to re-login');
                return {
                  ...token,
                  error: 'RefreshTokenExpired'
                };
              }
            } catch (error) {
              console.error('[AUTH] Error refreshing token:', error);
              return {
                ...token,
                error: 'RefreshTokenExpired'
              };
            }
          }
        }

        return token;
      } catch (error) {
        console.error('[AUTH] Error in JWT callback:', error);
        // Return a minimal token structure to prevent crashes
        return {
          error: 'JWTError',
          role: 'viewer'
        };
      }
    },

    session: (async ({ session, token }: any) => {
      try {
        // Handle token errors
        if (token?.error === 'RefreshTokenExpired') {
          console.log('[AUTH] Session expired, returning null');
          return null;
        }

        if (!token || !session) {
          console.log('[AUTH] Missing token or session, returning null');
          return null;
        }

        // Ensure session object exists and has proper structure
        if (!session.user) {
          session.user = {};
        }

        // Pass token data to session with proper null checks
        session.accessToken = token.accessToken || null;
        session.discordId = token.discordId || null;
        session.discordUsername = token.discordUsername || null;
        session.discordDiscriminator = token.discordDiscriminator || null;
        session.role = token.role || "viewer";
        session.expiresAt = token.accessTokenExpiresAt || null;

        // Ensure user object has required properties
        session.user.discordId = token.discordId || null;
        session.user.role = token.role || "viewer";
        session.user.email = token.email || null;
        session.user.name = token.name || token.discordUsername || null;

        return session;
      } catch (error) {
        console.error('[AUTH] Error in session callback:', error);
        return null;
      }
    }) as any,
  },
}

export async function getAuthSession(req: NextRequest) {
  return getServerSession(authOptions);
}

export async function getUserFromRequest(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return null;
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      discordId: (token as any).discordId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      discordUsername: (token as any).discordUsername,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: (token as any).role || "viewer",
      email: token.email,
      name: token.name,
    };
  } catch (error) {
    console.error("Error getting user from request:", error);
    return null;
  }
}

// Enhanced session management with better error handling
export async function getEnhancedSession(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return { session: null, needsRefresh: false };
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expiresAt = (token as any).accessTokenExpiresAt || token.exp;

    if (expiresAt && now >= expiresAt) {
      return { session: null, needsRefresh: true };
    }

    return {
      session: {
        user: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          discordId: (token as any).discordId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          discordUsername: (token as any).discordUsername,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          role: (token as any).role || "viewer",
          email: token.email,
          name: token.name,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accessToken: (token as any).accessToken,
        expiresAt,
      },
      needsRefresh: false,
    };
  } catch (error) {
    console.error('[AUTH] Error getting enhanced session:', error);
    return { session: null, needsRefresh: false };
  }
}

// Force token refresh function
export async function forceTokenRefresh(req: NextRequest): Promise<boolean> {
  try {
    const token = await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
    });

    if (!token || !(token as any).refreshToken) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshedToken = await TokenManager.refreshToken((token as any).refreshToken);
    
    if (refreshedToken) {
      // Update the token in the session
      // This is a simplified approach - in practice, you might need to update the session store
      console.log('[AUTH] Token refreshed successfully via force refresh');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[AUTH] Force token refresh error:', error);
    return false;
  }
}

export default NextAuth(authOptions);
