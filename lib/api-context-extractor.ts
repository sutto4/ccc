// API Context Extractor - Extracts contextual information from API requests
import { NextRequest } from 'next/server';

export interface APIContext {
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

export class APIContextExtractor {
  static extractContext(req: NextRequest, endpoint: string, method: string): APIContext {
    const context: APIContext = {};

    try {
      // Extract guild context from URL path
      const guildMatch = endpoint.match(/\/api\/guilds\/([^\/]+)/);
      if (guildMatch) {
        context.guildId = guildMatch[1];
        // TODO: Fetch guild name from Discord API or cache
        context.guildName = `Guild ${guildMatch[1]}`;
      }

      // Extract target user context
      const targetUserMatch = endpoint.match(/\/api\/guilds\/[^\/]+\/users\/([^\/]+)/);
      if (targetUserMatch) {
        context.targetUserId = targetUserMatch[1];
        // TODO: Fetch target user name from Discord API or cache
        context.targetUserName = `User ${targetUserMatch[1]}`;
      }

      // Extract channel context
      const channelMatch = endpoint.match(/\/api\/guilds\/[^\/]+\/channels\/([^\/]+)/);
      if (channelMatch) {
        context.targetChannelId = channelMatch[1];
        // TODO: Fetch channel name from Discord API or cache
        context.targetChannelName = `Channel ${channelMatch[1]}`;
      }

      // Determine action context based on endpoint and method
      context.actionContext = this.determineActionContext(endpoint, method);

      // Determine permission level based on endpoint
      context.permissionLevel = this.determinePermissionLevel(endpoint);

      // Determine user role (this would need to be fetched from Discord API)
      // For now, we'll set it based on the endpoint pattern
      context.userRole = this.determineUserRole(endpoint);

    } catch (error) {
      console.error('❌ Failed to extract API context:', error);
    }

    return context;
  }

  private static determineActionContext(endpoint: string, method: string): string {
    // Guild operations
    if (endpoint.includes('/api/guilds') && !endpoint.includes('/users') && !endpoint.includes('/channels')) {
      switch (method) {
        case 'GET': return 'guild_info_access';
        case 'PUT': return 'guild_settings_update';
        case 'POST': return 'guild_creation';
        case 'DELETE': return 'guild_deletion';
        default: return 'guild_operation';
      }
    }

    // User management
    if (endpoint.includes('/api/guilds') && endpoint.includes('/users')) {
      switch (method) {
        case 'GET': return 'user_info_access';
        case 'PUT': return 'user_permissions_update';
        case 'POST': return 'user_invite';
        case 'DELETE': return 'user_remove';
        default: return 'user_management';
      }
    }

    // Channel operations
    if (endpoint.includes('/api/guilds') && endpoint.includes('/channels')) {
      switch (method) {
        case 'GET': return 'channel_access';
        case 'PUT': return 'channel_settings_update';
        case 'POST': return 'channel_creation';
        case 'DELETE': return 'channel_deletion';
        default: return 'channel_operation';
      }
    }

    // Role operations
    if (endpoint.includes('/api/guilds') && endpoint.includes('/roles')) {
      switch (method) {
        case 'GET': return 'role_info_access';
        case 'PUT': return 'role_permissions_update';
        case 'POST': return 'role_creation';
        case 'DELETE': return 'role_deletion';
        default: return 'role_management';
      }
    }

    // Admin operations
    if (endpoint.includes('/api/admin')) {
      switch (method) {
        case 'GET': return 'admin_dashboard_access';
        case 'PUT': return 'admin_settings_update';
        case 'POST': return 'admin_action';
        case 'DELETE': return 'admin_data_deletion';
        default: return 'admin_operation';
      }
    }

    // Auth operations
    if (endpoint.includes('/api/auth')) {
      switch (method) {
        case 'GET': return 'auth_status_check';
        case 'POST': return 'user_authentication';
        case 'PUT': return 'auth_token_refresh';
        case 'DELETE': return 'user_logout';
        default: return 'authentication';
      }
    }

    // Analytics operations
    if (endpoint.includes('/api/analytics')) {
      return 'analytics_access';
    }

    // Default based on method
    switch (method) {
      case 'GET': return 'data_retrieval';
      case 'POST': return 'data_creation';
      case 'PUT': return 'data_update';
      case 'DELETE': return 'data_deletion';
      default: return 'api_request';
    }
  }

  private static determinePermissionLevel(endpoint: string): string {
    // Admin-only endpoints
    if (endpoint.includes('/api/admin')) {
      return 'admin';
    }

    // Analytics endpoints (admin only)
    if (endpoint.includes('/api/analytics')) {
      return 'admin';
    }

    // Guild management endpoints (moderator level)
    if (endpoint.includes('/api/guilds') && (
      endpoint.includes('/users') || 
      endpoint.includes('/roles') || 
      endpoint.includes('/channels')
    )) {
      return 'moderator';
    }

    // Guild info endpoints (member level)
    if (endpoint.includes('/api/guilds')) {
      return 'member';
    }

    // Auth endpoints (public)
    if (endpoint.includes('/api/auth')) {
      return 'public';
    }

    // Default for other endpoints
    return 'member';
  }

  private static determineUserRole(endpoint: string): string {
    // This is a simplified role determination
    // In a real implementation, you'd fetch the user's actual role from Discord API
    
    if (endpoint.includes('/api/admin')) {
      return 'admin';
    }

    if (endpoint.includes('/api/guilds') && (
      endpoint.includes('/users') || 
      endpoint.includes('/roles') ||
      endpoint.includes('/channels')
    )) {
      return 'moderator';
    }

    if (endpoint.includes('/api/guilds')) {
      return 'member';
    }

    if (endpoint.includes('/api/auth')) {
      return 'authenticated';
    }

    return 'user';
  }

  // Helper method to extract guild ID from various endpoint patterns
  static extractGuildId(endpoint: string): string | undefined {
    const patterns = [
      /\/api\/guilds\/([^\/]+)/,
      /\/guilds\/([^\/]+)/,
      /guild_id=([^&]+)/,
      /guildId=([^&]+)/
    ];

    for (const pattern of patterns) {
      const match = endpoint.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  // Helper method to extract user ID from various endpoint patterns
  static extractUserId(endpoint: string): string | undefined {
    const patterns = [
      /\/api\/guilds\/[^\/]+\/users\/([^\/]+)/,
      /\/users\/([^\/]+)/,
      /user_id=([^&]+)/,
      /userId=([^&]+)/
    ];

    for (const pattern of patterns) {
      const match = endpoint.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  // Helper method to extract channel ID from various endpoint patterns
  static extractChannelId(endpoint: string): string | undefined {
    const patterns = [
      /\/api\/guilds\/[^\/]+\/channels\/([^\/]+)/,
      /\/channels\/([^\/]+)/,
      /channel_id=([^&]+)/,
      /channelId=([^&]+)/
    ];

    for (const pattern of patterns) {
      const match = endpoint.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }
}
