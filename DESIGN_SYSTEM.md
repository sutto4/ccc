# Design System & Component Library

This document outlines the standardized UI components and design patterns used across the ServerMate.gg application to ensure consistency and maintainability.

## 🎨 **Visual Component Showcase**

**Visit the interactive component showcase:** `/design-system`

This page displays all components side-by-side in both light and dark modes, making it easy to:
- See how components look in different themes
- Test component interactions and states
- Copy component usage examples
- Understand spacing and layout patterns
- Reference the complete color palette

## Core Principles

- **Consistency**: All similar UI elements use the same styling and behavior
- **Reusability**: Components are designed to be flexible and reusable
- **Accessibility**: Built-in accessibility features and proper ARIA labels
- **Light Theme**: Consistent light theme styling across all components

## Component Library

### Form Components

#### Input
```tsx
import { Input } from "@/components/ui";

<Input
  label="Command Name"
  placeholder="Enter command name"
  required
  error="This field is required"
  helperText="Choose a descriptive name for your command"
/>
```

#### Textarea
```tsx
import { Textarea } from "@/components/ui";

<Textarea
  label="Description"
  rows={4}
  placeholder="Describe what this command does..."
  helperText="Be specific about the command's purpose"
/>
```

#### Select
```tsx
import { Select } from "@/components/ui";

<Select
  label="Prefix"
  value={prefix}
  onChange={(e) => setPrefix(e.target.value)}
  options={[
    { value: "!", label: "!" },
    { value: ".", label: "." },
    { value: "/", label: "/" }
  ]}
/>
```

#### Checkbox
```tsx
import { Checkbox } from "@/components/ui";

<Checkbox
  label="Enable notifications"
  checked={enabled}
  onChange={(e) => setEnabled(e.target.checked)}
  helperText="Receive notifications when this feature is used"
/>
```

#### Radio
```tsx
import { Radio } from "@/components/ui";

<Radio
  name="responseType"
  value="message"
  checked={responseType === "message"}
  onChange={(e) => setResponseType(e.target.value)}
  label="Regular Message"
/>
```

### Button Components

#### Button
```tsx
import { Button } from "@/components/ui";

<Button
  variant="primary"        // primary, secondary, outline, danger, success, ghost
  size="md"                // sm, md, lg, xl
  loading={isLoading}      // Shows spinner when true
  icon={<Plus />}          // Optional icon
  iconPosition="left"      // left or right
  onClick={handleClick}
>
  Create Command
</Button>
```

#### IconButton
```tsx
import { IconButton } from "@/components/ui";

<IconButton
  size="md"
  variant="ghost"
  onClick={handleClick}
>
  <Edit3 className="h-4 w-4" />
</IconButton>
```

### Layout Components

#### Card
```tsx
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui";

<Card variant="default">  {/* default, elevated, outlined */}
  <CardHeader
    title="Card Title"
    subtitle="Optional subtitle text"
    action={<Button>Action</Button>}
  />
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter action={<Button>Save</Button>}>
    Footer content
  </CardFooter>
</Card>
```

## Page Patterns

### Feature Dashboard Pattern

Use this pattern for feature-centric pages that combine status, configuration, permissions, usage, and help content. First implemented on `AI Features`.

- When to use: Complex features that need at-a-glance status + grouped settings (e.g., AI, integrations, billing).
- Goals: Clear visual hierarchy, quick scanning, minimal friction for common tasks.

#### Structure
- Header: Title with compact description.
- Status Overview (Top Row): 2–3 compact cards with gradients for at-a-glance KPIs.
  - Card size: equal width; grid `grid-cols-1 md:grid-cols-3`.
  - Use subtle gradient backgrounds (50→100 tints) and a small decorative circle.
  - Pair a left-aligned label with a right-aligned numeric/value emphasis.
- Configuration Section: Two-column layout on large screens (`grid-cols-1 lg:grid-cols-2`).
  - Left: read-only admin-managed controls (render as info blocks, not disabled inputs).
  - Right: editable, high-value inputs (e.g., custom prompt) with explicit Save.
- Usage Statistics: Four stat cards. Each: big number + supporting label + icon.
- Permissions: Selected chips with remove actions; searchable dropdown to add roles.
- Help/Commands: Two informational cards with examples.

#### Visual Language
- Cards: Rounded, bordered, light gradient backgrounds for emphasis sections.
- Badges: Use to denote state (e.g., "Editable", "Admin Only").
- Icons: Left-aligned, small (h-4 w-4). Use semantic color per section.
- Spacing: Section headers use a small icon + title + divider line.
- Read-only values: Present as information blocks (label + value + "Locked"), not disabled inputs.

#### Color Guidance
- Status: Purple/Blue gradients
- Model/Tech: Blue
- Usage: Green
- Cost: Yellow
- Permissions: Orange/Red
- Editable actions: Purple button variant

#### Example: Status Overview Card
```tsx
<div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-purple-50 to-blue-50 p-6">
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain className="h-4 w-4 text-purple-600" />
        </div>
        <h3 className="font-semibold text-gray-900">AI Status</h3>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        <span className="text-sm font-medium text-gray-700">{enabled ? 'Active' : 'Inactive'}</span>
      </div>
    </div>
    <div className="text-right">
      <div className="text-2xl font-bold text-purple-600">{enabled ? 'ON' : 'OFF'}</div>
      <div className="text-xs text-gray-500">Status</div>
    </div>
  </div>
  <div className="absolute -top-2 -right-2 w-16 h-16 bg-purple-100 rounded-full opacity-20"></div>
</div>
```

#### Example: Read-only Info Block (Admin Only)
```tsx
<div>
  <Label className="text-sm font-medium text-gray-700">AI Model</Label>
  <div className="mt-1 p-3 bg-white border rounded-lg">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">GPT-4 (Higher Quality)</span>
      <div className="text-xs text-gray-500">Locked</div>
    </div>
  </div>
</div>
```

#### Example: Editable Primary Block
```tsx
<div className="rounded-lg border bg-gradient-to-br from-purple-50 to-blue-50 p-4">
  <div className="flex items-center gap-2 mb-3">
    <MessageSquare className="h-4 w-4 text-purple-600" />
    <h3 className="font-medium text-gray-900">Custom Prompt</h3>
    <div className="ml-auto inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Editable</div>
  </div>
  <Textarea rows={4} className="mt-1 bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400" />
  <div className="flex justify-end mt-3">
    <Button className="bg-purple-600 hover:bg-purple-700 text-white" size="sm">Save Prompt</Button>
  </div>
</div>
```

#### Do/Don't
- Do use gradients sparingly for summary/stat cards and high-value edit areas.
- Do group related settings into compact cards rather than long forms.
- Do replace disabled inputs with read-only info blocks.
- Don't mix too many colors in a single section; one accent per section.
- Don't auto-save on change; provide explicit Save for meaningful edits.

## Utility Functions

### Class Name Merging
```tsx
import { cn } from "@/components/ui";

const className = cn(
  "base-classes",
  conditional && "conditional-classes",
  props.className
);
```

### Common Spacing
```tsx
import { spacing } from "@/components/ui";

<div className={spacing.md}>  {/* xs, sm, md, lg, xl */}
  Content with consistent spacing
</div>
```

### Common Layout
```tsx
import { layout } from "@/components/ui";

<div className={layout.container}>
  <div className={layout.card}>
    <div className={layout.section}>
      Content with consistent layout
    </div>
  </div>
</div>
```

### Common Text Styles
```tsx
import { text } from "@/components/ui";

<h3 className={text.heading}>Heading</h3>
<p className={text.body}>Body text</p>
<span className={text.caption}>Caption</span>
```

## Color Palette

### Primary Colors
- **Blue**: `text-blue-600`, `bg-blue-600` (Primary actions, links)
- **Green**: `text-green-600`, `bg-green-600` (Success states)
- **Red**: `text-red-600`, `bg-red-600` (Error states, destructive actions)
- **Yellow**: `text-yellow-600`, `bg-yellow-600` (Warnings, highlights)

### Neutral Colors
- **Gray 50**: `bg-gray-50` (Light backgrounds)
- **Gray 100**: `bg-gray-100` (Hover states)
- **Gray 200**: `border-gray-200` (Borders)
- **Gray 300**: `border-gray-300` (Input borders)
- **Gray 400**: `text-gray-400` (Disabled text)
- **Gray 500**: `text-gray-500` (Secondary text)
- **Gray 600**: `text-gray-600` (Body text)
- **Gray 700**: `text-gray-700` (Labels)
- **Gray 900**: `text-gray-900` (Headings)

## Spacing Scale

- **xs**: `space-y-1` (4px)
- **sm**: `space-y-2` (8px)
- **md**: `space-y-4` (16px)
- **lg**: `space-y-6` (24px)
- **xl**: `space-y-8` (32px)

## Best Practices

1. **Always use the standardized components** instead of raw HTML elements
2. **Use the utility functions** for consistent spacing and layout
3. **Follow the color palette** for consistent visual hierarchy
4. **Include proper labels and helper text** for accessibility
5. **Use semantic HTML** and proper ARIA attributes
6. **Test components** across different screen sizes

## Migration Guide

When updating existing components:

1. Replace raw `<input>` with `<Input>` component
2. Replace raw `<button>` with `<Button>` component
3. Replace custom card divs with `<Card>` components
4. Update class names to use utility functions
5. Ensure consistent spacing using the spacing scale

## Example Migration

### Before (Inconsistent)
```tsx
<div className="bg-white rounded-lg shadow border border-gray-200 p-6">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Command Name
  </label>
  <input
    className="w-full px-3 py-2 border border-gray-300 rounded-md..."
    placeholder="Enter command name"
  />
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md...">
    Save
  </button>
</div>
```

### After (Standardized)
```tsx
<Card>
  <CardContent>
    <Input
      label="Command Name"
      placeholder="Enter command name"
    />
    <Button variant="primary">
      Save
    </Button>
  </CardContent>
</Card>
```

This approach ensures consistency, reduces code duplication, and makes maintenance much easier across your entire application.
