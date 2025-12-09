# AI CLI Syncer (acs) Context

## 1. Project Overview
**AI CLI Syncer** is a comprehensive tool for centrally managing and synchronizing configurations across various AI tools (Claude Desktop, Cursor, Gemini CLI, etc.). It manages MCP servers, Rules, and global settings, deploying them to specific tool configurations.

-   **Architecture**: Monorepo managed by **TurboRepo**.
-   **Core Components**:
    -   `packages/cli`: The primary CLI tool (`acs`).
    -   `packages/api`: Express-based backend API for management.
    -   `packages/web`: React-based Web UI for visual management.
-   **Design Pattern**: Clean Architecture (Domain Entities, Use Cases, Repositories, Services) with Dependency Injection.
-   **Language**: TypeScript (strict mode).

## 2. Key Directories & Files
-   `packages/cli/bin/acs`: The executable CLI entry point.
-   `packages/cli/src/`: Source code for the CLI.
    -   `commands/`: CLI command definitions (Commander.js).
    -   `services/`: Domain services.
    -   `use-cases/`: Application business logic.
    -   `infrastructure/`: Data access implementations.
-   `packages/api/src/`: Source code for the API server.
-   `packages/web/src/`: Source code for the React Web UI.
-   `docs/`: Extensive documentation (Architecture, Dev Guidelines, usage).
-   `runbooks/`: Operational runbooks.

## 3. Build & Run
The project uses **npm** and **TurboRepo**.

### Installation
```bash
npm install
```

### Build
```bash
# Build all packages
npm run build
```

### Development
```bash
# Start development mode (API + Web UI + Watch CLI)
npm run dev

# Run CLI directly during development
./packages/cli/bin/acs <command>
# Example: ./packages/cli/bin/acs status
```

### Testing
The project strictly follows TDD.
```bash
# Run all tests (Vitest)
npm test

# Run tests for specific package
npm test -w @ai-cli-syncer/cli

# Run specific test file
npm test -- packages/cli/src/services/__tests__/rules.test.ts
```

## 4. Development Conventions
**Strict adherence to these guidelines is required.**

### Coding Style
-   **Naming**:
    -   Classes/Interfaces: `PascalCase` (e.g., `RulesService`, `ISyncStrategy`)
    -   Functions/Variables: `camelCase` (e.g., `syncRules`)
    -   Files: `kebab-case` (e.g., `rules-service.ts`)
    -   Constants: `UPPER_SNAKE_CASE`
-   **TypeScript**:
    -   **No `any`**: Strictly forbidden. Use interfaces/types.
    -   **Async/Await**: Preferred over raw promises.
    -   **Null vs Undefined**: Handle explicitly.

### Architecture & Patterns
-   **Dependency Injection**: All services must be injected via interfaces.
-   **Repository Pattern**: Abstract data access (file system, git, etc.).
-   **Result Pattern**: Use a Result type for business logic failures instead of throwing exceptions (reserve exceptions for unexpected crashes).

### Testing Strategy (TDD)
1.  **Red**: Write a failing unit test first.
2.  **Green**: Write minimal code to pass the test.
3.  **Refactor**: Clean up while keeping tests passing.
-   **Mocking**: Heavily mock external dependencies (FS, Git) in unit tests.

## 5. Key CLI Commands
-   `acs init`: Initialize configuration.
-   `acs scan`: Scan for installed AI tools.
-   `acs sync`: Sync MCP/Rules to tools.
-   `acs rules`: Manage rules (list, edit, template).
-   `acs mcp`: Manage MCP servers.
-   `acs status`: Check synchronization status.
