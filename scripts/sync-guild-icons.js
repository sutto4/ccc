const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Job to periodically sync Discord guild icons
class GuildIconSync {
  constructor() {
    this.db = null;
    this.botToken = process.env.DISCORD_BOT_TOKEN;
  }

  async connect() {
    this.db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
  }

  async syncGuildIcons() {
    try {
      console.log('🔄 Starting guild icon sync...');
      
      // Get all active guilds
      const [guilds] = await this.db.execute(
        'SELECT guild_id, name FROM guilds WHERE status = "active" OR status IS NULL'
      );

      console.log(`📋 Found ${guilds.length} guilds to sync`);

      let synced = 0;
      let errors = 0;

      for (const guild of guilds) {
        try {
          await this.syncSingleGuild(guild.guild_id);
          synced++;
          
          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ Failed to sync guild ${guild.guild_id}:`, error.message);
          errors++;
        }
      }

      console.log(`✅ Guild icon sync complete: ${synced} synced, ${errors} errors`);
      
    } catch (error) {
      console.error('💥 Guild icon sync failed:', error);
    }
  }

  async syncSingleGuild(guildId) {
    // Fetch guild data from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        'Authorization': `Bot ${this.botToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const guildData = await response.json();
    
    // Update database with icon info
    await this.db.execute(
      `UPDATE guilds SET 
         icon_hash = ?, 
         icon_url = ?,
         name = ?,
         updated_at = NOW()
       WHERE guild_id = ?`,
      [
        guildData.icon,
        guildData.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guildData.icon}.png?size=64` : null,
        guildData.name,
        guildId
      ]
    );

    console.log(`📸 Synced icon for ${guildData.name} (${guildId})`);
  }

  async close() {
    if (this.db) {
      await this.db.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new GuildIconSync();
  
  sync.connect()
    .then(() => sync.syncGuildIcons())
    .then(() => sync.close())
    .catch(error => {
      console.error('💥 Sync job failed:', error);
      process.exit(1);
    });
}

module.exports = GuildIconSync;
