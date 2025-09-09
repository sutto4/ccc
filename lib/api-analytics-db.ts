// Database-backed API Analytics
import { query } from './db';

export interface APIRequest {
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
  timestamp: string;
  error?: string;
  rateLimited?: boolean;
  environment?: 'development' | 'production' | 'staging';
  instanceId?: string;
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
}

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

class DatabaseAnalytics {
  private static instance: DatabaseAnalytics;

  constructor() {
    // No need to initialize connection - we'll use the existing pool
  }

  static getInstance(): DatabaseAnalytics {
    if (!DatabaseAnalytics.instance) {
      DatabaseAnalytics.instance = new DatabaseAnalytics();
    }
    return DatabaseAnalytics.instance;
  }

  async logRequest(request: Omit<APIRequest, 'id' | 'timestamp'>): Promise<void> {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const timestamp = now.toISOString().replace('Z', '').replace('T', ' ').substring(0, 19); // Convert to MySQL format: YYYY-MM-DD HH:mm:ss

      const fullRequest: APIRequest = {
        ...request,
        id,
        timestamp
      };

      // Insert the request using existing pool
      await query(
        `INSERT INTO api_requests
         (id, endpoint, method, user_id, user_name, discord_id, user_agent, ip_address, status_code, response_time, error_message, rate_limited, environment, instance_id, request_headers, response_headers, request_body_size, response_body_size, guild_id, guild_name, user_role, permission_level, action_context, target_user_id, target_user_name, target_channel_id, target_channel_name, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fullRequest.id,
          fullRequest.endpoint,
          fullRequest.method,
          fullRequest.userId || null,
          fullRequest.userName || null,
          fullRequest.discordId || null,
          fullRequest.userAgent || null,
          fullRequest.ip || null,
          fullRequest.statusCode,
          fullRequest.responseTime,
          fullRequest.error || null,
          fullRequest.rateLimited ? 1 : 0,
          fullRequest.environment || 'production',
          fullRequest.instanceId || null,
          fullRequest.requestHeaders ? JSON.stringify(fullRequest.requestHeaders) : null,
          fullRequest.responseHeaders ? JSON.stringify(fullRequest.responseHeaders) : null,
          fullRequest.requestBodySize || null,
          fullRequest.responseBodySize || null,
          fullRequest.guildId || null,
          fullRequest.guildName || null,
          fullRequest.userRole || null,
          fullRequest.permissionLevel || null,
          fullRequest.actionContext || null,
          fullRequest.targetUserId || null,
          fullRequest.targetUserName || null,
          fullRequest.targetChannelId || null,
          fullRequest.targetChannelName || null,
          fullRequest.timestamp,
          fullRequest.timestamp // created_at uses the same timestamp
        ]
      );

      // Update hourly stats
      await this.updateHourlyStats(fullRequest);

    } catch (error) {
      console.error('❌ Failed to log analytics request:', error);
    }
  }

  private async updateHourlyStats(request: APIRequest): Promise<void> {
    try {
      const hourBucket = new Date(request.timestamp);
      hourBucket.setMinutes(0, 0, 0); // Round down to hour
      const hourBucketStr = hourBucket.toISOString().replace('Z', '').replace('T', ' ').substring(0, 19); // Convert to MySQL format

      const isSuccess = request.statusCode >= 200 && request.statusCode < 300;
      const isError = request.statusCode >= 400;
      const isRateLimited = request.rateLimited || request.statusCode === 429;

      // Update general hourly stats
      await query(
        `INSERT INTO api_hourly_stats 
         (hour_bucket, total_requests, successful_requests, failed_requests, rate_limited_requests, average_response_time, unique_users, unique_endpoints) 
         VALUES (?, 1, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         total_requests = total_requests + 1,
         successful_requests = successful_requests + ?,
         failed_requests = failed_requests + ?,
         rate_limited_requests = rate_limited_requests + ?,
         average_response_time = (average_response_time * (total_requests - 1) + ?) / total_requests,
         unique_users = unique_users + ?,
         unique_endpoints = unique_endpoints + ?,
         updated_at = CURRENT_TIMESTAMP`,
        [
          hourBucketStr,
          isSuccess ? 1 : 0,
          isError ? 1 : 0,
          isRateLimited ? 1 : 0,
          request.responseTime,
          request.userId ? 1 : 0,
          1, // unique endpoint
          isSuccess ? 1 : 0,
          isError ? 1 : 0,
          isRateLimited ? 1 : 0,
          request.responseTime,
          request.userId ? 1 : 0,
          1 // unique endpoint
        ]
      );

      // Update endpoint-specific stats
      await query(
        `INSERT INTO api_endpoint_stats 
         (endpoint, hour_bucket, request_count, success_count, error_count, avg_response_time) 
         VALUES (?, ?, 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         request_count = request_count + 1,
         success_count = success_count + ?,
         error_count = error_count + ?,
         avg_response_time = (avg_response_time * (request_count - 1) + ?) / request_count,
         updated_at = CURRENT_TIMESTAMP`,
        [
          request.endpoint,
          hourBucketStr,
          isSuccess ? 1 : 0,
          isError ? 1 : 0,
          request.responseTime,
          isSuccess ? 1 : 0,
          isError ? 1 : 0,
          request.responseTime
        ]
      );

      // Update user-specific stats (if user ID exists)
      if (request.userId) {
        await query(
          `INSERT INTO api_user_stats 
           (user_id, hour_bucket, request_count, unique_endpoints, avg_response_time) 
           VALUES (?, ?, 1, 1, ?)
           ON DUPLICATE KEY UPDATE
           request_count = request_count + 1,
           unique_endpoints = unique_endpoints + 1,
           avg_response_time = (avg_response_time * (request_count - 1) + ?) / request_count,
           updated_at = CURRENT_TIMESTAMP`,
          [
            request.userId,
            hourBucketStr,
            request.responseTime,
            request.responseTime
          ]
        );
      }

    } catch (error) {
      console.error('❌ Failed to update hourly stats:', error);
    }
  }

  async getStats(): Promise<APIStats> {
    try {
      // Get overall stats from the last 24 hours
      const rows = await query(
        `SELECT 
           COUNT(*) as total_requests,
           SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as successful_requests,
           SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as failed_requests,
           SUM(CASE WHEN rate_limited = 1 OR status_code = 429 THEN 1 ELSE 0 END) as rate_limited_requests,
           AVG(response_time) as average_response_time
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      );

      const stats = Array.isArray(rows) ? rows : [rows];
      const baseStats = stats[0] || {};

      // Get requests by endpoint
      const endpointRows = await query(
        `SELECT endpoint, COUNT(*) as count 
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY endpoint 
         ORDER BY count DESC 
         LIMIT 10`
      );

      // Get requests by user
      const userRows = await query(
        `SELECT user_id, COUNT(*) as count 
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
         AND user_id IS NOT NULL
         GROUP BY user_id 
         ORDER BY count DESC 
         LIMIT 10`
      );

      // Get requests by hour
      const hourRows = await query(
        `SELECT DATE_FORMAT(timestamp, '%Y-%m-%dT%H:00:00') as hour, COUNT(*) as count 
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY hour 
         ORDER BY hour`
      );

      const requestsByEndpoint: Record<string, number> = {};
      (Array.isArray(endpointRows) ? endpointRows : [endpointRows] as any[]).forEach((row: any) => {
        requestsByEndpoint[row.endpoint] = row.count;
      });

      const requestsByUser: Record<string, number> = {};
      (Array.isArray(userRows) ? userRows : [userRows] as any[]).forEach((row: any) => {
        requestsByUser[row.user_id] = row.count;
      });

      const requestsByHour: Record<string, number> = {};
      (Array.isArray(hourRows) ? hourRows : [hourRows] as any[]).forEach((row: any) => {
        requestsByHour[row.hour] = row.count;
      });

      return {
        totalRequests: Number(baseStats.total_requests) || 0,
        successfulRequests: Number(baseStats.successful_requests) || 0,
        failedRequests: Number(baseStats.failed_requests) || 0,
        rateLimitedRequests: Number(baseStats.rate_limited_requests) || 0,
        averageResponseTime: Number(baseStats.average_response_time) || 0,
        requestsByEndpoint,
        requestsByUser,
        requestsByHour,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to get analytics stats:', error);
      return this.getEmptyStats();
    }
  }

  async getRecentRequests(limit: number = 100): Promise<APIRequest[]> {
    try {
      // For now, let's use a simple query without parameters to test
      const rows = await query(
        `SELECT id, endpoint, method, user_id, user_name, discord_id, user_agent, ip_address, status_code, response_time, error_message, rate_limited, environment, instance_id, request_headers, response_headers, request_body_size, response_body_size, guild_id, guild_name, user_role, permission_level, action_context, target_user_id, target_user_name, target_channel_id, target_channel_name, timestamp
         FROM api_requests 
         ORDER BY timestamp DESC 
         LIMIT ${limit}`
      );

      return (Array.isArray(rows) ? rows : [rows] as any[]).map(row => ({
        id: row.id,
        endpoint: row.endpoint,
        method: row.method,
        userId: row.user_id,
        userName: row.user_name,
        discordId: row.discord_id,
        userAgent: row.user_agent,
        ip: row.ip_address,
        statusCode: row.status_code,
        responseTime: row.response_time,
        error: row.error_message,
        rateLimited: row.rate_limited === 1,
        environment: row.environment,
        instanceId: row.instance_id,
        requestHeaders: row.request_headers ? JSON.parse(row.request_headers) : undefined,
        responseHeaders: row.response_headers ? JSON.parse(row.response_headers) : undefined,
        requestBodySize: row.request_body_size,
        responseBodySize: row.response_body_size,
        guildId: row.guild_id,
        guildName: row.guild_name,
        userRole: row.user_role,
        permissionLevel: row.permission_level,
        actionContext: row.action_context,
        targetUserId: row.target_user_id,
        targetUserName: row.target_user_name,
        targetChannelId: row.target_channel_id,
        targetChannelName: row.target_channel_name,
        timestamp: row.timestamp
      }));

    } catch (error) {
      console.error('❌ Failed to get recent requests:', error);
      return [];
    }
  }

  async getTopEndpoints(limit: number = 10): Promise<Array<{ endpoint: string; count: number }>> {
    try {
      const rows = await query(
        `SELECT endpoint, COUNT(*) as count 
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY endpoint 
         ORDER BY count DESC 
         LIMIT ${limit}`
      );

      return (Array.isArray(rows) ? rows : [rows] as any[]).map(row => ({
        endpoint: row.endpoint,
        count: row.count
      }));

    } catch (error) {
      console.error('❌ Failed to get top endpoints:', error);
      return [];
    }
  }

  async getTopUsers(limit: number = 10): Promise<Array<{ userId: string; count: number }>> {
    try {
      const rows = await query(
        `SELECT user_id, COUNT(*) as count 
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
         AND user_id IS NOT NULL
         GROUP BY user_id 
         ORDER BY count DESC 
         LIMIT ${limit}`
      );

      return (Array.isArray(rows) ? rows : [rows] as any[]).map(row => ({
        userId: row.user_id,
        count: row.count
      }));

    } catch (error) {
      console.error('❌ Failed to get top users:', error);
      return [];
    }
  }

  async clearOldData(): Promise<void> {
    try {
      // Keep only last 30 days of detailed request data
      await query(
        'DELETE FROM api_requests WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
      );

      // Keep only last 90 days of hourly stats
      await query(
        'DELETE FROM api_hourly_stats WHERE hour_bucket < DATE_SUB(NOW(), INTERVAL 90 DAY)'
      );
      await query(
        'DELETE FROM api_endpoint_stats WHERE hour_bucket < DATE_SUB(NOW(), INTERVAL 90 DAY)'
      );
      await query(
        'DELETE FROM api_user_stats WHERE hour_bucket < DATE_SUB(NOW(), INTERVAL 90 DAY)'
      );

      console.log('✅ Cleaned up old analytics data');

    } catch (error) {
      console.error('❌ Failed to clean up old data:', error);
    }
  }

  async getHourlyStats(): Promise<Record<string, number>> {
    try {
      const rows = await query(
        `SELECT DATE_FORMAT(timestamp, '%Y-%m-%dT%H:00:00') as hour, COUNT(*) as count 
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY hour 
         ORDER BY hour`
      );

      const hourlyStats: Record<string, number> = {};
      (Array.isArray(rows) ? rows : [rows] as any[]).forEach((row: any) => {
        hourlyStats[row.hour] = row.count;
      });

      return hourlyStats;
    } catch (error) {
      console.error('❌ Failed to get hourly stats:', error);
      return {};
    }
  }

  getSuccessRate(stats: APIStats): number {
    if (stats.totalRequests === 0) return 0;
    return (stats.successfulRequests / stats.totalRequests) * 100;
  }

  getErrorRate(stats: APIStats): number {
    if (stats.totalRequests === 0) return 0;
    return (stats.failedRequests / stats.totalRequests) * 100;
  }

  getRateLimitRate(stats: APIStats): number {
    if (stats.totalRequests === 0) return 0;
    return (stats.rateLimitedRequests / stats.totalRequests) * 100;
  }

  private getEmptyStats(): APIStats {
    return {
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

}

export const apiAnalytics = DatabaseAnalytics.getInstance();
