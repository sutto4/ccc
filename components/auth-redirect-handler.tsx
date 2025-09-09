'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthRedirectHandlerProps {
  children: React.ReactNode;
  shouldRedirect: boolean;
  redirectTo: string;
}

export function AuthRedirectHandler({ 
  children, 
  shouldRedirect, 
  redirectTo 
}: AuthRedirectHandlerProps) {
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirect) {
      router.replace(redirectTo);
    }
  }, [shouldRedirect, redirectTo, router]);

  if (shouldRedirect) {
    return null; // Don't render anything while redirecting
  }

  return <>{children}</>;
}
