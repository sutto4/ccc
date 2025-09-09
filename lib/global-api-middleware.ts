// Global API Middleware for Comprehensive Analytics
import { NextRequest, NextResponse } from 'next/server';
import { apiAnalytics } from './api-analytics-db';
import { serviceQuotas } from './service-quotas';
import { EnhancedContextExtractor } from './enhanced-context-extractor';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// Generate unique instance ID for this server instance
const INSTANCE_ID = `${process.env.NODE_ENV || 'production'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export interface EnhancedAPIRequest {
  id: string;
  endpoint: string;
  method: string;
  userId?: string;
  userName?: string;
  discordId?: string;
  userAgent?: string;
  ip?: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  rateLimited?: boolean;
  environment: 'development' | 'production' | 'staging';
  instanceId: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBodySize?: number;
  responseBodySize?: number;
  guildId?: string;
  guildName?: string;
  userRole?: string;
  permissionLevel?: string;
  actionContext?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetChannelId?: string;
  targetChannelName?: string;
  timestamp: string;
}

class GlobalAPIMiddleware {
  private static instance: GlobalAPIMiddleware;

  static getInstance(): GlobalAPIMiddleware {
    if (!GlobalAPIMiddleware.instance) {
      GlobalAPIMiddleware.instance = new GlobalAPIMiddleware();
    }
    return GlobalAPIMiddleware.instance;
  }

  async withAnalytics(handler: Function) {
    return async (req: NextRequest, ...args: any[]) => {
      const startTime = Date.now();
      const url = new URL(req.url);
      const endpoint = url.pathname;
      const method = req.method;
      
      // Extract IP address (handle various proxy scenarios)
      const ip = this.extractIPAddress(req);
      
      // Extract user agent
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      // Extract request headers (sanitized)
      const requestHeaders = this.sanitizeHeaders(req.headers);
      
      // Get request body size
      const requestBodySize = await this.getRequestBodySize(req);
      
      // Get user information from session
      const userInfo = await this.extractUserInfo(req);
      
      let response: NextResponse;
      let statusCode = 500;
      let error: string | undefined;
      let responseHeaders: Record<string, string> = {};
      let responseBodySize: number = 0;

      try {
        // Call the original handler
        response = await handler(req, ...args);
        statusCode = response.status;
        
        // Extract response headers
        responseHeaders = this.sanitizeHeaders(response.headers);
        
        // Get response body size (approximate)
        responseBodySize = await this.getResponseBodySize(response);

      } catch (err: any) {
        error = err.message;
        statusCode = 500;
        response = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }

      const responseTime = Date.now() - startTime;
      const rateLimited = statusCode === 429;

      // Extract contextual information
      const context = await EnhancedContextExtractor.extractContext(req, endpoint, method);

      // Create enhanced request log
      const enhancedRequest: Omit<EnhancedAPIRequest, 'id' | 'timestamp'> = {
        endpoint,
        method,
        userId: userInfo.userId,
        userName: userInfo.userName,
        discordId: userInfo.discordId,
        userAgent,
        ip,
        statusCode,
        responseTime,
        error,
        rateLimited,
        environment: (process.env.NODE_ENV as 'development' | 'production' | 'staging') || 'production',
        instanceId: INSTANCE_ID,
        requestHeaders,
        responseHeaders,
        requestBodySize,
        responseBodySize,
        guildId: context.guildId,
        guildName: context.guildName,
        userRole: context.userRole,
        permissionLevel: context.permissionLevel,
        actionContext: context.actionContext,
        targetUserId: context.targetUserId,
        targetUserName: context.targetUserName,
        targetChannelId: context.targetChannelId,
        targetChannelName: context.targetChannelName
      };

      // Log to database (async, don't wait) - use setImmediate to prevent blocking
      setImmediate(() => {
        this.logRequestAsync(enhancedRequest).catch(error => {
          console.error('❌ Failed to log analytics request:', error);
        });
      });

      // Track quota usage (async, don't wait)
      setImmediate(() => {
        this.trackQuotaUsage(enhancedRequest).catch(error => {
          console.error('❌ Failed to track quota usage:', error);
        });
      });

      return response;
    };
  }

  private async extractUserInfo(req: NextRequest): Promise<{
    userId?: string;
    userName?: string;
    discordId?: string;
  }> {
    try {
      // Try to get session from NextAuth
      const session = await getServerSession(authOptions);
      
      if (session?.user) {
        return {
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'Unknown',
          discordId: (session.user as any).discordId || session.user.id
        };
      }

      // Try to extract from Authorization header (JWT)
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        // In a real implementation, you'd decode the JWT here
        // For now, we'll extract what we can from headers
        const userId = req.headers.get('x-user-id');
        const userName = req.headers.get('x-user-name');
        const discordId = req.headers.get('x-discord-id');
        
        return {
          userId: userId || undefined,
          userName: userName || undefined,
          discordId: discordId || undefined
        };
      }

      // Try to extract from cookies
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        // Look for NextAuth session cookie
        const sessionMatch = cookieHeader.match(/next-auth\.session-token=([^;]+)/);
        if (sessionMatch) {
          // In a real implementation, you'd decode the session token
          // For now, we'll return anonymous
          return {};
        }
      }

      return {};
    } catch (error) {
      console.error('❌ Failed to extract user info:', error);
      return {};
    }
  }

  private extractIPAddress(req: NextRequest): string {
    // Check various headers for real IP (handles proxies, load balancers, etc.)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    const clientIP = req.headers.get('x-client-ip');
    
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return forwardedFor.split(',')[0].trim();
    }
    
    if (realIP) return realIP;
    if (cfConnectingIP) return cfConnectingIP;
    if (clientIP) return clientIP;
    
    // Fallback to connection remote address (if available)
    return req.ip || 'unknown';
  }

  private sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-refresh-token'
    ];

    headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  private async getRequestBodySize(req: NextRequest): Promise<number> {
    try {
      const contentLength = req.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
      
      // If no content-length header, try to read the body
      const body = await req.text();
      return body.length;
    } catch (error) {
      return 0;
    }
  }

  private async getResponseBodySize(response: NextResponse): Promise<number> {
    try {
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
      
      // If no content-length header, try to read the body
      const body = await response.text();
      return body.length;
    } catch (error) {
      return 0;
    }
  }

  private async logRequestAsync(request: Omit<EnhancedAPIRequest, 'id' | 'timestamp'>): Promise<void> {
    try {
      await apiAnalytics.logRequest(request);
    } catch (error) {
      console.error('❌ Failed to log API request:', error);
    }
  }

  private async trackQuotaUsage(request: Omit<EnhancedAPIRequest, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Determine service based on endpoint
      let serviceName = 'unknown';
      let quotaType = 'api_requests';

      if (request.endpoint.includes('/api/guilds')) {
        serviceName = 'discord';
        quotaType = 'guild_operations';
      } else if (request.endpoint.includes('/api/user')) {
        serviceName = 'discord';
        quotaType = 'user_operations';
      } else if (request.endpoint.includes('/api/admin')) {
        serviceName = 'discord';
        quotaType = 'admin_operations';
      } else if (request.endpoint.includes('/api/auth')) {
        serviceName = 'discord';
        quotaType = 'auth_operations';
      } else if (request.endpoint.includes('/api/stripe')) {
        serviceName = 'stripe';
        quotaType = 'api_requests';
      } else if (request.endpoint.includes('/api/email')) {
        serviceName = 'email';
        quotaType = 'api_requests';
      } else if (request.endpoint.includes('/api/')) {
        serviceName = 'discord';
        quotaType = 'api_requests';
      }

      // Track the usage
      await serviceQuotas.trackUsage(
        serviceName,
        quotaType,
        1, // request count
        request.endpoint,
        request.userId,
        request.ip
      );
    } catch (error) {
      console.error('❌ Failed to track quota usage:', error);
    }
  }
}

export const globalAPIMiddleware = GlobalAPIMiddleware.getInstance();
export const withGlobalAnalytics = globalAPIMiddleware.withAnalytics.bind(globalAPIMiddleware);
