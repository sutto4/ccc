// Lightweight authorization helpers to standardize API route handling

export type AuthContext = { 
  accessToken: string;
  discordId?: string;
  role?: string;
};

export async function getAccessTokenFromRequest(req: Request): Promise<{ accessToken: string | null; discordId?: string; role?: string }> {
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
    }

    // Get access token from JWT instead of session for security
    try {
      const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
      if (token?.accessToken) {
        accessToken = accessToken || token.accessToken;
      }
    } catch (error) {
      console.error('Error getting token from JWT:', error);
    }

  } catch (error) {
    console.error('Error getting session from cookie:', error);
  }

  return { accessToken, discordId, role };
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
    const { accessToken, discordId, role } = await getAccessTokenFromRequest(req);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No access token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return handler(req, ctx, { accessToken, discordId, role });
  };
}


