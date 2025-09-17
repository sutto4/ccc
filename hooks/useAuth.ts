import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

export function useAuth(redirectTo = '/signin') {
  const { data: session, status } = useSession();
  const router = useRouter();

  const authState = useMemo(() => {
    if (status === 'loading') {
      return {
        user: null,
        discordId: null,
        role: 'viewer',
        isLoading: true,
        isAuthenticated: false
      };
    }

    if (!session) {
      return {
        user: null,
        discordId: null,
        role: 'viewer',
        isLoading: false,
        isAuthenticated: false
      };
    }

    // Check if access token is expired
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = (session as any).expiresAt;
    
    if (expiresAt && now >= expiresAt) {
      console.log('[AUTH] Token expired');
      return {
        user: null,
        discordId: null,
        role: 'viewer',
        isLoading: false,
        isAuthenticated: false
      };
    }

    return {
      user: session.user,
      discordId: (session as any).discordId,
      role: (session as any).role || 'viewer',
      isLoading: false,
      isAuthenticated: true
    };
  }, [session, status]);

  useEffect(() => {
    if (authState.isLoading) return; // Still loading

    if (!authState.isAuthenticated) {
      // No valid session, redirect to signin
      router.push(redirectTo);
      return;
    }
  }, [authState.isAuthenticated, authState.isLoading, router, redirectTo]);

  return authState;
}
