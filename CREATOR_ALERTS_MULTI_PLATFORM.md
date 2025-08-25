# Multi-Platform Creator Alerts System

## Overview
The Creator Alerts system now supports multiple streaming platforms, automatically assigning Discord roles and sending notifications when creators go live or offline.

## Supported Platforms

### 🎮 Twitch
- **API**: Official Twitch API with OAuth2
- **Features**: Live stream detection, viewer count, game category, stream thumbnails
- **Requirements**: `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` environment variables

### 📺 YouTube
- **API**: YouTube Data API v3
- **Features**: Live stream detection, channel information
- **Requirements**: `YOUTUBE_API_KEY` environment variable

### 🥊 Kick
- **API**: Public Kick API
- **Features**: Live stream detection, viewer count, stream title
- **Requirements**: No API key required (uses public endpoints)

### 📱 TikTok
- **API**: Basic HTML parsing (limited)
- **Features**: Basic live stream detection
- **Requirements**: No API key required (note: detection may be limited)

## Environment Variables

Add these to your `.env` file:

```env
# Creator Alerts Configuration
CREATOR_ALERTS_POLL_SECONDS=60

# Twitch API (required for Twitch alerts)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# YouTube API (required for YouTube alerts)
YOUTUBE_API_KEY=your_youtube_api_key

# Note: Kick and TikTok use public APIs, so no API keys are required
```

## Database Schema

The system uses the `creator_alert_rules` table:

```sql
CREATE TABLE creator_alert_rules (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guild_id VARCHAR(32) NOT NULL,
    platform ENUM('twitch','youtube','x','tiktok','kick') NOT NULL,
    creator VARCHAR(255) NOT NULL,
    discord_user_id VARCHAR(32) NULL,
    role_id VARCHAR(32) NOT NULL,
    channel_id VARCHAR(32) NOT NULL,
    notes VARCHAR(255) NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

## How It Works

1. **Polling**: The bot checks all enabled creator alert rules every 60 seconds (configurable)
2. **Platform Detection**: Each platform has its own API integration for live stream detection
3. **Role Assignment**: When a creator goes live, the bot assigns the specified Discord role
4. **Notifications**: Discord notifications are sent to the specified channel with platform-specific styling
5. **Role Removal**: When a creator goes offline, the role is automatically removed
6. **Caching**: The system caches live status to prevent spam and track stream changes

## Platform-Specific Features

### Twitch
- Full stream metadata (title, game, viewer count, thumbnails)
- Profile picture integration
- OAuth2 token management with automatic refresh

### YouTube
- Channel ID resolution from username/handle
- Live stream detection via YouTube Data API
- Channel information and stream details

### Kick
- Username-based channel lookup
- Live stream status and viewer count
- Stream title and session information

### TikTok
- Basic live stream detection
- Username validation
- Note: Limited due to TikTok's API restrictions

## Web Interface

The web interface at `/guilds/[id]/creator-alerts` provides:

- **Platform Selection**: Choose from Twitch, YouTube, Kick, TikTok, or X
- **Creator Input**: Platform-specific placeholder text and help
- **Discord User Mapping**: Search and select Discord users for role assignment
- **Role Configuration**: Select Discord roles to assign
- **Channel Selection**: Choose notification channels
- **Rule Management**: Create, edit, enable/disable, and delete rules

## API Endpoints

- `GET /api/guilds/[id]/creator-alerts` - List all rules
- `POST /api/guilds/[id]/creator-alerts` - Create new rule
- `PUT /api/guilds/[id]/creator-alerts` - Update rule
- `DELETE /api/guilds/[id]/creator-alerts?id=[ruleId]` - Delete rule

## Bot Commands

The bot automatically:
- Processes creator alerts every 60 seconds
- Assigns/removes Discord roles based on live status
- Sends platform-specific notifications
- Manages caching and prevents duplicate notifications

## Troubleshooting

### Common Issues

1. **Twitch API Errors**: Check `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`
2. **YouTube API Errors**: Verify `YOUTUBE_API_KEY` and quota limits
3. **Role Assignment Failures**: Ensure bot has `MANAGE_ROLES` permission
4. **Cache Issues**: Use the clear cache API endpoint if needed

### Logs

The bot logs all creator alert activities with the `[CREATOR-ALERTS]` prefix:
- Platform detection results
- Role assignment/removal
- Notification sending
- API errors and rate limits

## Future Enhancements

- **Webhook Support**: Real-time notifications instead of polling
- **Advanced Filtering**: Game categories, viewer thresholds, keywords
- **Cooldown Management**: Prevent rapid role changes
- **Analytics**: Track alert performance and engagement
- **Multi-language Support**: Localized notifications and UI
