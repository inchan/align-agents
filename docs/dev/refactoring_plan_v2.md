# The Master Refactoring Plan: Unified Core & API Architecture

## 1. Executive Summary
This document defines the roadmap to transform `align-agents` from a coupled CLI/API monolith into a modular, layered architecture. 
**Goal:** Establish `@align-agents/core` as the single source of truth for domain logic, and unify the HTTP server implementation on **Fastify** across both CLI and Standalone modes.

**Key Decisions:**
*   **Architecture:** Hexagonal-ish. `core` contains Domain, Ports (Interfaces), and Adapters (Infra).
*   **Server:** Unify on **Fastify**. Express (in `api`) is deprecated.
*   **Config:** Decentralize `mcpServers` from `package.json` to a robust `ConfigService`.
*   **Safety:** Strict database path preservation to prevent data loss.

---

## 2. Risk Assessment & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Data Loss** | Users lose their project/MCP configuration. | Use exact same DB path resolution logic in `core`. **Backup DB before migration.** |
| **Dependency Hell** | Circular dependencies during transition. | Strict ordering: `core` -> `logger` -> `api`/`cli`. Use `nx` or `turbo` graph to verify. |
| **Feature Regression** | UI stops working due to API changes. | Freeze `web` changes. Use `e2e` tests as the gatekeeper for each phase. |
| **Log Loss** | CLI output becomes invisible. | Port `LogInterceptor` to `core` and integrate with `FastifyLogger`. |

---

## 3. Detailed Architecture

### 3.1 New Package Structure
```text
packages/
├── core/                 (NEW: The Brain)
│   ├── src/
│   │   ├── domain/       (Entities, Zod Schemas, Constants)
│   │   ├── interfaces/   (Service/Repo Interfaces, Ports)
│   │   ├── services/     (Business Logic: ProjectService, RulesService)
│   │   ├── infra/        (Impl: SqliteDB, FileSystem, ToolDefinitions)
│   │   ├── config/       (ConfigLoader, default settings)
│   │   └── logging/      (ConsoleInterceptor, Logger factory wrappers)
├── api/                  (The Server)
│   ├── src/
│   │   ├── routes/       (Fastify Routes -> call Core Services)
│   │   ├── plugins/      (Fastify Plugins: Cors, Static, etc.)
│   │   └── server.ts     (Server Factory)
├── cli/                  (The Interface)
│   ├── src/
│   │   ├── commands/     (Commander definitions)
│   │   └── index.ts      (Entry point)
├── logger/               (Shared Utility)
└── web/                  (Frontend)
```

---

## 4. Phase-by-Phase Implementation Plan

### Phase 0: Preparation (Safety First)
1.  **Backup:** Create a script to backup `~/.align-agents/db.sqlite` (or wherever it lives).
2.  **Snapshot:** Run `npm run test` and `npm run test:e2e` in `cli` and `web`. Save the output report.
3.  **Audit:** Identify all hardcoded paths in `packages/cli/src/constants/paths.ts`.

### Phase 1: The Core Foundation
**Objective:** Create `packages/core` and move "leaf" dependencies first.

1.  **Scaffold:** Create `packages/core` with strict `tsconfig.json` and `package.json`.
2.  **Move Domain:** Move `interfaces`, `schemas`, `constants` (excluding paths for now) to `core`.
3.  **Move Logging:** Move `LogInterceptor` and generic logging utils to `core/logging`.
4.  **Verification:** Update `cli` to import these from `core`. Ensure build passes.

### Phase 2: Logic Migration (The Heavy Lift)
**Objective:** Move Business Logic and Infrastructure.

1.  **Move Database:** Move `SqliteDatabase` and `McpRepository` to `core/infra`.
    *   *Critical:* Ensure `better-sqlite3` dependency is moved.
2.  **Move Services:** Move `ProjectService`, `RulesService`, etc., to `core/services`.
    *   *Refactor:* Inject `IFileSystem` and `IDatabase` instead of using singletons/globals where possible.
3.  **Move Infrastructure:** Move `ToolDefinitions` and `paths.ts`.
    *   *Check:* Ensure `getDatabasePath` logic remains identical.
4.  **Verification:** Run unit tests in `core`. Update `cli` to use `core` services.

### Phase 3: API Unification (Fastify Standard)
**Objective:** Replace Express `api` with Fastify `api` and make `cli` use it.

1.  **Rebuild API Package:**
    *   Wipe `packages/api/src`.
    *   Install `fastify`, `@fastify/cors`, etc.
    *   Create `ServerFactory` that accepts `core` services.
2.  **Port Routes:**
    *   Move route handlers from `packages/cli/src/api` to `packages/api/src/routes`.
    *   Refactor them to use `core` services.
3.  **Update CLI:**
    *   Modify `packages/cli/src/commands/ui.ts` to import `createApp` from `@align-agents/api`.
    *   Remove local Fastify server setup from `cli`.

### Phase 4: Configuration Cleanup
**Objective:** Remove `package.json` config dependency.

1.  **Config Service:** Create `core/src/config/ConfigService.ts`.
    *   Logic: Load defaults -> Load `~/.align-agents/config.json` -> Load Env Vars.
2.  **Migrate Defaults:** Move `mcpServers` from `cli/package.json` to `core` defaults.
3.  **Update Consumers:** Update `McpService` to use `ConfigService`.

### Phase 5: Final Verification & Cleanup
1.  **E2E Test:** Run the full `web` test suite against the new system.
2.  **Dead Code Removal:** Delete `packages/cli/src/api`, `packages/cli/src/services` (now empty), etc.
3.  **Documentation:** Update `CONTRIBUTING.md` with new architecture.

---

## 5. Rollback Strategy
If any phase fails critically (e.g., data corruption, unresolvable build errors):
1.  **Git Revert:** `git reset --hard <pre-migration-commit>`.
2.  **Restore DB:** Restore `db.sqlite` from the backup created in Phase 0.
3.  **Clean Install:** `rm -rf node_modules && npm install` to reset symlinks.

