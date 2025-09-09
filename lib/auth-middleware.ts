import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export interface AuthContext {
  accessToken: string;
  discordId: string;
  role: string;
  isValid: boolean;
}

// Authentication function
export async function validateAuth(req: NextRequest): Promise<AuthContext | null> {
  try {
    // Get token from JWT
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET
    });

    // Simple check: do we have a valid session?
    if (!token || !(token as any).discordId) {
      console.log('[AUTH] No session found');
      return null;
    }

    const discordId = (token as any).discordId as string;
    const role = ((token as any).role as string) || 'viewer';
    const accessToken = ((token as any).accessToken as string) || '';

    // Simple validation
    if (!accessToken || !discordId) {
      console.log('[AUTH] Missing access token or discord ID');
      return null;
    }

    return {
      accessToken,
      discordId,
      role,
      isValid: true
    };

  } catch (error) {
    console.error('[AUTH] Validation error:', error);
    return null;
  }
}

// AuthMiddleware class for backward compatibility
export class AuthMiddleware {
  static async validateAuth(req: NextRequest): Promise<AuthContext | null> {
    return validateAuth(req);
  }

  static withAuth<T = any>(
    handler: (req: NextRequest, context: T, auth: AuthContext) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, context: T) => {
      const auth = await validateAuth(req);

      if (!auth) {
        return NextResponse.json(
          {
            error: 'Authentication required',
            message: 'Please login to continue',
            redirectTo: '/signin'
          },
          {
            status: 401,
            headers: {
              'X-Auth-Required': 'true',
              'X-Redirect-To': '/signin'
            }
          }
        );
      }

      return handler(req, context, auth);
    };
  }

  static requireRole(requiredRole: string) {
    return <T = any>(
      handler: (req: NextRequest, context: T, auth: AuthContext) => Promise<NextResponse>
    ) => {
      return this.withAuth<T>(async (req, context, auth) => {
        const roleHierarchy = {
          'admin': 3,
          'moderator': 2,
          'viewer': 1
        };

        const userLevel = roleHierarchy[auth.role as keyof typeof roleHierarchy] || 0;
        const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

        if (userLevel < requiredLevel) {
          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: `This action requires ${requiredRole} role or higher`
            },
            { status: 403 }
          );
        }

        return handler(req, context, auth);
      });
    };
  }
}
