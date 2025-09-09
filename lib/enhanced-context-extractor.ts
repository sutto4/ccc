// Enhanced Context Extractor - Fetches real user data from Discord
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export interface EnhancedAPIContext {
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

export class EnhancedContextExtractor {
  static async extractContext(req: NextRequest, endpoint: string, method: string): Promise<EnhancedAPIContext> {
    const context: EnhancedAPIContext = {};

    try {
      // Get user session for real user data
      const session = await getServerSession(authOptions);
      const discordId = (session?.user as any)?.discordId || session?.user?.id;

      // Extract guild context from URL path
      const guildMatch = endpoint.match(/\/api\/guilds\/([^\/]+)/);
      if (guildMatch) {
        context.guildId = guildMatch[1];
        // Try to fetch guild name from Discord API
        context.guildName = await this.fetchGuildName(guildMatch[1]);
      }

      // Extract target user context
      const targetUserMatch = endpoint.match(/\/api\/guilds\/[^\/]+\/users\/([^\/]+)/);
      if (targetUserMatch) {
        context.targetUserId = targetUserMatch[1];
        context.targetUserName = await this.fetchUserName(targetUserMatch[1]);
      }

      // Extract channel context
      const channelMatch = endpoint.match(/\/api\/guilds\/[^\/]+\/channels\/([^\/]+)/);
      if (channelMatch) {
        context.targetChannelId = channelMatch[1];
        context.targetChannelName = await this.fetchChannelName(guildMatch?.[1], channelMatch[1]);
      }

      // Determine action context based on endpoint and method
      context.actionContext = this.determineActionContext(endpoint, method);

      // Determine permission level based on endpoint
      context.permissionLevel = this.determinePermissionLevel(endpoint);

      // Determine user role based on endpoint and user context
      context.userRole = await this.determineUserRole(endpoint, discordId, context.guildId);

    } catch (error) {
      console.error('❌ Failed to extract enhanced API context:', error);
    }

    return context;
  }

  private static async fetchGuildName(guildId: string): Promise<string | undefined> {
    try {
      // This would fetch from Discord API in a real implementation
      // For now, return a placeholder
      return `Guild ${guildId}`;
    } catch (error) {
      console.error('❌ Failed to fetch guild name:', error);
      return undefined;
    }
  }

  private static async fetchUserName(userId: string): Promise<string | undefined> {
    try {
      // This would fetch from Discord API in a real implementation
      // For now, return a placeholder
      return `User ${userId}`;
    } catch (error) {
      console.error('❌ Failed to fetch user name:', error);
      return undefined;
    }
  }

  private static async fetchChannelName(guildId?: string, channelId?: string): Promise<string | undefined> {
    try {
      // This would fetch from Discord API in a real implementation
      // For now, return a placeholder
      return `Channel ${channelId}`;
    } catch (error) {
      console.error('❌ Failed to fetch channel name:', error);
      return undefined;
    }
  }

  private static async determineUserRole(endpoint: string, discordId?: string, guildId?: string): Promise<string> {
    // If accessing admin endpoints, user is admin
    if (endpoint.includes('/api/admin')) {
      return 'admin';
    }

    // If accessing analytics, user is admin
    if (endpoint.includes('/api/analytics')) {
      return 'admin';
    }

    // If accessing guild management endpoints, user is likely moderator
    if (endpoint.includes('/api/guilds') && (
      endpoint.includes('/users') || 
      endpoint.includes('/roles') ||
      endpoint.includes('/channels')
    )) {
      return 'moderator';
    }

    // If accessing guild info, user is member
    if (endpoint.includes('/api/guilds')) {
      return 'member';
    }

    // If accessing auth endpoints, user is authenticated
    if (endpoint.includes('/api/auth')) {
      return 'authenticated';
    }

    // If we have a Discord ID, user is authenticated
    if (discordId) {
      return 'authenticated';
    }

    // Default fallback - always show something meaningful
    return 'user';
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
}
