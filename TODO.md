# ServerMate.gg TODO List

- Leave Server option in Guild Settings
- Remove bot from server option - Admin Settings
- Update TOS to cover right to remove


- Check logic on rolesync. - We need to be able to specific what specific servers that runs on
- Probably do this when we set-up role sync for server groups






















## 🐛 Critical Bugs & Issues

### Stripe Integration
- [x] **Fix webhook metadata access** - TypeScript errors for `session.metadata.guildId` etc. ✅
- [x] **Fix customer type safety** - Handle `DeletedCustomer` vs `Customer` types properly ✅
- [ ] **Fix subscription period fields** - `current_period_start` and `current_period_end` don't exist on Subscription type
- [x] **Test webhook end-to-end** - Verify database updates work correctly after successful payment ✅
- [x] **Handle webhook failures gracefully** - Add retry logic and better error handling ✅

### Premium Feature Access
- [x] **Fix premium feature 404s** - Ensure clicking premium features shows modal instead of 404 ✅
- [x] **Verify premium status logic** - Check if `premium` field vs Stripe fields are being used correctly ✅
- [ ] **Test premium feature access** - Ensure users can't access premium features without valid subscription

## 🚀 Features to Implement

### Stripe Integration (In Progress)
- [ ] **Customer Portal** - Allow users to manage subscriptions, update payment methods
- [ ] **Invoice Management** - Handle failed payments, retry logic
- [ ] **Subscription Updates** - Handle plan changes, upgrades/downgrades
- [x] **Webhook Event Handling** - Implement `customer.subscription.deleted` and `invoice.payment_failed` ✅
- [x] **Stripe CLI Setup** - Document local development webhook forwarding ✅

### Role-Based Access Control (RBAC)
- [ ] **Server Owner Detection** - Implement logic to identify who owns each server
- [ ] **Permission Enforcement** - Actually enforce role permissions in the app
- [ ] **Role Hierarchy Support** - Sort roles by Discord hierarchy
- [ ] **Search Functionality** - Allow searching roles by name
- [ ] **Bulk Operations** - Select all/clear all functionality for role permissions

### Embedded Messages
- [ ] **Two-Column Layout** - Implement left form, right message list design
- [ ] **Message Preview** - Restore embedded message preview functionality
- [ ] **Channel Selection** - Pre-fill channel selector in edit mode
- [ ] **User Attribution** - Show Discord username of message creator
- [ ] **Date Display** - Show "Created" and "Last Updated" timestamps
- [ ] **Discord Links** - Add direct links to Discord messages
- [ ] **Embed Styling** - Add highlight colors and proper formatting
- [ ] **Search Functionality** - Search by title, description, or channel name
- [ ] **Message Height Limits** - Cap description to 2 lines with scrolling

### Reaction Roles
- [ ] **Two-Column Layout** - Match the Embedded Messages layout design
- [ ] **Published Messages Display** - Show existing reaction role messages on the right
- [ ] **No Functional Changes** - Keep all existing functionality intact

### Mass Role Assign
- [ ] **Enhanced Search** - Single search bar for user names AND existing role/group membership
- [ ] **Search Optimization** - Improve search performance and results

## 🎨 UI/UX Improvements

### Global Layout
- [ ] **Server Header** - Add server image alongside server name on every page
- [ ] **Header Spacing** - Add small gap/padding at top of server header
- [ ] **Sidebar Consistency** - Ensure settings menu items have highlight on hover

### Premium Modal
- [x] **Responsive Design** - Ensure modal works well on different screen sizes ✅
- [x] **Loading States** - Better visual feedback during subscription process ✅
- [x] **Error Handling** - Show user-friendly error messages for failed payments ✅
- [x] **Success Confirmation** - Clear indication when subscription is successful ✅

### Navigation & Sidebar
- [ ] **Feature Status Logic** - Ensure sidebar correctly reflects feature availability
- [ ] **Premium Icon Display** - Gold icons for premium features, correct feature status
- [ ] **Subnav Accessibility** - Ensure all subnav items are selectable when global premium is enabled

## 🔧 Technical Debt & Infrastructure

### Database
- [x] **Stripe Schema** - Ensure all required Stripe fields exist in `guilds` table ✅
- [ ] **Migration Scripts** - Create proper database migration for new Stripe fields
- [x] **Connection Pooling** - Consider using connection pools instead of single connections ✅
- [x] **Error Logging** - Implement proper error logging and monitoring ✅

### API Routes
- [ ] **Route Validation** - Add proper input validation for all API endpoints
- [ ] **Error Handling** - Consistent error response format across all routes
- [ ] **Rate Limiting** - Implement rate limiting for sensitive endpoints
- [ ] **Authentication** - Ensure all routes properly check user permissions

### Environment & Configuration
- [x] **Environment Validation** - Validate all required env vars on startup ✅
- [x] **Configuration Management** - Centralize database and Stripe configuration ✅
- [ ] **Development vs Production** - Ensure proper config separation

## 📋 Testing & Quality Assurance

### Manual Testing
- [x] **Premium Flow** - Test complete subscription process end-to-end ✅
- [x] **Webhook Reliability** - Test webhook handling with various Stripe events ✅
- [ ] **Feature Access** - Verify premium features are properly gated
- [ ] **Cross-Browser** - Test on different browsers and devices

### Automated Testing
- [ ] **Unit Tests** - Add tests for critical business logic
- [ ] **Integration Tests** - Test API endpoints and database operations
- [ ] **E2E Tests** - Test complete user workflows

## 📚 Documentation

### User Documentation
- [ ] **Premium Features Guide** - Document what premium features provide
- [ ] **Subscription Management** - How to manage subscriptions and billing
- [ ] **Troubleshooting** - Common issues and solutions

### Developer Documentation
- [ ] **API Reference** - Document all API endpoints
- [ ] **Database Schema** - Document table structures and relationships
- [ ] **Deployment Guide** - How to deploy and configure the application
- [ ] **Stripe Integration** - Webhook setup and testing guide

## 🚀 Future Enhancements

### Premium Features
- [ ] **Usage Analytics** - Track feature usage and provide insights
- [ ] **Advanced Customization** - More options for bot behavior and appearance
- [ ] **Team Management** - Allow multiple users to manage the same server
- [ ] **API Access** - Provide API for third-party integrations

### Discord Integration
- [ ] **Audit Logs** - Track all bot actions for moderation
- [ ] **Advanced Permissions** - More granular permission controls
- [ ] **Automation Rules** - Create custom automation workflows
- [ ] **Integration Hub** - Connect with other Discord bots and services

---

## Priority Levels

**🔴 High Priority (Fix First)**
- Fix subscription period fields TypeScript errors
- Test premium feature access gating
- Database connection reliability ✅

**🟡 Medium Priority (Next Sprint)**
- RBAC implementation
- Embedded Messages layout
- Premium modal improvements

**🟢 Low Priority (Future)**
- Advanced features
- Documentation
- Testing automation

---

*Last Updated: [Current Date]*
*Status: Stripe integration mostly complete! Webhook working, database updating, premium modal functional. Only minor TypeScript fixes remaining.*
