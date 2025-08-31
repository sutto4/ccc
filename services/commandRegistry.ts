export class CommandRegistry {
  private commands = new Map<string, any>();
  private discordClient: any;

  constructor(discordClient: any) {
    this.discordClient = discordClient;
  }

  async registerCommands(guildId: string, features: string[]) {
    try {
      const commands = this.getCommandsForFeatures(features);
      
      console.log(`[COMMAND-REGISTRY] Registering commands for guild ${guildId}:`, commands);
      
      // Register commands with Discord API
      if (this.discordClient.application?.commands) {
        await this.discordClient.application.commands.set(commands, guildId);
        console.log(`[COMMAND-REGISTRY] Successfully registered ${commands.length} commands for guild ${guildId}`);
      } else {
        console.error('[COMMAND-REGISTRY] Discord client not ready');
      }
      
      // Update local registry
      this.commands.set(guildId, commands);
      
      return { success: true, commandsCount: commands.length };
    } catch (error) {
      console.error(`[COMMAND-REGISTRY] Error registering commands for guild ${guildId}:`, error);
      throw error;
    }
  }

  async unregisterCommands(guildId: string, features: string[]) {
    try {
      console.log(`[COMMAND-REGISTRY] Unregistering commands for guild ${guildId} features:`, features);
      
      // Remove commands from Discord API
      if (this.discordClient.application?.commands) {
        await this.discordClient.application.commands.set([], guildId);
        console.log(`[COMMAND-REGISTRY] Successfully unregistered all commands for guild ${guildId}`);
      }
      
      // Update local registry
      this.commands.delete(guildId);
      
      return { success: true };
    } catch (error) {
      console.error(`[COMMAND-REGISTRY] Error unregistering commands for guild ${guildId}:`, error);
      throw error;
    }
  }

  async updateGuildCommands(guildId: string, features: string[]) {
    try {
      console.log(`[COMMAND-REGISTRY] Updating commands for guild ${guildId} with features:`, features);
      
      // Get all commands for current features
      const commands = this.getCommandsForFeatures(features);
      
      // Update commands with Discord API
      if (this.discordClient.application?.commands) {
        await this.discordClient.application.commands.set(commands, guildId);
        console.log(`[COMMAND-REGISTRY] Successfully updated commands for guild ${guildId}:`, commands);
      }
      
      // Update local registry
      this.commands.set(guildId, commands);
      
      return { success: true, commandsCount: commands.length };
    } catch (error) {
      console.error(`[COMMAND-REGISTRY] Error updating commands for guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Get all commands that should be registered for a guild based on enabled features
   * This is called during bot startup to register commands
   */
  getCommandsForGuild(guildId: string, enabledFeatures: string[]) {
    const commands = this.getCommandsForFeatures(enabledFeatures);
    this.commands.set(guildId, commands);
    return commands;
  }

  /**
   * Get all commands for all guilds - used during bot startup
   */
  getAllGuildCommands(guildFeatures: Map<string, string[]>) {
    const allCommands = new Map<string, any>();
    
    for (const [guildId, features] of guildFeatures) {
      const commands = this.getCommandsForFeatures(features);
      allCommands.set(guildId, commands);
      this.commands.set(guildId, commands);
    }
    
    return allCommands;
  }

  /**
   * Get commands for a specific feature set
   */
  private getCommandsForFeatures(features: string[]) {
    const allCommands: any[] = [];
    
    if (features.includes('moderation')) {
      allCommands.push(
        { 
          name: 'warn', 
          description: 'Warn a user for breaking rules',
          options: [
            {
              name: 'user',
              description: 'The user to warn',
              type: 6, // USER type
              required: true
            },
            {
              name: 'reason',
              description: 'Reason for the warning',
              type: 3, // STRING type
              required: false
            }
          ]
        },
        { 
          name: 'kick', 
          description: 'Kick a user from the server',
          options: [
            {
              name: 'user',
              description: 'The user to kick',
              type: 6,
              required: true
            },
            {
              name: 'reason',
              description: 'Reason for the kick',
              type: 3,
              required: false
            }
          ]
        },
        { 
          name: 'ban', 
          description: 'Ban a user from the server',
          options: [
            {
              name: 'user',
              description: 'The user to ban',
              type: 6,
              required: true
            },
            {
              name: 'reason',
              description: 'Reason for the ban',
              type: 3,
              required: false
            },
            {
              name: 'duration',
              description: 'Duration of the ban (e.g., 7d, 30d)',
              type: 3,
              required: false
            }
          ]
        },
        { 
          name: 'mute', 
          description: 'Mute a user temporarily',
          options: [
            {
              name: 'user',
              description: 'The user to mute',
              type: 6,
              required: true
            },
            {
              name: 'duration',
              description: 'Duration of the mute (e.g., 1h, 24h)',
              type: 3,
              required: true
            },
            {
              name: 'reason',
              description: 'Reason for the mute',
              type: 3,
              required: false
            }
          ]
        }
      );
    }
    
    if (features.includes('reaction_roles')) {
      allCommands.push(
        { 
          name: 'role', 
          description: 'Manage reaction roles',
          options: [
            {
              name: 'action',
              description: 'Action to perform',
              type: 3,
              required: true,
              choices: [
                { name: 'add', value: 'add' },
                { name: 'remove', value: 'remove' },
                { name: 'list', value: 'list' }
              ]
            },
            {
              name: 'role',
              description: 'The role to manage',
              type: 8, // ROLE type
              required: false
            }
          ]
        }
      );
    }

    if (features.includes('custom_commands')) {
      allCommands.push(
        { 
          name: 'custom', 
          description: 'Execute a custom command',
          options: [
            {
              name: 'command',
              description: 'The custom command to execute',
              type: 3,
              required: true
            }
          ]
        }
      );
    }

    if (features.includes('verification_system')) {
      allCommands.push(
        { 
          name: 'sendverify', 
          description: 'Send verification message to a user',
          options: [
            {
              name: 'user',
              description: 'The user to send verification to',
              type: 6,
              required: true
            }
          ]
        },
        { 
          name: 'setverifylog', 
          description: 'Set the verification log channel',
          options: [
            {
              name: 'channel',
              description: 'The channel to log verifications',
              type: 7, // CHANNEL type
              required: true
            }
          ]
        }
      );
    }

    if (features.includes('feedback_system')) {
      allCommands.push(
        { 
          name: 'feedback', 
          description: 'Submit feedback about the server',
          options: [
            {
              name: 'message',
              description: 'Your feedback message',
              type: 3,
              required: true
            },
            {
              name: 'category',
              description: 'Feedback category',
              type: 3,
              required: false,
              choices: [
                { name: 'General', value: 'general' },
                { name: 'Bug Report', value: 'bug' },
                { name: 'Feature Request', value: 'feature' },
                { name: 'Complaint', value: 'complaint' }
              ]
            }
          ]
        }
      );
    }

    if (features.includes('embedded_messages')) {
      allCommands.push(
        { 
          name: 'embed', 
          description: 'Create an embedded message',
          options: [
            {
              name: 'title',
              description: 'Title of the embed',
              type: 3,
              required: false
            },
            {
              name: 'description',
              description: 'Description of the embed',
              type: 3,
              required: false
            },
            {
              name: 'color',
              description: 'Color of the embed (hex code)',
              type: 3,
              required: false
            }
          ]
        }
      );
    }

    return allCommands;
  }

  /**
   * Get currently registered commands for a guild
   */
  getRegisteredCommands(guildId: string) {
    return this.commands.get(guildId) || [];
  }

  /**
   * Get all registered guilds
   */
  getAllRegisteredGuilds() {
    return Array.from(this.commands.keys());
  }
}
