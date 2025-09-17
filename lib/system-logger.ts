import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// Safe JSON parsing helper
function parseJsonField(value: any): any {
  if (!value) return null;
  if (typeof value === 'object') return value; // Already parsed
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as string if not valid JSON
    }
  }
  return value;
}

// Type definitions for type safety
export type ActionType = 
  | 'feature_toggle' | 'feature_config' | 'command_toggle' | 'role_permission' | 'user_management'
  | 'bot_config' | 'channel_config' | 'message_config' | 'creator_alert'
  | 'moderation_action' | 'system_setting' | 'data_export' | 'api_access'
  | 'login' | 'logout' | 'other';

export type TargetType = 'guild' | 'user' | 'role' | 'channel' | 'feature' | 'command' | 'setting' | 'system';

export type LogStatus = 'success' | 'failed' | 'pending';

export interface LogContext {
  guildId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  actionType: ActionType;
  actionName: string;
  targetType?: TargetType;
  targetId?: string;
  targetName?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  status?: LogStatus;
  errorMessage?: string;
  request?: NextRequest;
}

export interface LogFilter {
  guildId?: string;
  userId?: string;
  actionType?: ActionType[];
  targetType?: TargetType[];
  status?: LogStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export class SystemLogger {
  
  /**
   * Main logging function - handles all log entries
   */
  static async log(context: LogContext): Promise<boolean> {
    try {
      // Extract metadata from request if provided
      const metadata = {
        ...context.metadata,
        ...(context.request && {
          ip: this.getClientIP(context.request),
          userAgent: context.request.headers.get('user-agent')?.substring(0, 500),
          method: context.request.method,
          url: context.request.url,
          timestamp: new Date().toISOString()
        })
      };

      // Enhance user name with Discord username if available
      let enhancedUserName = context.userName;
      if (context.userName === 'Unknown User' && context.userId) {
        // Try to get Discord username from the user_id if it's a Discord ID
        try {
          const userResult = await query(
            'SELECT discord_username FROM users WHERE discord_id = ? LIMIT 1',
            [context.userId]
          );
          if (userResult.length > 0 && userResult[0].discord_username) {
            enhancedUserName = userResult[0].discord_username;
          }
        } catch (error) {
          // Ignore errors, use original name
        }
      }

      // Enhance target name with Discord username for user targets
      let enhancedTargetName = context.targetName;
      if (context.targetType === 'user' && context.targetId && !context.targetName?.includes('@')) {
        try {
          const targetResult = await query(
            'SELECT discord_username FROM users WHERE discord_id = ? LIMIT 1',
            [context.targetId]
          );
          if (targetResult.length > 0 && targetResult[0].discord_username) {
            enhancedTargetName = `${targetResult[0].discord_username} (${context.targetId})`;
          }
        } catch (error) {
          // Ignore errors, use original name
        }
      }

      await query(`
        INSERT INTO system_logs (
          guild_id, user_id, user_name, user_email, user_role,
          action_type, action_name, target_type, target_id, target_name,
          old_value, new_value, metadata, status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        context.guildId,
        context.userId,
        enhancedUserName,
        context.userEmail || null,
        context.userRole || 'viewer',
        context.actionType,
        context.actionName,
        context.targetType || 'system',
        context.targetId || null,
        enhancedTargetName || null,
        context.oldValue ? JSON.stringify(context.oldValue) : null,
        context.newValue ? JSON.stringify(context.newValue) : null,
        JSON.stringify(metadata),
        context.status || 'success',
        context.errorMessage || null
      ]);

      return true;
    } catch (error) {
      console.error('[SYSTEM-LOG] Failed to log action:', error);
      return false;
    }
  }

  /**
   * Convenience method for feature toggle logging
   */
  static async logFeatureToggle(
    guildId: string,
    user: any,
    featureName: string,
    enabled: boolean,
    request?: NextRequest
  ): Promise<boolean> {
    return this.log({
      guildId,
      userId: user.discordId || user.id,
      userName: user.name || user.discordUsername || 'Unknown',
      userEmail: user.email,
      userRole: user.role,
      actionType: 'feature_toggle',
      actionName: enabled ? 'enable_feature' : 'disable_feature',
      targetType: 'feature',
      targetId: featureName,
      targetName: featureName,
      newValue: { enabled },
      request
    });
  }

  /**
   * Convenience method for user login events
   */
  static async logUserLogin(
    user: { id: string; name?: string | null; email?: string | null; role?: string | null },
    request?: NextRequest
  ): Promise<boolean> {
    return this.log({
      guildId: 'system',
      userId: user.id,
      userName: user.name || 'Unknown User',
      userEmail: user.email || undefined,
      userRole: user.role || 'viewer',
      actionType: 'login',
      actionName: 'user_login',
      targetType: 'user',
      targetId: user.id,
      targetName: user.name || undefined,
      request
    });
  }

  /**
   * Convenience method for when a guild is added (bot invited / onboarding)
   */
  static async logGuildAdded(
    guildId: string,
    actor: { id: string; name?: string | null; email?: string | null; role?: string | null } | null,
    guildName?: string | null,
    request?: NextRequest
  ): Promise<boolean> {
    return this.log({
      guildId,
      userId: actor?.id || 'system',
      userName: actor?.name || 'System',
      userEmail: actor?.email || undefined,
      userRole: actor?.role || 'viewer',
      actionType: 'system_setting',
      actionName: 'guild_added',
      targetType: 'guild',
      targetId: guildId,
      targetName: guildName || undefined,
      request
    });
  }

  /**
   * Convenience method for when a guild is removed (bot removed / server left)
   */
  static async logGuildRemoved(
    guildId: string,
    actor: { id: string; name?: string | null; email?: string | null; role?: string | null } | null,
    guildName?: string | null,
    request?: NextRequest
  ): Promise<boolean> {
    return this.log({
      guildId,
      userId: actor?.id || 'system',
      userName: actor?.name || 'System',
      userEmail: actor?.email || undefined,
      userRole: actor?.role || 'viewer',
      actionType: 'system_setting',
      actionName: 'guild_removed',
      targetType: 'guild',
      targetId: guildId,
      targetName: guildName || undefined,
      request
    });
  }

  /**
   * Convenience method for role permission changes
   */
  static async logRolePermission(
    guildId: string,
    user: any,
    roleId: string,
    roleName: string,
    oldPermissions: any,
    newPermissions: any,
    request?: NextRequest
  ): Promise<boolean> {
    return this.log({
      guildId,
      userId: user.discordId || user.id,
      userName: user.name || user.discordUsername || 'Unknown',
      userEmail: user.email,
      userRole: user.role,
      actionType: 'role_permission',
      actionName: 'update_role_permissions',
      targetType: 'role',
      targetId: roleId,
      targetName: roleName,
      oldValue: oldPermissions,
      newValue: newPermissions,
      request
    });
  }

  /**
   * Convenience method for user management actions
   */
  static async logUserAction(
    guildId: string,
    actor: any,
    targetUserId: string,
    targetUserName: string,
    action: string,
    details?: any,
    request?: NextRequest
  ): Promise<boolean> {
    return this.log({
      guildId,
      userId: actor.discordId || actor.id,
      userName: actor.name || actor.discordUsername || 'Unknown',
      userEmail: actor.email,
      userRole: actor.role,
      actionType: 'user_management',
      actionName: action,
      targetType: 'user',
      targetId: targetUserId,
      targetName: targetUserName,
      newValue: details,
      request
    });
  }

  /**
   * Query logs with filtering and pagination
   */
  static async queryLogs(filter: LogFilter = {}): Promise<{logs: any[], total: number}> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];

      // Build WHERE conditions
      if (filter.guildId) {
        conditions.push('guild_id = ?');
        params.push(filter.guildId);
      }

      if (filter.userId) {
        conditions.push('user_id = ?');
        params.push(filter.userId);
      }

      if (filter.actionType?.length) {
        conditions.push(`action_type IN (${filter.actionType.map(() => '?').join(',')})`);
        params.push(...filter.actionType);
      }

      if (filter.targetType?.length) {
        conditions.push(`target_type IN (${filter.targetType.map(() => '?').join(',')})`);
        params.push(...filter.targetType);
      }

      if (filter.status?.length) {
        conditions.push(`status IN (${filter.status.map(() => '?').join(',')})`);
        params.push(...filter.status);
      }

      if (filter.dateFrom) {
        conditions.push('created_at >= ?');
        params.push(filter.dateFrom);
      }

      if (filter.dateTo) {
        conditions.push('created_at <= ?');
        params.push(filter.dateTo);
      }

      if (filter.search) {
        conditions.push('(sl.user_name LIKE ? OR sl.action_name LIKE ? OR sl.target_name LIKE ? OR g.guild_name LIKE ?)');
        const searchTerm = `%${filter.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ').replace(/guild_id/g, 'sl.guild_id').replace(/user_id/g, 'sl.user_id').replace(/action_type/g, 'sl.action_type').replace(/target_type/g, 'sl.target_type').replace(/status/g, 'sl.status').replace(/created_at/g, 'sl.created_at')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM system_logs sl ${whereClause}`;
      const countResult = await query(countQuery, params) as any[];
      const total = countResult[0]?.total || 0;

      // Get paginated results
      const limit = filter.limit || 50;
      const offset = filter.offset || 0;

      const logsQuery = `
        SELECT 
          sl.id, sl.guild_id, sl.user_id, sl.user_name, sl.user_email, sl.user_role,
          sl.action_type, sl.action_name, sl.target_type, sl.target_id, sl.target_name,
          sl.old_value, sl.new_value, sl.metadata, sl.status, sl.error_message, sl.created_at,
          g.guild_name
        FROM system_logs sl
        LEFT JOIN guilds g ON sl.guild_id = g.guild_id
        ${whereClause}
        ORDER BY sl.created_at DESC
        LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
      `;

      const logs = await query(logsQuery, params) as any[];

      // Parse JSON fields safely
      const parsedLogs = logs.map(log => ({
        ...log,
        old_value: parseJsonField(log.old_value),
        new_value: parseJsonField(log.new_value),
        metadata: parseJsonField(log.metadata)
      }));

      return { logs: parsedLogs, total };
    } catch (error) {
      console.error('[SYSTEM-LOG] Failed to query logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get user from request (helper method)
   */
  static async getUserFromRequest(request: NextRequest): Promise<any> {
    try {
      const session = await getServerSession(authOptions);
      return {
        discordId: (session as any)?.discordId,
        name: session?.user?.name,
        email: session?.user?.email,
        role: (session as any)?.role || 'viewer'
      };
    } catch (error) {
      console.error('[SYSTEM-LOG] Failed to get user from request:', error);
      return null;
    }
  }

  /**
   * Extract client IP from request
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddress = request.headers.get('x-vercel-forwarded-for');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || remoteAddress || 'unknown';
  }
}

// Export convenience functions
export const logFeatureToggle = SystemLogger.logFeatureToggle.bind(SystemLogger);
export const logRolePermission = SystemLogger.logRolePermission.bind(SystemLogger);
export const logUserAction = SystemLogger.logUserAction.bind(SystemLogger);
export const queryLogs = SystemLogger.queryLogs.bind(SystemLogger);
