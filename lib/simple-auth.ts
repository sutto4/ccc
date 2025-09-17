import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { env } from '@/lib/env';

export async function getSimpleAuth(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return { user: null, error: 'No token' };
    }

    // Check if token has error
    if ((token as any).error === 'RefreshTokenExpired') {
      return { user: null, error: 'Token expired' };
    }

    // Simple expiry check - if token is expired, just return null
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = (token as any).accessTokenExpiresAt || token.exp;
    
    if (expiresAt && now >= expiresAt) {
      return { user: null, error: 'Token expired' };
    }

    return {
      user: {
        id: (token as any).discordId,
        username: (token as any).discordUsername,
        role: (token as any).role || 'viewer',
        email: token.email,
        name: token.name,
      },
      error: null
    };
  } catch (error) {
    console.error('[SIMPLE-AUTH] Error:', error);
    return { user: null, error: 'Auth error' };
  }
}
