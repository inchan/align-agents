# Comprehensive Refactoring Plan

## Overview
This document outlines a strategic refactoring plan for the `align-agents` monorepo. The primary goals are to eliminate code duplication, enforce architectural boundaries, standardizing the API implementation, and establish a shared "Core" library.

## Current State & Issues
1.  **Architecture Violation:** `@align-agents/api` depends on `@align-agents/cli`. The CLI package currently acts as a monolithic backend library.
2.  **Code Duplication:** Two separate API server implementations exist:
    *   `packages/cli`: Fastify-based, used for local `acs ui` command.
    *   `packages/api`: Express-based, used for standalone server deployment.
    *   Both implement similar routes (tools, projects, rules, etc.) with duplicated logic.
3.  **Inconsistent Frameworks:** Mixing Express and Fastify increases maintenance burden and cognitive load.
4.  **Tight Coupling:** Business logic, data access, and CLI commands are intertwined in `packages/cli`.

## Phase 1: Create `@align-agents/core` (The Foundation)
**Objective:** Extract business logic, data access, and shared types into a framework-agnostic library.

1.  **Initialize Package:** Create `packages/core`.
2.  **Migrate Logic:** Move the following directories from `packages/cli/src` to `packages/core/src`:
    *   `interfaces/`
    *   `infrastructure/` (Database, FileSystem, Repositories)
    *   `services/`
    *   `use-cases/`
    *   `schemas/`
    *   `constants/`
    *   `utils/`
3.  **Update Dependencies:**
    *   Move relevant dependencies (e.g., `better-sqlite3`, `zod`, `commander` components if needed) to `packages/core/package.json`.
    *   Update `packages/cli` to depend on `@align-agents/core`.
    *   Refactor imports in `packages/cli` to use `@align-agents/core`.

## Phase 2: Unify API Implementation (The Consolidation)
**Objective:** Single source of truth for the API server, likely standardizing on **Fastify** (since it's already used in the CLI and is performant).

1.  **Refactor `@align-agents/api`:**
    *   Convert `packages/api` from Express to Fastify.
    *   This aligns it with the existing CLI implementation.
2.  **Migrate Routes:**
    *   Move route handlers from `packages/cli/src/api/routes` to `packages/api/src/routes`.
    *   Ensure these routes use the services/use-cases from `@align-agents/core`.
3.  **Eliminate CLI API Code:**
    *   Delete `packages/cli/src/api`.
    *   Delete duplicate route logic in `packages/cli`.
4.  **Consume API in CLI:**
    *   Update `packages/cli/src/commands/ui.ts` to import the server factory/app from `@align-agents/api`.
    *   The CLI essentially just "starts" the API server defined in the separate package.

## Phase 3: Dependency & Configuration Cleanup
**Objective:** Clean up the dependency graph and configuration management.

1.  **Decouple API from CLI:**
    *   `packages/api` should depend on `@align-agents/core` and `@align-agents/logger`.
    *   It should **NOT** depend on `@align-agents/cli`.
2.  **Shared Configuration:**
    *   Centralize configuration loading (env vars, config files) in `@align-agents/core` or a dedicated config module.

## Phase 4: Testing & Quality
**Objective:** Ensure reliability during refactoring.

1.  **Unit Tests:** Move existing tests to `packages/core` alongside the moved code. Ensure they pass.
2.  **Integration Tests:** Create API integration tests in `packages/api` that verify the endpoints (using the real `core` logic).
3.  **E2E Tests:** Ensure `web` package E2E tests (Playwright) still pass against the new unified API.

## Detailed Roadmap

| Step | Task | Description |
| :--- | :--- | :--- |
| 1.1 | Scaffold `core` | Create `packages/core` with `package.json`, `tsconfig.json`. |
| 1.2 | Move Domain | Move Interfaces, Services, UseCases, Schemas to `core`. |
| 1.3 | Move Infra | Move Database, FileSystem, Repositories to `core`. |
| 1.4 | Link CLI | Update `packages/cli` to use `core`. Verify CLI basic commands work. |
| 2.1 | Init Fastify API | Rewrite `packages/api` entry point to use Fastify. |
| 2.2 | Port Routes | Move logic from `packages/cli/src/api` to `packages/api/src`. |
| 2.3 | Link CLI to API | Update `acs ui` to use `@align-agents/api` factory. |
| 2.4 | Cleanup | Remove Express dependencies and old CLI API code. |
| 3.1 | Verify Web | Run `packages/web` tests against the new backend. |

