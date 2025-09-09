// Service Quota Tracking System
import { query } from './db';

export interface QuotaLimit {
  id: number;
  serviceName: string;
  quotaType: string;
  limitValue: number;
  windowSeconds: number;
  description: string;
  isActive: boolean;
}

export interface QuotaUsage {
  id: number;
  serviceName: string;
  quotaType: string;
  windowStart: string;
  windowEnd: string;
  currentUsage: number;
  limitValue: number;
  usagePercentage: number;
  isRateLimited: boolean;
  lastUpdated: string;
}

export interface QuotaStatus {
  serviceName: string;
  quotaType: string;
  limitValue: number;
  windowSeconds: number;
  description: string;
  currentUsage: number;
  usagePercentage: number;
  isRateLimited: boolean;
  status: 'good' | 'moderate' | 'warning' | 'critical';
  lastUpdated: string;
}

export interface QuotaViolation {
  id: number;
  serviceName: string;
  quotaType: string;
  violationType: 'rate_limit' | 'quota_exceeded' | 'burst_limit';
  requestedCount: number;
  availableCount: number;
  limitValue: number;
  windowStart: string;
  windowEnd: string;
  endpoint?: string;
  userId?: string;
  ipAddress?: string;
  createdAt: string;
}

class ServiceQuotaTracker {
  private static instance: ServiceQuotaTracker;

  static getInstance(): ServiceQuotaTracker {
    if (!ServiceQuotaTracker.instance) {
      ServiceQuotaTracker.instance = new ServiceQuotaTracker();
    }
    return ServiceQuotaTracker.instance;
  }

  // Track API usage against quotas
  async trackUsage(
    serviceName: string, 
    quotaType: string, 
    requestCount: number = 1,
    endpoint?: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      // Update quota usage
      await query(
        'CALL UpdateQuotaUsage(?, ?, ?)',
        [serviceName, quotaType, requestCount]
      );

      // Log additional context if provided
      if (endpoint || userId || ipAddress) {
        await this.logUsageContext(serviceName, quotaType, requestCount, endpoint, userId, ipAddress);
      }
    } catch (error) {
      console.error(`❌ Failed to track quota usage for ${serviceName}:${quotaType}:`, error);
    }
  }

  // Get current quota status for all services or specific service
  async getQuotaStatus(serviceName?: string): Promise<QuotaStatus[]> {
    try {
      const rows = await query(
        'CALL GetQuotaStatus(?)',
        [serviceName || null]
      );

      return (Array.isArray(rows) ? rows : [rows] as any[]).map(row => ({
        serviceName: row.service_name,
        quotaType: row.quota_type,
        limitValue: Number(row.limit_value),
        windowSeconds: Number(row.window_seconds),
        description: row.description,
        currentUsage: Number(row.current_usage),
        usagePercentage: Number(row.usage_percentage),
        isRateLimited: Boolean(row.is_rate_limited),
        status: row.status as 'good' | 'moderate' | 'warning' | 'critical',
        lastUpdated: row.last_updated
      }));
    } catch (error) {
      console.error('❌ Failed to get quota status:', error);
      return [];
    }
  }

  // Get quota violations
  async getQuotaViolations(
    serviceName?: string, 
    limit: number = 100
  ): Promise<QuotaViolation[]> {
    try {
      let sql = `
        SELECT id, service_name, quota_type, violation_type, requested_count, 
               available_count, limit_value, window_start, window_end, 
               endpoint, user_id, ip_address, created_at
        FROM quota_violations
      `;
      const params: any[] = [];

      if (serviceName) {
        sql += ' WHERE service_name = ?';
        params.push(serviceName);
      }

      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const rows = await query(sql, params);

      return (Array.isArray(rows) ? rows : [rows] as any[]).map(row => ({
        id: row.id,
        serviceName: row.service_name,
        quotaType: row.quota_type,
        violationType: row.violation_type,
        requestedCount: Number(row.requested_count),
        availableCount: Number(row.available_count),
        limitValue: Number(row.limit_value),
        windowStart: row.window_start,
        windowEnd: row.window_end,
        endpoint: row.endpoint,
        userId: row.user_id,
        ipAddress: row.ip_address,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('❌ Failed to get quota violations:', error);
      return [];
    }
  }

  // Get quota limits for a service
  async getQuotaLimits(serviceName: string): Promise<QuotaLimit[]> {
    try {
      const rows = await query(
        'SELECT id, service_name, quota_type, limit_value, window_seconds, description, is_active FROM service_quotas WHERE service_name = ? AND is_active = 1',
        [serviceName]
      );

      return (Array.isArray(rows) ? rows : [rows] as any[]).map(row => ({
        id: row.id,
        serviceName: row.service_name,
        quotaType: row.quota_type,
        limitValue: Number(row.limit_value),
        windowSeconds: Number(row.window_seconds),
        description: row.description,
        isActive: Boolean(row.is_active)
      }));
    } catch (error) {
      console.error('❌ Failed to get quota limits:', error);
      return [];
    }
  }

  // Check if a service is rate limited
  async isRateLimited(serviceName: string, quotaType: string): Promise<boolean> {
    try {
      const rows = await query(
        'SELECT is_rate_limited FROM service_usage WHERE service_name = ? AND quota_type = ? AND window_start <= NOW() AND window_end >= NOW()',
        [serviceName, quotaType]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        return Boolean(rows[0].is_rate_limited);
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to check rate limit status:', error);
      return false;
    }
  }

  // Get usage statistics for a service
  async getUsageStats(serviceName: string, hours: number = 24): Promise<{
    totalRequests: number;
    averageRequestsPerHour: number;
    peakUsage: number;
    violations: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  }> {
    try {
      // Get total requests from API analytics
      const [totalRows] = await query(
        `SELECT COUNT(*) as total_requests 
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR) 
         AND endpoint LIKE ?`,
        [hours, `%${serviceName}%`]
      );

      // Get violations
      const [violationRows] = await query(
        'SELECT COUNT(*) as violations FROM quota_violations WHERE service_name = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)',
        [serviceName, hours]
      );

      // Get top endpoints
      const endpointRows = await query(
        `SELECT endpoint, COUNT(*) as count 
         FROM api_requests 
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR) 
         AND endpoint LIKE ?
         GROUP BY endpoint 
         ORDER BY count DESC 
         LIMIT 10`,
        [hours, `%${serviceName}%`]
      );

      const totalRequests = Number(totalRows[0]?.total_requests) || 0;
      const violations = Number(violationRows[0]?.violations) || 0;

      return {
        totalRequests,
        averageRequestsPerHour: totalRequests / hours,
        peakUsage: 0, // TODO: Calculate peak usage
        violations,
        topEndpoints: (Array.isArray(endpointRows) ? endpointRows : [endpointRows] as any[]).map(row => ({
          endpoint: row.endpoint,
          count: Number(row.count)
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get usage stats:', error);
      return {
        totalRequests: 0,
        averageRequestsPerHour: 0,
        peakUsage: 0,
        violations: 0,
        topEndpoints: []
      };
    }
  }

  // Log usage context for detailed tracking
  private async logUsageContext(
    serviceName: string,
    quotaType: string,
    requestCount: number,
    endpoint?: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO quota_violations 
         (service_name, quota_type, violation_type, requested_count, available_count, limit_value, window_start, window_end, endpoint, user_id, ip_address)
         VALUES (?, ?, 'usage_tracking', ?, 0, 0, NOW(), NOW(), ?, ?, ?)`,
        [serviceName, quotaType, requestCount, endpoint, userId, ipAddress]
      );
    } catch (error) {
      console.error('❌ Failed to log usage context:', error);
    }
  }
}

export const serviceQuotas = ServiceQuotaTracker.getInstance();
