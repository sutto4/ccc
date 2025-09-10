"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function AuthRedirectHandler() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only run when user is authenticated and we haven't redirected yet
    if (status !== "authenticated" || !session || hasRedirected.current) {
      return;
    }

    // Check for callback URL in various places
    let callbackUrl = null;

    // 1. Check URL search parameters (NextAuth callbackUrl)
    const callbackParam = searchParams.get("callbackUrl");
    if (callbackParam) {
      try {
        callbackUrl = decodeURIComponent(callbackParam);
      } catch (error) {
        console.warn('[AuthRedirect] Failed to decode callbackUrl:', callbackParam);
      }
    }

    // 2. Check localStorage for stored callback URL
    if (!callbackUrl) {
      const storedUrl = localStorage.getItem('authCallbackUrl');
      if (storedUrl) {
        callbackUrl = storedUrl;
        // Clear it so we don't redirect again
        localStorage.removeItem('authCallbackUrl');
      }
    }

    // 3. If we have a callback URL and we're not already there, redirect
    if (callbackUrl) {
      const currentUrl = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');

      // Only redirect if we're not already at the target URL
      if (callbackUrl !== currentUrl && callbackUrl !== pathname) {
        console.log('[AuthRedirect] Redirecting to:', callbackUrl);
        hasRedirected.current = true;

        // Small delay to ensure the page has fully loaded
        setTimeout(() => {
          router.push(callbackUrl);
        }, 100);
      }
    }
  }, [session, status, searchParams, router, pathname]);

  // This component doesn't render anything
  return null;
}