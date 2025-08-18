# Custom Commands

## Overview
The Custom Commands feature allows server administrators to create, manage, and customize bot commands for their Discord server. This powerful tool enables server-specific functionality without requiring coding knowledge.

## Features

### 🎯 **Command Builder**
- **Super User-Friendly Interface**: Intuitive form-based command creation
- **Visual Response Types**: Choose between regular messages, embed messages, or direct messages
- **Real-time Preview**: See how your command will look before saving

### 🔧 **Command Configuration**
- **Custom Prefixes**: Choose from common prefixes (!, ., /, $, %) or set custom ones
- **Command Aliases**: Create multiple ways to trigger the same command
- **Rich Descriptions**: Document what each command does

### 📍 **Channel & Role Restrictions**
- **Channel Targeting**: Limit commands to specific channels or allow them everywhere
- **Role-Based Access**: Restrict command usage to specific roles
- **Flexible Permissions**: Mix and match restrictions as needed

### 💬 **Response Types**

#### Regular Message
- Simple text responses
- Support for Discord markdown
- Quick and lightweight

#### Embed Message
- **Full Integration**: Uses the same builder as Embedded Messages
- Rich formatting with colors, images, and fields
- Professional appearance
- **Identical Experience**: Looks, feels, and operates exactly like the Embedded Messages builder

#### Direct Message
- Send responses privately to users
- Keep channel chat clean
- Personal interactions

### ⚡ **Interactive Options**
- **Buttons**: Add clickable buttons for user interaction
- **Dropdowns**: Create selection menus
- **Modals**: Build custom forms and inputs

## Usage

### Creating a Command
1. Navigate to **Tools > Custom Commands** in your server
2. Click **"New Command"**
3. Fill out the command details:
   - **Name**: What users will type (e.g., "welcome")
   - **Prefix**: The symbol before the command (e.g., "!")
   - **Description**: What the command does
   - **Response Type**: Choose message, embed, or DM
4. Configure restrictions and options
5. Click **"Create Command"**

### Managing Commands
- **Edit**: Modify existing commands
- **Enable/Disable**: Toggle commands on/off
- **Delete**: Remove unwanted commands
- **Search**: Find commands quickly
- **Filter**: View enabled, disabled, or all commands

### Command Examples

#### Welcome Command
```
!welcome
```
- **Type**: Embed Message
- **Channels**: All channels
- **Roles**: All roles
- **Response**: Rich welcome message with server info

#### Help Command
```
.help
```
- **Type**: Regular Message
- **Channels**: Commands channel only
- **Roles**: Members and above
- **Response**: List of available commands

#### Staff Command
```
$staff
```
- **Type**: Direct Message
- **Channels**: All channels
- **Roles**: Moderators only
- **Response**: Staff contact information sent privately

## Technical Details

### Database Schema
The system uses three main tables:
- `custom_commands`: Stores command definitions
- `command_usage_stats`: Tracks usage analytics
- `command_interactive_components`: Manages interactive elements

### API Endpoints
- `GET /api/guilds/{guildId}/custom-commands` - List commands
- `POST /api/guilds/{guildId}/custom-commands` - Create command
- `PUT /api/guilds/{guildId}/custom-commands/{commandId}` - Update command
- `DELETE /api/guilds/{guildId}/custom-commands/{commandId}` - Delete command

### Discord Integration
- Commands are processed by the Discord bot
- Real-time validation and error handling
- Automatic permission checking
- Rate limiting and spam protection

## Best Practices

### Command Naming
- Use clear, descriptive names
- Avoid conflicts with existing bot commands
- Consider user experience and memorability

### Security
- Limit powerful commands to trusted roles
- Use channel restrictions for sensitive operations
- Regularly review command permissions

### Performance
- Keep embed messages concise
- Use aliases sparingly
- Monitor command usage statistics

### User Experience
- Provide clear descriptions
- Use appropriate response types
- Test commands thoroughly before deployment

## Troubleshooting

### Common Issues
- **Command Not Working**: Check if it's enabled and has proper permissions
- **Permission Denied**: Verify role restrictions and channel access
- **Embed Not Displaying**: Ensure the embed builder is properly configured

### Debug Mode
Enable debug logging to see detailed command execution information and identify issues quickly.

## Future Enhancements
- **Command Templates**: Pre-built command configurations
- **Advanced Permissions**: Time-based and conditional restrictions
- **Command Chaining**: Link multiple commands together
- **Analytics Dashboard**: Detailed usage statistics and insights
- **Import/Export**: Share command configurations between servers
