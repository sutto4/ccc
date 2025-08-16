// Lightweight authorization helpers to standardize API route handling

export type AuthContext = { accessToken: string };

export async function getAccessTokenFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match) return match[1];
  }
  // Fallback: try NextAuth session cookie
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (session as any)?.accessToken as string | undefined;
    return token || null;
  } catch {
    return null;
  }
}

export function authHeader(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

// Wrap a Next.js App Router handler to enforce presence of an access token in the Authorization header
// Usage: export const GET = withAuth(async (req, ctx, { accessToken }) => { ... })
export function withAuth<TCtx = any>(
  handler: (req: Request, ctx: TCtx, auth: AuthContext) => Promise<Response> | Response
) {
  return async (req: Request, ctx: TCtx) => {
    const accessToken = await getAccessTokenFromRequest(req);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No access token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return handler(req, ctx, { accessToken });
  };
}


