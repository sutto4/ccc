'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Note: We avoid importing e2e-tracker directly to prevent mysql2 bundling issues

interface E2ETrackingContextType {
  sessionId: string | null;
  trackStep: (step: string, metadata?: any) => Promise<void>;
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

  useEffect(() => {
    if (!enableTracking || !userId || !discordId) {
      return;
    }

    // Start session when user is authenticated (dynamic import to avoid bundling issues)
    const startSession = async () => {
      try {
        const { startUserSession, useE2ETracking, endUserSession } = await import('@/lib/e2e-tracker');
        const newSessionId = startUserSession(userId, discordId);
        setSessionId(newSessionId);
        setIsTracking(true);

        console.log(`🚀 [E2E] Session started: ${newSessionId} for user ${userId}`);

        // Track page load
        const tracking = useE2ETracking(newSessionId);

        // Browser info
        tracking.updateBrowserInfo({
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          online: navigator.onLine
        });

        // Performance data
        if (performance.timing) {
          const perfData = {
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime,
            largestContentfulPaint: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
            firstInputDelay: performance.getEntriesByType('first-input')[0]?.processingStart - performance.getEntriesByType('first-input')[0]?.startTime,
            cumulativeLayoutShift: (performance.getEntriesByType('layout-shift') as any[]).reduce((sum, entry) => sum + entry.value, 0)
          };
          tracking.updatePerformanceData(perfData);
        }

        // Track initial page load
        await tracking.trackStep('page_load', {
          url: window.location.href,
          referrer: document.referrer,
          timestamp: Date.now()
        });

        // Global error tracking
        const handleError = (event: ErrorEvent) => {
          tracking.trackError({
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
          tracking.trackError({
            type: 'js',
            message: `Unhandled promise rejection: ${event.reason}`,
            context: {
              reason: event.reason?.toString(),
              stack: event.reason?.stack
            }
          });
        };

        // Network error tracking
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const startTime = Date.now();
          const [resource] = args;

          return originalFetch.apply(this, args)
            .then(async (response) => {
              const duration = Date.now() - startTime;
              await tracking.trackStep('network_request', {
                url: typeof resource === 'string' ? resource : (resource as Request).url,
                method: typeof resource === 'string' ? 'GET' : (resource as Request).method,
                status: response.status,
                duration,
                success: response.ok
              });
              return response;
            })
            .catch(async (error) => {
              await tracking.trackError({
                type: 'network',
                message: `Network request failed: ${error.message}`,
                context: {
                  url: typeof resource === 'string' ? resource : (resource as Request).url,
                  method: typeof resource === 'string' ? 'GET' : (resource as Request).method,
                  duration: Date.now() - startTime
                }
              });
              throw error;
            });
        };

        // User interaction tracking
        const handleClick = async (event: MouseEvent) => {
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

            await tracking.trackStep('user_click', elementInfo);
          }
        };

        const handleNavigation = async () => {
          await tracking.trackStep('navigation', {
            from: window.location.href,
            timestamp: Date.now()
          });
        };

        // Event listeners
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('click', handleClick);
        window.addEventListener('beforeunload', handleNavigation);

        // Return cleanup function and session ID
        return {
          cleanup: () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('beforeunload', handleNavigation);

            // End session on unmount
            if (newSessionId) {
              endUserSession(newSessionId).catch(err => console.error('Failed to end E2E session:', err));
              console.log(`🛑 [E2E] Session ended: ${newSessionId}`);
            }
          },
          sessionId: newSessionId
        };
      } catch (error) {
        console.warn('E2E tracking initialization failed:', error);
        return null;
      }
    };

    startSession().then((result) => {
      if (result) {
        // Store cleanup function for later use
        (window as any)._e2eCleanup = result.cleanup;
      }
    });
  }, [userId, discordId, enableTracking]);

  const value: E2ETrackingContextType = {
    sessionId,
    trackStep: async (step: string, metadata?: any) => {
      if (sessionId) {
        try {
          const { useE2ETracking } = await import('@/lib/e2e-tracker');
          await useE2ETracking(sessionId).trackStep(step, metadata);
        } catch (error) {
          // Silently fail if tracking is not available
        }
      }
    },
    trackError: async (error: any) => {
      if (sessionId) {
        try {
          const { useE2ETracking } = await import('@/lib/e2e-tracker');
          useE2ETracking(sessionId).trackError({
            type: 'js',
            message: error.message || 'Unknown error',
            stack: error.stack,
            context: { ...error }
          });
        } catch (err) {
          // Silently fail if tracking is not available
        }
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
