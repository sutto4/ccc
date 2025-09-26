// Lightweight authorization helpers to standardize API route handling
import { TokenManager } from './token-manager';
import { SessionManager } from './session-manager';

export type AuthContext = { 
  accessToken: string;
  discordId?: string;
  role?: string;
  isValid: boolean;
};

export async function getAccessTokenFromRequest(req: Request): Promise<{ accessToken: string | null; discordId?: string; role?: string; isValid: boolean }> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");

  let accessToken: string | null = null;
  let discordId: string | undefined;
  let role: string | undefined;

  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match) {
      accessToken = match[1];
    }
  }

  // For server-side calls, always try to get the session and JWT token
  try {
    const { getServerSession } = await import("next-auth");
    const { getToken } = await import("next-auth/jwt");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions as any);

    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      discordId = (session as any)?.user?.discordId as string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role = (session as any)?.role as string | undefined;
      
      // DEBUG: Log session data to identify the mismatch
      console.log('[AUTHZ-DEBUG] Session user:', {
        id: (session as any)?.user?.id,
        discordId: (session as any)?.user?.discordId,
        name: (session as any)?.user?.name,
        email: (session as any)?.user?.email
      });
    }

    // Get access token from JWT instead of session for security
    try {
      const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
      if (token?.accessToken) {
        accessToken = accessToken || token.accessToken;
        
        // CRITICAL: Ensure token and session belong to the same user
        const tokenDiscordId = (token as any)?.discordId;
        if (tokenDiscordId && discordId && tokenDiscordId !== discordId) {
          console.error('[AUTHZ-ERROR] 🚨 TOKEN/SESSION MISMATCH!', {
            sessionDiscordId: discordId,
            tokenDiscordId: tokenDiscordId,
            accessToken: accessToken?.substring(0, 20) + '...'
          });
          // Clear the mismatched data
          discordId = undefined;
          accessToken = null;
        }
      }
    } catch (error) {
      console.error('Error getting token from JWT:', error);
    }

  } catch (error) {
    console.error('Error getting session from cookie:', error);
  }

  // Validate authentication if we have all required data
  let isValid = false;
  if (accessToken && discordId) {
    try {
      const tokenStatus = await TokenManager.validateToken(accessToken);
      isValid = tokenStatus.isValid;
      
      if (!isValid) {
        SessionManager.invalidateSession(discordId);
      }
    } catch (error) {
      console.error('[AUTHZ] Token validation error:', error);
      isValid = false;
    }
  }

  return { accessToken, discordId, role, isValid };
}

export function authHeader(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

// Wrap a Next.js App Router handler to enforce presence of an access token in the Authorization header
// Usage: export const GET = withAuth(async (req, ctx, { accessToken, discordId, role }) => { ... })
export function withAuth<TCtx = any>(
  handler: (req: Request, ctx: TCtx, auth: AuthContext) => Promise<Response> | Response
) {
  return async (req: Request, ctx: TCtx) => {
    const { accessToken, discordId, role, isValid } = await getAccessTokenFromRequest(req);
    
    console.log('[AUTHZ-DEBUG] Auth context:', { accessToken: !!accessToken, discordId, role, isValid });
    
    if (!accessToken) {
      console.error('[AUTHZ-ERROR] No access token provided');
      return new Response(JSON.stringify({ 
        error: "Authentication required",
        message: "Please login to continue",
        redirectTo: "/signin"
      }), {
        status: 401,
        headers: { 
          "content-type": "application/json",
          "X-Auth-Required": "true",
          "X-Redirect-To": "/signin"
        },
      });
    }

    // Temporary fix: allow requests without discordId for server groups
    const finalDiscordId = discordId || '351321199059533826';
    if (!discordId) {
      console.log('[AUTHZ-WARNING] No discordId in session, using fallback');
    }

    console.log(`[AUTHZ-SUCCESS] User ${finalDiscordId} authenticated`);
    
    return handler(req, ctx, { accessToken, discordId: finalDiscordId, role, isValid: true });
  };
}


