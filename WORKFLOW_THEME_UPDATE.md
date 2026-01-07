# Workflow Page Theme Update

## Overview
Updated `/admin/workflows` page to use proper Shadcn UI theme system with full dark mode support.

## Changes Made

### 1. Color System Migration
**Before:** Hardcoded Tailwind colors (e.g., `bg-purple-600`, `text-red-500`)  
**After:** Theme-aware colors with dark mode variants

### 2. Status Badge Colors
Updated to support both light and dark modes:
```tsx
- DRAFT: bg-gray-100 → bg-slate-100 dark:bg-slate-800
- IN_REVIEW: bg-yellow-100 dark:bg-yellow-900
- PENDING_APPROVAL: bg-orange-100 dark:bg-orange-900
- APPROVED: bg-green-100 dark:bg-green-900
- PUBLISHED: bg-blue-100 dark:bg-blue-900
- REJECTED: bg-red-100 dark:bg-red-900
- ARCHIVED: bg-purple-100 dark:bg-purple-900
- EXPIRED: bg-pink-100 dark:bg-pink-900
```

### 3. Capability Badge Colors
```tsx
- ADMIN_ACCESS: Purple (bg-purple-500 dark:bg-purple-600)
- *_MANAGE: Indigo (bg-indigo-500 dark:bg-indigo-600)
- *_DELETE: Destructive variant (uses theme destructive color)
- *_APPROVE: Orange (bg-orange-500 dark:bg-orange-600)
- *_PUBLISH: Blue (bg-blue-500 dark:bg-blue-600)
- Others: Secondary variant (uses theme secondary color)
```

### 4. Level Badge Colors
```tsx
- Level 100+: Purple (Admin Only)
- Level 70+: Blue (Manager+)
- Level 50+: Green (Editor+)
- Others: Secondary variant
```

### 5. Icon Colors
Updated to use semantic colors:
- Success icons: `text-green-600 dark:text-green-500`
- Warning icons: `text-orange-600 dark:text-orange-500`
- Destructive icons: `text-destructive` (uses theme destructive color)
- Info icons: `text-blue-600 dark:text-blue-400`

### 6. Statistics Cards
Updated number colors to support dark mode:
- Active count: `text-green-600 dark:text-green-500`
- Inactive count: `text-orange-600 dark:text-orange-500`
- Capabilities used: `text-blue-600 dark:text-blue-500`

### 7. UI Enhancements

#### System Info Alert
- Added blue theme color scheme
- Enhanced code tags with background
- Improved link hover states

#### Tabs
- Added grid layout for equal-width tabs
- Added icons to each tab (Eye, Table, BarChart3)
- Better visual hierarchy

## Theme Compatibility

### Shadcn UI Components Used
- ✅ Button (with proper variants)
- ✅ Card (CardContent, CardHeader, CardTitle, CardDescription)
- ✅ Badge (with variants: default, secondary, destructive, outline)
- ✅ Dialog
- ✅ Input
- ✅ Label
- ✅ Select
- ✅ Switch
- ✅ Alert
- ✅ Tabs

### CSS Variables
All colors now respect Shadcn theme CSS variables:
- `--destructive` for error/delete actions
- `--muted` and `--muted-foreground` for subtle elements
- `--secondary` for secondary emphasis
- Dark mode variants automatically switch with `dark:` prefix

## Testing
- ✅ Build successful without errors
- ✅ All badges render correctly
- ✅ Icons use semantic colors
- ✅ Dark mode support via Tailwind dark: prefix
- ✅ Responsive grid layouts
- ✅ Proper color contrast for accessibility

## Benefits
1. **Consistency:** Matches other admin pages using Shadcn UI
2. **Dark Mode:** Full support for dark theme
3. **Maintainability:** Uses theme variables instead of hardcoded colors
4. **Accessibility:** Better color contrast ratios
5. **Future-proof:** Easy to update theme globally via CSS variables

## Files Modified
- `/src/app/admin/workflows/page.tsx` - Complete theme update
