import { NextRequest, NextResponse } from 'next/server';
import { SystemLogger } from '@/lib/system-logger';
import type { ActionType } from '@/lib/system-logger';

interface LoggingConfig {
  actionType: ActionType;
  actionName: string;
  targetType?: 'guild' | 'user' | 'role' | 'channel' | 'feature' | 'command' | 'setting' | 'system';
  extractTarget?: (request: NextRequest, params: any, body?: any) => { id: string; name: string };
  extractChanges?: (request: NextRequest, params: any, body?: any, response?: NextResponse) => { oldValue?: any; newValue?: any };
  enabled?: boolean;
}

export class LoggingMiddleware {
  
  /**
   * Wraps an API route handler with automatic logging
   */
  static withLogging(
    config: LoggingConfig,
    handler: (request: NextRequest, context: any) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context: any): Promise<NextResponse> => {
      if (!config.enabled && config.enabled !== undefined) {
        return handler(request, context);
      }

      const startTime = Date.now();
      let response: NextResponse;
      let error: Error | null = null;
      let requestBody: any = null;

      try {
        // Extract request body for logging (if JSON)
        if (request.headers.get('content-type')?.includes('application/json')) {
          try {
            const clonedRequest = request.clone();
            requestBody = await clonedRequest.json();
          } catch {
            // Ignore JSON parsing errors
          }
        }

        // Execute the original handler
        response = await handler(request, context);

        // Log successful action
        await this.logAction(request, context, config, requestBody, response, null);

        return response;
      } catch (err) {
        error = err as Error;
        
        // Create error response
        response = NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );

        // Log failed action
        await this.logAction(request, context, config, requestBody, response, error);

        throw error; // Re-throw the error
      }
    };
  }

  /**
   * Manual logging method for complex scenarios
   */
  static async logAction(
    request: NextRequest,
    context: any,
    config: LoggingConfig,
    requestBody?: any,
    response?: NextResponse,
    error?: Error | null
  ): Promise<void> {
    try {
      const user = await SystemLogger.getUserFromRequest(request);
      if (!user?.discordId) {
        return; // Can't log without user context
      }

      const { params } = context;
      const guildId = params?.id || requestBody?.guildId;
      if (!guildId) {
        return; // Can't log without guild context
      }

      // Extract target information
      let targetId: string | undefined;
      let targetName: string | undefined;
      
      if (config.extractTarget) {
        const target = config.extractTarget(request, params, requestBody);
        targetId = target.id;
        targetName = target.name;
      } else if (params?.id) {
        targetId = params.id;
      }

      // Extract change information
      let oldValue: any;
      let newValue: any;
      
      if (config.extractChanges) {
        const changes = config.extractChanges(request, params, requestBody, response);
        oldValue = changes.oldValue;
        newValue = changes.newValue;
      } else if (requestBody) {
        newValue = requestBody;
      }

      // Log the action
      await SystemLogger.log({
        guildId,
        userId: user.discordId,
        userName: user.name || 'Unknown',
        userEmail: user.email,
        userRole: user.role,
        actionType: config.actionType,
        actionName: config.actionName,
        targetType: config.targetType,
        targetId,
        targetName,
        oldValue,
        newValue,
        status: error ? 'failed' : 'success',
        errorMessage: error?.message,
        request
      });
    } catch (logError) {
      console.error('[LOGGING-MIDDLEWARE] Failed to log action:', logError);
    }
  }
}

/**
 * Pre-configured logging decorators for common actions
 */
export const LogFeatureToggle = (handler: any) => 
  LoggingMiddleware.withLogging({
    actionType: 'feature_toggle',
    actionName: 'toggle_feature',
    targetType: 'feature',
    extractTarget: (req, params, body) => ({
      id: body?.featureKey || body?.feature || 'unknown',
      name: body?.featureName || body?.feature || 'unknown'
    }),
    extractChanges: (req, params, body) => ({
      newValue: { enabled: body?.enabled }
    })
  }, handler);

export const LogRolePermissions = (handler: any) =>
  LoggingMiddleware.withLogging({
    actionType: 'role_permission',
    actionName: 'update_role_permissions',
    targetType: 'role',
    extractTarget: (req, params, body) => ({
      id: body?.roleId || params?.roleId || 'unknown',
      name: body?.roleName || 'unknown'
    }),
    extractChanges: (req, params, body) => ({
      oldValue: body?.oldPermissions,
      newValue: body?.newPermissions || body?.permissions
    })
  }, handler);

export const LogUserManagement = (actionName: string) => (handler: any) =>
  LoggingMiddleware.withLogging({
    actionType: 'user_management',
    actionName,
    targetType: 'user',
    extractTarget: (req, params, body) => ({
      id: body?.userId || params?.userId || 'unknown',
      name: body?.userName || 'unknown'
    })
  }, handler);

export const LogBotConfig = (actionName: string) => (handler: any) =>
  LoggingMiddleware.withLogging({
    actionType: 'bot_config',
    actionName,
    targetType: 'guild'
  }, handler);
