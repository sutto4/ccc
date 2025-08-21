// Lightweight authorization helpers to standardize API route handling

export type AuthContext = { 
  accessToken: string;
  discordId?: string;
};

export async function getAccessTokenFromRequest(req: Request): Promise<{ accessToken: string | null; discordId?: string }> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  console.log('Auth header:', header ? 'Present' : 'Missing');
  
  let accessToken: string | null = null;
  let discordId: string | undefined;
  
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match) {
      console.log('Bearer token found in header');
      accessToken = match[1];
    }
  }
  
  // For server-side calls, always try to get the session
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions as any);
    console.log('Session from cookie:', session ? 'Present' : 'Missing');
    
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionToken = (session as any)?.accessToken as string | undefined;
      if (sessionToken) {
        accessToken = accessToken || sessionToken;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      discordId = (session as any)?.user?.discordId as string | undefined;
      console.log('Access token from session:', accessToken ? 'Present' : 'Missing');
      console.log('Discord ID from session:', discordId ? 'Present' : 'Missing');
      console.log('Session user:', (session as any)?.user);
    }
  } catch (error) {
    console.error('Error getting session from cookie:', error);
  }
  
  return { accessToken, discordId };
}

export function authHeader(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

// Wrap a Next.js App Router handler to enforce presence of an access token in the Authorization header
// Usage: export const GET = withAuth(async (req, ctx, { accessToken, discordId }) => { ... })
export function withAuth<TCtx = any>(
  handler: (req: Request, ctx: TCtx, auth: AuthContext) => Promise<Response> | Response
) {
  return async (req: Request, ctx: TCtx) => {
    const { accessToken, discordId } = await getAccessTokenFromRequest(req);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No access token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return handler(req, ctx, { accessToken, discordId });
  };
}


