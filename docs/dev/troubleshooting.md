# UI Troubleshooting Guide

This document records solutions to specific UI issues encountered during development.

## Radix UI ScrollArea Layout Issue

### Symptom
`truncate` (text-overflow: ellipsis) and `min-w-0` do not work correctly inside `ScrollArea`. Content expands infinitely instead of truncating.

### Cause
The `Viewport` component of Radix UI's `ScrollArea` internally creates a `div` with `display: table`. The table layout algorithm forces columns to expand to fit their content, overriding standard block-level truncation rules.

### Solution
Force the child `div` of the `Viewport` to be `display: block` via CSS override in `components/ui/scroll-area.tsx`.

```tsx
// packages/web/src/components/ui/scroll-area.tsx

<ScrollAreaPrimitive.Viewport
  className="h-full w-full rounded-[inherit] [&>div]:!block"
>
```

### Applied Scope
- `McpPage` (Sets, Items, Library panels)
- `ProjectsPage` (Project list)
- `SyncPage` (Rules, Sync panels)

---
*Last Updated: 2025-12-08*
