# Bot Customization Feature

## Overview
The Bot Customization feature allows server owners to personalize their Discord bot's appearance and behavior on a per-server basis.

## Features

### 🎨 **Bot Identity**
- **Custom Bot Name**: Change how the bot appears in your server (nickname)
- **Custom Avatar**: Set a unique profile picture for the bot in your server
- **Real-time Preview**: See exactly how your bot will look before saving

### 🎭 **Response Settings**
- **Response Style**: Choose between Friendly, Professional, Casual, or Formal
- **Command Cooldown**: Set how often users can use bot commands
- **Max Response Length**: Control the length of bot responses

### 🤖 **Automation Settings**
- **Auto Responses**: Enable automatic responses to common messages
- **Welcome DM**: Send personalized welcome messages to new members
- **Custom Messages**: Set your own welcome and goodbye messages

### 📊 **Logging & Monitoring**
- **Log Levels**: Choose between Minimal, Normal, or Verbose logging
- **Performance Tracking**: Monitor bot performance and usage

## How It Works

### 1. **Database Storage**
- All customization settings are stored in the `bot_customization` table
- Each server has its own unique configuration
- Settings are automatically synced between the web interface and bot

### 2. **Real-time Updates**
- Changes are applied immediately when saved
- Bot automatically updates its appearance and behavior
- No server restarts required

### 3. **Bot Integration**
- Bot checks for customization updates every 30 minutes
- Automatically applies name and avatar changes
- Stores settings in memory for fast access

## Database Schema

```sql
CREATE TABLE bot_customization (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL UNIQUE,
    bot_name VARCHAR(32) NOT NULL DEFAULT 'Discord Bot',
    bot_avatar TEXT NULL,
    embed_color VARCHAR(7) NOT NULL DEFAULT '#5865F2',
    response_style ENUM('friendly', 'professional', 'casual', 'formal'),
    auto_responses BOOLEAN NOT NULL DEFAULT TRUE,
    welcome_dm BOOLEAN NOT NULL DEFAULT FALSE,
    welcome_message TEXT NULL,
    goodbye_message TEXT NULL,
    log_level ENUM('minimal', 'normal', 'verbose'),
    command_cooldown INT NOT NULL DEFAULT 3,
    max_response_length INT NOT NULL DEFAULT 2000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### GET `/api/guilds/[id]/bot-customization`
- Retrieves current bot customization settings for a guild
- Returns default settings if none exist

### PUT `/api/guilds/[id]/bot-customization`
- Updates bot customization settings
- Validates input data
- Triggers bot update process

## Bot Worker

The `botCustomization.js` worker handles:
- **Applying Settings**: Updates bot name and avatar in Discord
- **Sync Process**: Runs every 30 minutes to check for updates
- **Error Handling**: Gracefully handles Discord API rate limits and errors
- **Caching**: Stores settings in memory for performance

## Security & Permissions

- **Server Owner Only**: Only server owners can modify bot customization
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Bot changes respect Discord's rate limits
- **Audit Logging**: All changes are logged for transparency

## Usage Examples

### Changing Bot Name
1. Navigate to Server Settings → Bot Customization
2. Enter new bot name in "Bot Name" field
3. Click "Save Changes"
4. Bot name updates immediately in your server

### Setting Custom Avatar
1. Upload image to image hosting service (e.g., Imgur, Discord CDN)
2. Copy image URL
3. Paste URL in "Bot Avatar URL" field
4. Save changes
5. Bot avatar updates within minutes

### Custom Welcome Messages
1. Enable "Welcome DM" toggle
2. Enter custom welcome message
3. Save changes
4. New members automatically receive your custom message

## Troubleshooting

### Bot Name Not Updating
- Ensure bot has "Change Nickname" permission
- Check if name is within 32 character limit
- Verify bot has proper role hierarchy

### Avatar Not Changing
- Ensure image URL is accessible
- Check image format (PNG, JPG, GIF supported)
- Verify image size (under 8MB recommended)

### Settings Not Saving
- Check browser console for errors
- Verify you have server owner permissions
- Ensure database connection is working

## Future Enhancements

- **Template System**: Pre-made bot personality templates
- **Scheduled Changes**: Automatically change bot appearance at specific times
- **Advanced Responses**: AI-powered response customization
- **Analytics Dashboard**: Track bot usage and performance metrics
- **Multi-language Support**: Localized bot responses and interface

## Support

For issues or questions about Bot Customization:
1. Check the troubleshooting section above
2. Review bot logs for error messages
3. Verify database table exists and has correct schema
4. Ensure bot has proper Discord permissions

