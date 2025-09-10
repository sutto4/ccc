'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useClientE2ETracking, startClientSession, endClientSession } from '@/lib/client-e2e-tracker';

interface E2ETrackingContextType {
  sessionId: string | null;
  trackStep: (step: string, metadata?: any) => void;
  trackError: (error: any) => void;
  isTracking: boolean;
}

const E2ETrackingContext = createContext<E2ETrackingContextType | null>(null);

interface E2ETrackingProviderProps {
  children: ReactNode;
  userId?: string;
  discordId?: string;
  enableTracking?: boolean;
}

export function E2ETrackingProvider({
  children,
  userId,
  discordId,
  enableTracking = true
}: E2ETrackingProviderProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { trackStep, trackError } = useClientE2ETracking();

  useEffect(() => {
    if (!enableTracking || !userId) {
      return;
    }

    // Start client-side session
    const newSessionId = startClientSession(userId, discordId);
    setSessionId(newSessionId);
    setIsTracking(true);

    console.log(`🚀 [CLIENT-E2E] Session started: ${newSessionId} for user ${userId}`);

    // Track initial page load
    trackStep('page_load', {
      url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });

    // Global error tracking
    const handleError = (event: ErrorEvent) => {
      trackError({
        type: 'js',
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError({
        type: 'js',
        message: `Unhandled promise rejection: ${event.reason}`,
        context: {
          reason: event.reason?.toString(),
          stack: event.reason?.stack
        }
      });
    };

    // User interaction tracking
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target) {
        const elementInfo = {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          textContent: target.textContent?.slice(0, 50),
          dataAttributes: Object.fromEntries(
            Object.entries(target.dataset).filter(([key]) => key.startsWith('e2e'))
          )
        };

        trackStep('user_click', elementInfo);
      }
    };

    const handleNavigation = () => {
      trackStep('navigation', {
        from: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: Date.now()
      });
    };

    // Event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('click', handleClick);
      window.addEventListener('beforeunload', handleNavigation);
    }

    // Cleanup function
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('click', handleClick);
        window.removeEventListener('beforeunload', handleNavigation);
      }

      // End session on unmount
      endClientSession().catch(err => console.error('Failed to end client session:', err));
    };
  }, [userId, discordId, enableTracking, trackStep, trackError]);

  const value: E2ETrackingContextType = {
    sessionId,
    trackStep: (step: string, metadata?: any) => {
      if (sessionId) {
        trackStep(step, metadata);
      }
    },
    trackError: (error: any) => {
      if (sessionId) {
        trackError({
          type: 'js',
          message: error.message || 'Unknown error',
          stack: error.stack,
          context: { ...error }
        });
      }
    },
    isTracking
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Run cleanup if available
      if ((window as any)._e2eCleanup) {
        (window as any)._e2eCleanup();
      }
    };
  }, []);

  return (
    <E2ETrackingContext.Provider value={value}>
      {children}
    </E2ETrackingContext.Provider>
  );
}

export function useE2ETrackingContext() {
  const context = useContext(E2ETrackingContext);
  if (!context) {
    throw new Error('useE2ETrackingContext must be used within an E2ETrackingProvider');
  }
  return context;
}
