// Bot Activity Monitoring Service
import { apiAnalytics } from './api-analytics-db';

export interface BotStatus {
  online: boolean;
  uptime: number;
  activeGuilds: number;
  totalUsers: number;
  commandsProcessed: number;
  memoryUsage: number;
  cpuUsage: number;
  lastActivity: number;
  version: string;
  nodeVersion: string;
}

export interface BotCommandActivity {
  command: string;
  userId: string;
  guildId: string;
  channelId: string;
  timestamp: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  args?: string[];
}

export interface BotHealthMetrics {
  websocketPing: number;
  apiLatency: number;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  activeVoiceConnections: number;
  queuedCommands: number;
  errorRate: number;
}

class BotMonitor {
  private static instance: BotMonitor;
  private botBaseUrl: string;
  private lastStatus: BotStatus | null = null;
  private recentActivities: BotCommandActivity[] = [];
  private healthMetrics: BotHealthMetrics | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.botBaseUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';
  }

  static getInstance(): BotMonitor {
    if (!BotMonitor.instance) {
      BotMonitor.instance = new BotMonitor();
    }
    return BotMonitor.instance;
  }

  // Start monitoring the bot
  startMonitoring(intervalMs: number = 30000): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    console.log(`🤖 [BOT-MONITOR] Starting bot monitoring every ${intervalMs}ms`);

    // Initial poll
    this.pollBotStatus();

    // Set up polling
    this.pollingInterval = setInterval(() => {
      this.pollBotStatus();
    }, intervalMs);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('🤖 [BOT-MONITOR] Stopped bot monitoring');
    }
  }

  // Poll bot status
  private async pollBotStatus(): Promise<void> {
    try {
      const startTime = Date.now();

      // Get bot status
      const statusResponse = await fetch(`${this.botBaseUrl}/api/status`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'ServerMate-E2E-Monitor/1.0'
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const responseTime = Date.now() - startTime;

        this.lastStatus = {
          online: true,
          uptime: statusData.uptime || 0,
          activeGuilds: statusData.guilds || 0,
          totalUsers: statusData.users || 0,
          commandsProcessed: statusData.commandsProcessed || 0,
          memoryUsage: statusData.memoryUsage || 0,
          cpuUsage: statusData.cpuUsage || 0,
          lastActivity: Date.now(),
          version: statusData.version || 'unknown',
          nodeVersion: statusData.nodeVersion || 'unknown'
        };

        // Log to analytics
        apiAnalytics.logRequest({
          id: `bot_status_${Date.now()}`,
          endpoint: '/api/bot/status',
          method: 'MONITOR',
          statusCode: 200,
          responseTime,
          environment: (process.env.NODE_ENV as any) || 'production',
          timestamp: new Date().toISOString(),
          botActivity: {
            botUptime: this.lastStatus.uptime,
            activeGuilds: this.lastStatus.activeGuilds,
            totalCommandsProcessed: this.lastStatus.commandsProcessed,
            memoryUsage: this.lastStatus.memoryUsage,
            cpuUsage: this.lastStatus.cpuUsage
          }
        }).catch(err => console.error('Failed to log bot status:', err));

        console.log(`🤖 [BOT-MONITOR] Bot status updated: ${this.lastStatus.activeGuilds} guilds, ${this.lastStatus.commandsProcessed} commands`);

      } else {
        console.warn(`🤖 [BOT-MONITOR] Bot status check failed: ${statusResponse.status}`);
        this.lastStatus = {
          ...this.lastStatus,
          online: false,
          lastActivity: Date.now()
        } as BotStatus;
      }

      // Get recent activities
      await this.pollBotActivities();

      // Get health metrics
      await this.pollHealthMetrics();

    } catch (error) {
      console.error('🤖 [BOT-MONITOR] Failed to poll bot status:', error);
      this.lastStatus = {
        ...this.lastStatus,
        online: false,
        lastActivity: Date.now()
      } as BotStatus;
    }
  }

  // Poll bot activities
  private async pollBotActivities(): Promise<void> {
    try {
      const activitiesResponse = await fetch(`${this.botBaseUrl}/api/activities?limit=10`, {
        timeout: 3000
      });

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        this.recentActivities = activitiesData.activities || [];

        // Log recent command activities
        this.recentActivities.forEach(activity => {
          apiAnalytics.logRequest({
            id: `bot_command_${activity.timestamp}_${activity.command}`,
            endpoint: `/bot/command/${activity.command}`,
            method: 'COMMAND',
            userId: activity.userId,
            statusCode: activity.success ? 200 : 500,
            responseTime: activity.responseTime,
            environment: (process.env.NODE_ENV as any) || 'production',
            timestamp: new Date(activity.timestamp).toISOString(),
            error: activity.errorMessage,
            botActivity: {
              commandUsed: activity.command,
              guildId: activity.guildId,
              channelId: activity.channelId,
              userId: activity.userId,
              responseTime: activity.responseTime,
              success: activity.success,
              errorMessage: activity.errorMessage
            }
          }).catch(err => console.error('Failed to log bot command:', err));
        });
      }
    } catch (error) {
      console.warn('🤖 [BOT-MONITOR] Failed to poll bot activities:', error);
    }
  }

  // Poll health metrics
  private async pollHealthMetrics(): Promise<void> {
    try {
      const healthResponse = await fetch(`${this.botBaseUrl}/api/health`, {
        timeout: 3000
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        this.healthMetrics = {
          websocketPing: healthData.websocketPing || 0,
          apiLatency: healthData.apiLatency || 0,
          memoryUsagePercent: healthData.memoryUsagePercent || 0,
          cpuUsagePercent: healthData.cpuUsagePercent || 0,
          activeVoiceConnections: healthData.activeVoiceConnections || 0,
          queuedCommands: healthData.queuedCommands || 0,
          errorRate: healthData.errorRate || 0
        };
      }
    } catch (error) {
      console.warn('🤖 [BOT-MONITOR] Failed to poll health metrics:', error);
    }
  }

  // Manual command tracking (for when bot sends data to web app)
  trackBotCommand(activity: BotCommandActivity): void {
    this.recentActivities.unshift(activity);

    // Keep only last 50 activities
    if (this.recentActivities.length > 50) {
      this.recentActivities = this.recentActivities.slice(0, 50);
    }

    console.log(`🤖 [BOT-MONITOR] Tracked command: ${activity.command} by ${activity.userId}`);

    // Log to analytics
    apiAnalytics.logRequest({
      id: `bot_command_manual_${activity.timestamp}_${activity.command}`,
      endpoint: `/bot/command/${activity.command}`,
      method: 'COMMAND',
      userId: activity.userId,
      statusCode: activity.success ? 200 : 500,
      responseTime: activity.responseTime,
      environment: (process.env.NODE_ENV as any) || 'production',
      timestamp: new Date(activity.timestamp).toISOString(),
      error: activity.errorMessage,
      botActivity: {
        commandUsed: activity.command,
        guildId: activity.guildId,
        channelId: activity.channelId,
        userId: activity.userId,
        responseTime: activity.responseTime,
        success: activity.success,
        errorMessage: activity.errorMessage
      }
    }).catch(err => console.error('Failed to log manual bot command:', err));
  }

  // Get current bot status
  getBotStatus(): BotStatus | null {
    return this.lastStatus;
  }

  // Get recent activities
  getRecentActivities(limit: number = 20): BotCommandActivity[] {
    return this.recentActivities.slice(0, limit);
  }

  // Get health metrics
  getHealthMetrics(): BotHealthMetrics | null {
    return this.healthMetrics;
  }

  // Check if bot is healthy
  isBotHealthy(): boolean {
    if (!this.lastStatus || !this.healthMetrics) return false;

    return (
      this.lastStatus.online &&
      this.healthMetrics.memoryUsagePercent < 90 &&
      this.healthMetrics.cpuUsagePercent < 80 &&
      this.healthMetrics.errorRate < 5 &&
      (Date.now() - this.lastStatus.lastActivity) < 60000 // Less than 1 minute since last activity
    );
  }

  // Get bot summary for monitoring dashboard
  getBotSummary(): {
    status: 'online' | 'offline' | 'degraded';
    uptime: string;
    activeGuilds: number;
    recentCommands: number;
    healthScore: number;
    lastActivity: number;
  } {
    if (!this.lastStatus) {
      return {
        status: 'offline',
        uptime: 'Unknown',
        activeGuilds: 0,
        recentCommands: 0,
        healthScore: 0,
        lastActivity: 0
      };
    }

    const isHealthy = this.isBotHealthy();
    const recentActivityCount = this.recentActivities.filter(
      activity => Date.now() - activity.timestamp < 300000 // Last 5 minutes
    ).length;

    let healthScore = 100;
    if (this.healthMetrics) {
      healthScore -= this.healthMetrics.memoryUsagePercent * 0.5;
      healthScore -= this.healthMetrics.cpuUsagePercent * 0.3;
      healthScore -= this.healthMetrics.errorRate * 2;
    }

    return {
      status: !this.lastStatus.online ? 'offline' : (isHealthy ? 'online' : 'degraded'),
      uptime: this.formatUptime(this.lastStatus.uptime),
      activeGuilds: this.lastStatus.activeGuilds,
      recentCommands: recentActivityCount,
      healthScore: Math.max(0, Math.min(100, healthScore)),
      lastActivity: this.lastStatus.lastActivity
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

// Global instance
export const botMonitor = BotMonitor.getInstance();

// Helper functions
export function startBotMonitoring(intervalMs?: number): void {
  botMonitor.startMonitoring(intervalMs);
}

export function stopBotMonitoring(): void {
  botMonitor.stopMonitoring();
}

export function trackBotCommand(activity: BotCommandActivity): void {
  botMonitor.trackBotCommand(activity);
}

export function getBotStatus(): BotStatus | null {
  return botMonitor.getBotStatus();
}

export function getBotHealth(): boolean {
  return botMonitor.isBotHealthy();
}

export function getBotSummary(): ReturnType<BotMonitor['getBotSummary']> {
  return botMonitor.getBotSummary();
}
