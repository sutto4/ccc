# Server Groups UI Components

This directory contains all the UI components for the Server Groups feature in ServerMate.

## Structure

```
components/server-groups/
├── README.md
├── index.ts                    # Main exports
├── SG_PremiumGate.tsx         # Premium feature gate component
├── SG_InheritanceBadge.tsx    # Badge showing inheritance status
├── SG_LimitMeter.tsx          # Usage limit display component
├── SG_ResetToDefault.tsx      # Reset to default action component
└── tabs/                      # Tab components for each section
    ├── index.ts
    ├── OverviewTab.tsx        # Overview with KPIs and inheritance summary
    ├── ServersTab.tsx         # Server management and configuration
    ├── RoleSyncTab.tsx        # Role synchronization settings
    ├── BanSyncTab.tsx         # Ban synchronization settings
    ├── AutomodTab.tsx         # Automated moderation rules
    ├── AnnouncementsTab.tsx   # Cross-server announcements
    ├── ModerationLogTab.tsx   # Unified moderation log
    ├── AnalyticsTab.tsx       # Analytics and metrics
    ├── PermissionsTab.tsx     # Permission management
    └── SettingsTab.tsx        # Group settings and configuration
```

## Design Principles

### Inheritance Model
- **Group-first**: Settings are defined at the group level and inherited by servers
- **Override support**: Servers can override inherited settings with custom configurations
- **Clear status indicators**: Always show whether a setting is inherited, overridden, or custom

### Premium Features
- **Graceful degradation**: Premium features show upgrade prompts instead of being hidden
- **Clear value proposition**: Explain what each premium feature provides
- **Consistent gating**: Use `SG_PremiumGate` component for all premium features

### User Experience
- **Consistent patterns**: Reuse existing UI components and patterns from the main app
- **Responsive design**: Works on mobile, tablet, and desktop
- **Accessibility**: Proper ARIA labels, keyboard navigation, and screen reader support
- **Loading states**: Show appropriate loading and error states

## Components

### SG_PremiumGate
Wraps premium features with upgrade prompts. Shows current plan and required tier.

### SG_InheritanceBadge
Displays the inheritance status of a setting:
- `inherited`: Setting comes from group defaults
- `overridden`: Setting has been customized for this server
- `custom`: Setting is unique to this server
- `error`: There was an error applying the setting

### SG_LimitMeter
Shows current usage against plan limits with visual progress bars and warnings.

### SG_ResetToDefault
Provides a way to reset overridden settings back to group defaults with confirmation.

## Mock Data

The feature uses mock data located in `lib/mock/` to demonstrate functionality without requiring backend integration.

## Usage

```tsx
import { SG_PremiumGate, SG_InheritanceBadge } from '@/components/server-groups';
import { OverviewTab } from '@/components/server-groups/tabs';

// Use in a page component
<SG_PremiumGate requiredTier="premium" currentTier={group.premiumTier}>
  <OverviewTab group={group} />
</SG_PremiumGate>
```

## Future Enhancements

- Real-time updates via WebSocket
- Advanced analytics with charts
- Bulk operations for server management
- Template system for common configurations
- Integration with external services


