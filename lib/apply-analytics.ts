// Helper script to apply analytics middleware to API routes
// This can be used to automatically wrap existing API routes with analytics

import { withGlobalAnalytics } from './global-api-middleware';

// Example of how to apply analytics to an existing route
export function applyAnalyticsToRoute(handler: Function) {
  return withGlobalAnalytics(handler);
}

// Example usage in an API route:
/*
// Before:
export const GET = withAuth(async (req: Request, ctx: unknown, auth: any) => {
  // ... existing code
});

// After:
export const GET = withAuth(applyAnalyticsToRoute(async (req: Request, ctx: unknown, auth: any) => {
  // ... existing code
}));
*/
