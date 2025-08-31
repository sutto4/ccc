# ServerMate System Architecture Diagram

## High-Level System Overview

```mermaid
graph TB
    subgraph "Discord Ecosystem"
        D[Discord Servers]
        U[Discord Users]
    end
    
    subgraph "ServerMate System"
        subgraph "Discord Bot"
            B[Main Bot Process]
            CM[Command Manager]
            CR[Command Registry]
            CS[Command Server<br/>Port 3001]
            DH[Database Handler]
        end
        
        subgraph "Web Application"
            WA[Next.js App<br/>Port 3000]
            API[API Routes]
            UI[React UI]
            AUTH[NextAuth.js]
        end
        
        subgraph "Database"
            DB[(MySQL Database)]
            GF[guild_features]
            MC[moderation_cases]
            ML[moderation_logs]
            ME[moderation_evidence]
            G[guilds]
            U2[users]
        end
    end
    
    D --> B
    U --> B
    B --> CM
    CM --> CR
    CM --> DH
    DH --> DB
    WA --> API
    API --> DB
    WA --> UI
    UI --> AUTH
    AUTH --> D
    API --> CS
    CS --> CM
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant User as Discord User
    participant Bot as Discord Bot
    participant Web as Web App
    participant DB as Database
    participant CS as Command Server
    
    Note over User,CS: Feature Toggle Flow
    User->>Web: Toggle feature in admin panel
    Web->>DB: Update guild_features table
    Web->>CS: HTTP POST /commands
    CS->>Bot: Update commands
    Bot->>Discord: Register/unregister slash commands
    Discord-->>User: Commands appear/disappear
    
    Note over User,CS: Moderation Action Flow
    User->>Bot: Use slash command (/warn)
    Bot->>DB: Log action to moderation_logs
    Bot->>DB: Create case in moderation_cases
    Bot-->>User: Confirmation message
    Web->>DB: Fetch updated moderation data
    Web-->>User: Updated UI
```

## Component Architecture

```mermaid
graph LR
    subgraph "Frontend Layer"
        DASH[Dashboard]
        GUILD[Guild Management]
        MOD[Moderation]
        ADMIN[Admin Panel]
        SETTINGS[Settings]
    end
    
    subgraph "API Layer"
        AUTH_API[Auth API]
        GUILD_API[Guild API]
        MOD_API[Moderation API]
        ADMIN_API[Admin API]
        FEATURES_API[Features API]
    end
    
    subgraph "Service Layer"
        AUTH_SVC[Auth Service]
        GUILD_SVC[Guild Service]
        MOD_SVC[Moderation Service]
        COMMAND_SVC[Command Service]
    end
    
    subgraph "Data Layer"
        DB[(MySQL)]
        CACHE[(Cache)]
    end
    
    subgraph "External Services"
        DISCORD[Discord API]
        OAUTH[OAuth2]
    end
    
    DASH --> GUILD_API
    GUILD --> GUILD_API
    MOD --> MOD_API
    ADMIN --> ADMIN_API
    SETTINGS --> FEATURES_API
    
    GUILD_API --> GUILD_SVC
    MOD_API --> MOD_SVC
    ADMIN_API --> GUILD_SVC
    FEATURES_API --> COMMAND_SVC
    
    GUILD_SVC --> DB
    MOD_SVC --> DB
    COMMAND_SVC --> DISCORD
    
    AUTH_API --> OAUTH
    AUTH_API --> DISCORD
```

## Database Schema Overview

```mermaid
erDiagram
    guilds ||--o{ guild_features : has
    guilds ||--o{ moderation_cases : contains
    guilds ||--o{ moderation_logs : logs
    guilds ||--o{ server_group_members : belongs_to
    
    server_groups ||--o{ server_group_members : contains
    
    moderation_cases ||--o{ moderation_evidence : has
    moderation_cases ||--o{ moderation_logs : generates
    
    users ||--o{ moderation_logs : performs
    users ||--o{ moderation_evidence : uploads
    
    features ||--o{ guild_features : enabled_in
    
    embedded_messages ||--o{ guilds : belongs_to
    
    guilds {
        string guild_id PK
        string guild_name
        string owner_id
        int member_count
        boolean is_active
        timestamp created_at
    }
    
    guild_features {
        int id PK
        string guild_id FK
        string feature_name FK
        boolean enabled
        timestamp created_at
        timestamp updated_at
    }
    
    moderation_cases {
        int id PK
        string guild_id FK
        string case_id
        string action_type
        string target_user_id
        string moderator_id
        string reason
        boolean active
        timestamp created_at
    }
    
    moderation_logs {
        int id PK
        int case_id FK
        string guild_id FK
        string action_type
        string target_user_id
        string moderator_id
        string reason
        timestamp created_at
    }
    
    moderation_evidence {
        int id PK
        int case_id FK
        string evidence_url
        string uploaded_by_id FK
        string uploaded_by
        timestamp created_at
    }
```

## Security Architecture

```mermaid
graph TB
    subgraph "Authentication Flow"
        USER[User]
        OAUTH[Discord OAuth2]
        AUTH[NextAuth.js]
        SESSION[JWT Session]
        ROUTES[Protected Routes]
    end
    
    subgraph "Authorization Levels"
        BOT_INVITER[Bot Inviter]
        SERVER_OWNER[Server Owner]
        ADMIN_USER[Admin User]
        REGULAR_USER[Regular User]
    end
    
    subgraph "Security Measures"
        VALIDATION[Input Validation]
        SANITIZATION[SQL Injection Protection]
        CORS[CORS Policy]
        RATE_LIMIT[Rate Limiting]
    end
    
    USER --> OAUTH
    OAUTH --> AUTH
    AUTH --> SESSION
    SESSION --> ROUTES
    
    BOT_INVITER --> ROUTES
    SERVER_OWNER --> ROUTES
    ADMIN_USER --> ROUTES
    REGULAR_USER --> ROUTES
    
    ROUTES --> VALIDATION
    VALIDATION --> SANITIZATION
    SANITIZATION --> CORS
    CORS --> RATE_LIMIT
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        subgraph "Local Machine"
            WEB[Web App<br/>localhost:3000]
            BOT[Discord Bot<br/>localhost:3001]
            DB[(Local MySQL)]
        end
    end
    
    subgraph "Production Environment"
        subgraph "Web Server"
            WEB_PROD[Web App<br/>Port 80/443]
            NGINX[Nginx Reverse Proxy]
        end
        
        subgraph "Bot Server"
            BOT_PROD[Discord Bot<br/>Port 3001]
            PM2[PM2 Process Manager]
        end
        
        subgraph "Database Server"
            DB_PROD[(Production MySQL)]
            BACKUP[Backup System]
        end
    end
    
    WEB --> BOT
    WEB --> DB
    BOT --> DB
    
    WEB_PROD --> NGINX
    BOT_PROD --> PM2
    WEB_PROD --> DB_PROD
    BOT_PROD --> DB_PROD
    DB_PROD --> BACKUP
```

## Feature Toggle System

```mermaid
graph LR
    subgraph "Admin Panel"
        TOGGLE[Feature Toggle]
    end
    
    subgraph "Web App"
        API[Features API]
        DB_UPDATE[Database Update]
    end
    
    subgraph "Bot Communication"
        HTTP_CALL[HTTP to localhost:3001]
        COMMAND_UPDATE[Command Update]
        DISCORD_API[Discord API Call]
    end
    
    subgraph "Result"
        COMMANDS[Slash Commands<br/>Appear/Disappear]
    end
    
    TOGGLE --> API
    API --> DB_UPDATE
    API --> HTTP_CALL
    HTTP_CALL --> COMMAND_UPDATE
    COMMAND_UPDATE --> DISCORD_API
    DISCORD_API --> COMMANDS
```

## Moderation System Flow

```mermaid
graph TD
    subgraph "Discord"
        USER[User]
        COMMAND[Slash Command]
    end
    
    subgraph "Bot Processing"
        HANDLER[Command Handler]
        LOGGER[Database Logger]
        RESPONSE[Response]
    end
    
    subgraph "Database"
        LOGS[moderation_logs]
        CASES[moderation_cases]
        EVIDENCE[moderation_evidence]
    end
    
    subgraph "Web App"
        UI[Moderation UI]
        API[Moderation API]
    end
    
    USER --> COMMAND
    COMMAND --> HANDLER
    HANDLER --> LOGGER
    LOGGER --> LOGS
    LOGGER --> CASES
    HANDLER --> RESPONSE
    RESPONSE --> USER
    
    API --> LOGS
    API --> CASES
    API --> EVIDENCE
    API --> UI
```

This comprehensive architecture diagram shows the complete ServerMate system design, including data flows, component relationships, security measures, and deployment considerations.
