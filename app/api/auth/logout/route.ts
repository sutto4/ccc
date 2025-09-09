import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { TokenManager } from '@/lib/token-manager';
import { SessionManager } from '@/lib/session-manager';

export async function POST(req: NextRequest) {
  try {
    // Get token from JWT
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (token?.accessToken) {
      // Revoke token with Discord
      await TokenManager.revokeToken(token.accessToken as string);
    }

    if (token?.discordId) {
      // Clear session state
      SessionManager.clearUserSession(token.discordId as string);
    }

    // Clear NextAuth session
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });

    // Clear session cookie
    response.cookies.set('next-auth.session-token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;
  } catch (error) {
    console.error('[LOGOUT] Error during logout:', error);
    
    // Even if there's an error, try to clear the session
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out (with errors)' 
    });

    response.cookies.set('next-auth.session-token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;
  }
}
