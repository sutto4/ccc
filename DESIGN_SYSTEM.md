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
