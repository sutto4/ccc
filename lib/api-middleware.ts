// API Middleware for Analytics
import { NextRequest, NextResponse } from 'next/server';
import { apiAnalytics } from './api-analytics';

export function withAnalytics(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const url = new URL(req.url);
    const endpoint = url.pathname;
    const method = req.method;
    
    // Extract user info if available
    const userId = req.headers.get('x-user-id') || 'anonymous';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    let response: NextResponse;
    let statusCode = 500;
    let error: string | undefined;

    try {
      // Call the original handler
      response = await handler(req, ...args);
      statusCode = response.status;
    } catch (err: any) {
      error = err.message;
      statusCode = 500;
      response = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    const rateLimited = statusCode === 429;

    // Log the request
    apiAnalytics.logRequest({
      endpoint,
      method,
      userId,
      userAgent,
      ip,
      statusCode,
      responseTime,
      error,
      rateLimited
    });

    return response;
  };
}

// Helper to extract user ID from request
export function extractUserId(req: NextRequest): string | undefined {
  // Try to get from headers first
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  // Try to get from JWT token
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // In a real implementation, you'd decode the JWT here
      // For now, we'll use a placeholder
      return 'jwt-user';
    }
  } catch (error) {
    // Ignore JWT parsing errors
  }

  return undefined;
}
