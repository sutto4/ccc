// API Analytics and Monitoring
import { cache } from "@/lib/cache";

export interface APIStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  requestsByHour: Record<string, number>;
  lastUpdated: string;
}

export interface APIRequest {
  id: string;
  endpoint: string;
  method: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  error?: string;
  rateLimited?: boolean;
}

class APIAnalytics {
  private static instance: APIAnalytics;
  private stats: APIStats;
  private requests: APIRequest[] = [];
  private readonly MAX_REQUESTS = 10000; // Keep last 10k requests

  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      averageResponseTime: 0,
      requestsByEndpoint: {},
      requestsByUser: {},
      requestsByHour: {},
      lastUpdated: new Date().toISOString()
    };
  }

  static getInstance(): APIAnalytics {
    if (!APIAnalytics.instance) {
      APIAnalytics.instance = new APIAnalytics();
    }
    return APIAnalytics.instance;
  }

  logRequest(request: Omit<APIRequest, 'id' | 'timestamp'>): void {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH

    const fullRequest: APIRequest = {
      ...request,
      id,
      timestamp
    };

    // Add to requests array
    this.requests.push(fullRequest);
    
    // Keep only last MAX_REQUESTS
    if (this.requests.length > this.MAX_REQUESTS) {
      this.requests = this.requests.slice(-this.MAX_REQUESTS);
    }

    // Update stats
    this.updateStats(fullRequest, hour);

    // Cache the updated stats
    cache.set('api-analytics-stats', this.stats, 60 * 60 * 1000); // 1 hour
    cache.set('api-analytics-requests', this.requests, 60 * 60 * 1000); // 1 hour
  }

  private updateStats(request: APIRequest, hour: string): void {
    this.stats.totalRequests++;
    
    if (request.statusCode >= 200 && request.statusCode < 300) {
      this.stats.successfulRequests++;
    } else if (request.statusCode === 429) {
      this.stats.rateLimitedRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Update endpoint stats
    this.stats.requestsByEndpoint[request.endpoint] = (this.stats.requestsByEndpoint[request.endpoint] || 0) + 1;

    // Update user stats
    if (request.userId) {
      this.stats.requestsByUser[request.userId] = (this.stats.requestsByUser[request.userId] || 0) + 1;
    }

    // Update hourly stats
    this.stats.requestsByHour[hour] = (this.stats.requestsByHour[hour] || 0) + 1;

    // Update average response time
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + request.responseTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;

    this.stats.lastUpdated = new Date().toISOString();
  }

  getStats(): APIStats {
    return { ...this.stats };
  }

  getRecentRequests(limit: number = 100): APIRequest[] {
    return this.requests.slice(-limit).reverse();
  }

  getRequestsByEndpoint(endpoint: string): APIRequest[] {
    return this.requests.filter(req => req.endpoint === endpoint);
  }

  getRequestsByUser(userId: string): APIRequest[] {
    return this.requests.filter(req => req.userId === userId);
  }

  getHourlyStats(): Record<string, number> {
    return { ...this.stats.requestsByHour };
  }

  getTopEndpoints(limit: number = 10): Array<{ endpoint: string; count: number }> {
    return Object.entries(this.stats.requestsByEndpoint)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  getTopUsers(limit: number = 10): Array<{ userId: string; count: number }> {
    return Object.entries(this.stats.requestsByUser)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([userId, count]) => ({ userId, count }));
  }

  getSuccessRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return (this.stats.successfulRequests / this.stats.totalRequests) * 100;
  }

  getErrorRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return (this.stats.failedRequests / this.stats.totalRequests) * 100;
  }

  getRateLimitRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return (this.stats.rateLimitedRequests / this.stats.totalRequests) * 100;
  }

  // Clear old data (keep last 24 hours)
  cleanup(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.requests = this.requests.filter(req => new Date(req.timestamp) > oneDayAgo);
  }
}

export const apiAnalytics = APIAnalytics.getInstance();
