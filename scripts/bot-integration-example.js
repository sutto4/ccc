// Example: How to integrate Discord bot with E2E tracking
// This shows how your Discord bot can report activities to the web app

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:3000';

/**
 * Report bot command usage to E2E tracker
 * Call this whenever a user runs a command in Discord
 */
async function reportBotCommand(command, userId, guildId, channelId, responseTime, success, errorMessage = null, args = []) {
  try {
    const response = await fetch(`${WEB_APP_URL}/api/bot-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication if needed
        // 'Authorization': `Bearer ${process.env.BOT_API_KEY}`
      },
      body: JSON.stringify({
        command,
        userId,
        guildId,
        channelId,
        timestamp: Date.now(),
        responseTime,
        success,
        errorMessage,
        args
      })
    });

    if (response.ok) {
      console.log(`✅ Reported command "${command}" to E2E tracker`);
    } else {
      console.warn(`⚠️ Failed to report command to E2E tracker: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error reporting to E2E tracker:', error);
  }
}

/**
 * Report bot status/health to E2E tracker
 * Call this periodically (every 30-60 seconds)
 */
async function reportBotStatus() {
  try {
    const statusData = {
      online: true,
      uptime: process.uptime(), // seconds
      activeGuilds: client.guilds.cache.size,
      totalUsers: client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0),
      commandsProcessed: commandUsageCount,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: getCpuUsage(), // You'll need to implement this
      version: require('../package.json').version,
      nodeVersion: process.version
    };

    const response = await fetch(`${WEB_APP_URL}/api/bot-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusData)
    });

    if (response.ok) {
      console.log('✅ Bot status reported to E2E tracker');
    } else {
      console.warn(`⚠️ Failed to report bot status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error reporting bot status:', error);
  }
}

/**
 * Example Discord.js command handler with E2E tracking
 */
function createTrackedCommand(commandName, handler) {
  return async (interaction) => {
    const startTime = Date.now();

    try {
      // Execute the actual command
      await handler(interaction);

      const responseTime = Date.now() - startTime;

      // Report successful command execution
      await reportBotCommand(
        commandName,
        interaction.user.id,
        interaction.guild?.id,
        interaction.channel?.id,
        responseTime,
        true, // success
        null, // no error
        interaction.options?.data?.map(opt => opt.value?.toString()) || []
      );

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Report failed command execution
      await reportBotCommand(
        commandName,
        interaction.user.id,
        interaction.guild?.id,
        interaction.channel?.id,
        responseTime,
        false, // failed
        error.message,
        interaction.options?.data?.map(opt => opt.value?.toString()) || []
      );

      // Re-throw error for bot's error handling
      throw error;
    }
  };
}

// Example usage in your Discord bot:

// 1. When bot starts, set up periodic status reporting
client.once('ready', () => {
  console.log(`🤖 ${client.user.tag} is ready!`);

  // Report status every 30 seconds
  setInterval(reportBotStatus, 30000);

  // Initial status report
  reportBotStatus();
});

// 2. Wrap your commands with tracking
const pingCommand = createTrackedCommand('ping', async (interaction) => {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;

  await interaction.editReply(`🏓 Pong! Latency: ${latency}ms`);
});

// 3. Example of manual reporting for non-slash commands
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Example: Track a custom command
  if (message.content.startsWith('!hello')) {
    const startTime = Date.now();

    try {
      await message.reply('Hello there! 👋');

      await reportBotCommand(
        'hello',
        message.author.id,
        message.guild?.id,
        message.channel.id,
        Date.now() - startTime,
        true
      );
    } catch (error) {
      await reportBotCommand(
        'hello',
        message.author.id,
        message.guild?.id,
        message.channel.id,
        Date.now() - startTime,
        false,
        error.message
      );
    }
  }
});

// 4. Track voice state updates
client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.member?.id;
  const guildId = newState.guild?.id;

  if (userId && guildId) {
    // Track voice channel joins/leaves
    const action = !oldState.channel && newState.channel ? 'voice_join' :
                   oldState.channel && !newState.channel ? 'voice_leave' :
                   'voice_move';

    await reportBotCommand(
      action,
      userId,
      guildId,
      newState.channel?.id || oldState.channel?.id,
      0, // Instant action
      true,
      null,
      [newState.channel?.name || oldState.channel?.name]
    );
  }
});

// Helper function to get CPU usage (implement based on your needs)
function getCpuUsage() {
  // This is a simplified example - implement proper CPU monitoring
  const usage = process.cpuUsage();
  return (usage.user + usage.system) / 1000000; // Convert to seconds
}

module.exports = {
  reportBotCommand,
  reportBotStatus,
  createTrackedCommand
};
