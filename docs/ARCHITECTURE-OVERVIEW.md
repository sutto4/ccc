# ServerMate System Architecture Overview

## System Components

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                SERVERMATE ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   DISCORD BOT   │    │   WEB APP       │    │      DATABASE               │ │
│  │   (Node.js)     │    │   (Next.js)     │    │      (MySQL)                │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────────┘ │
│           │                       │                       │                    │
│           │                       │                       │                    │
│           └───────────────────────┼───────────────────────┘                    │
│                                   │                                           │
└───────────────────────────────────┼───────────────────────────────────────────┘
                                    │
                                    ▼
```

## 1. DISCORD BOT ARCHITECTURE

### Core Components
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DISCORD BOT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Main Bot      │  │  Command        │  │    Command Server           │ │
│  │   (index.js)    │  │  Manager        │  │    (HTTP Server Port 3001)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│           │                       │                       │                │
│           │                       │                       │                │
│           └───────────────────────┼───────────────────────┘                │
│                                   │                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  Command        │  │  Database       │  │    Event Handlers           │ │
│  │  Registry       │  │  Logger         │  │    (Slash Commands)         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bot Features
- **Slash Command Management**: Dynamic registration based on enabled features
- **Event Handling**: Message events, member joins, moderation actions
- **Database Integration**: Logging moderation actions, user data
- **HTTP Server**: Receives feature updates from web app (Port 3001)

### Command System
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMMAND FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Discord User → Slash Command → Bot Handler → Database Logger → Response   │
│       │              │              │              │              │        │
│       ▼              ▼              ▼              ▼              ▼        │
│  /warn user    CommandManager  handleWarn()   Log to DB    "User warned"   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. WEB APP ARCHITECTURE

### Frontend Structure
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB APP FRONTEND                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Dashboard     │  │   Guild         │  │    Admin Panel              │ │
│  │   (Home)        │  │   Management    │  │    (Features)               │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│           │                       │                       │                │
│           │                       │                       │                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Moderation    │  │   Settings      │  │    Embedded Messages        │ │
│  │   System        │  │   (Features)    │  │    Builder                  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Backend API Structure
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB APP BACKEND                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Auth API      │  │   Guild API     │  │    Admin API                │ │
│  │   (/api/auth)   │  │   (/api/guilds) │  │    (/api/admin)             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│           │                       │                       │                │
│           │                       │                       │                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Moderation    │  │   Features      │  │    Bot Commands             │ │
│  │   API           │  │   API           │  │    API                      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3. DATABASE ARCHITECTURE

### Core Tables
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │     guilds      │  │     users       │  │    guild_features           │ │
│  │  (Server info)  │  │  (User data)    │  │    (Feature toggles)        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│           │                       │                       │                │
│           │                       │                       │                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ moderation_cases│  │moderation_logs  │  │    moderation_evidence      │ │
│  │  (Case data)    │  │  (Action logs)  │  │    (Evidence files)         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Additional Tables
- `server_groups` - Server grouping for cross-server features
- `server_group_members` - Group membership
- `embedded_messages` - Stored embedded message configurations
- `user_logins` - User login tracking
- `features` - Global feature definitions

## 4. SYSTEM INTEGRATION FLOWS

### Feature Toggle Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │   Web App API   │    │   Bot Server    │
│   (Toggle ON)   │───▶│   (Features)    │───▶│   (Port 3001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Feature       │    │   HTTP Call     │    │   Command       │
│   Enabled       │    │   localhost:3001│    │   Registration  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Bot Response  │    │   Discord API   │
│   Updated       │    │   (Success)     │    │   (Commands)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Moderation Action Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord       │    │   Bot Handler   │    │   Database      │
│   Slash Command │───▶│   (CommandMgr)  │───▶│   Logger        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Input    │    │   Action Logic  │    │   Log Entry     │
│   (/warn user)  │    │   (handleWarn)  │    │   (mod_logs)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Response      │    │   Success Msg   │    │   Case Created  │
│   (Ephemeral)   │    │   (User warned)│    │   (mod_cases)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 5. SECURITY & PERMISSIONS

### Authentication Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Login    │    │   NextAuth.js   │    │   Session       │
│   (Discord)     │───▶│   (OAuth2)      │───▶│   Management    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord       │    │   JWT Token     │    │   Route         │
│   Permissions   │    │   Generation    │    │   Protection    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Permission Levels
- **Bot Inviter**: Access to servers they invited bot to
- **Server Owner**: Full access to server settings
- **Admin Users**: Access to global admin features
- **Regular Users**: Access to public features

## 6. DATA FLOW PATTERNS

### Real-time Updates
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    ┌─────────────────┐    │   Frontend      │
│   Change        │───▶│   API Endpoint  │───▶│   Re-render     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Feature       │    │   HTTP          │    │   UI Update     │
│   Toggle        │    │   Response      │    │   (Immediate)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Cross-Server Features
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Server A      │    │   Server Group  │    │   Server B      │
│   (Moderation)  │───▶│   (Aggregation) │───▶│   (Moderation)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Data    │    │   Combined      │    │   Local Data    │
│   (Cases)       │    │   View          │    │   (Cases)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 7. DEPLOYMENT ARCHITECTURE

### Current Setup
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Web App       │  │   Discord Bot   │  │    Database                 │ │
│  │   (Port 3000)   │  │   (Port 3001)   │  │    (MySQL)                  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│           │                       │                       │                │
│           │                       │                       │                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Next.js       │  │   Node.js       │  │    Local/Remote             │ │
│  │   Development   │  │   Bot Process   │  │    MySQL Server             │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Communication Channels
- **Web App ↔ Database**: Direct MySQL connections
- **Web App ↔ Bot**: HTTP calls to localhost:3001
- **Bot ↔ Discord**: Discord.js API
- **Bot ↔ Database**: Shared connection pool

## 8. CURRENT FEATURE STATUS

### ✅ Implemented Features
- **Authentication System**: Discord OAuth2 via NextAuth.js
- **Guild Management**: Server listing, settings, feature toggles
- **Moderation System**: Cases, evidence, logging, group views
- **Admin Panel**: Global feature management, guild oversight
- **Embedded Messages**: Builder with button support
- **Dynamic Commands**: Real-time Discord slash command management

### 🔄 In Progress
- **Command Permission System**: Role-based command access
- **Advanced Moderation**: Automated actions, appeal system
- **Server Groups**: Cross-server feature aggregation

### 📋 Planned Features
- **Analytics Dashboard**: Usage statistics, performance metrics
- **Advanced Permissions**: Granular role-based access control
- **API Rate Limiting**: Protection against abuse
- **Webhook Integration**: External service notifications

## 9. TECHNICAL SPECIFICATIONS

### Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Node.js, MySQL2, Next.js API Routes
- **Bot**: Discord.js v14, Node.js
- **Database**: MySQL 8.0+
- **Authentication**: NextAuth.js, Discord OAuth2

### Performance Characteristics
- **Response Time**: <100ms for most API calls
- **Database Queries**: Optimized with proper indexing
- **Real-time Updates**: Immediate command registration
- **Scalability**: Designed for multiple guilds and users

### Security Features
- **Authentication**: JWT-based session management
- **Authorization**: Role-based access control
- **Data Validation**: Input sanitization and validation
- **SQL Injection Protection**: Parameterized queries
- **CORS**: Controlled cross-origin requests

This architecture provides a robust, scalable foundation for managing Discord servers with real-time feature updates and comprehensive moderation capabilities.
