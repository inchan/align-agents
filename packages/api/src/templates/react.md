# React Project Rules

## Core Principles

- Functional Components with Hooks
- TypeScript for type safety
- Component composition over inheritance

## File Structure

- `src/components`: Reusable UI components
- `src/pages`: Page components (routes)
- `src/hooks`: Custom hooks
- `src/lib`: Utility functions and API calls

## Naming Conventions

- Components: PascalCase (e.g., `UserProfile.tsx`)
- Hooks: camelCase with use prefix (e.g., `useAuth.ts`)
- Utilities: camelCase (e.g., `formatDate.ts`)

## State Management

- Use `useState` for local state
- Use Context or external libraries (Zustand, TanStack Query) for global/server state
