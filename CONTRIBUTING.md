# Contributing to AI CLI Syncer

Thank you for your interest in contributing to AI CLI Syncer! This document provides guidelines and information for contributors.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Development Setup

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ai-cli-syncer.git
cd ai-cli-syncer

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Running Development Servers

```bash
# Start API server (port 3001)
npm run dev -w @ai-cli-syncer/api

# Start Web UI (port 5173)
npm run dev -w @ai-cli-syncer/web

# Or run both with turbo
npm run dev
```

## Project Structure

```
ai-cli-syncer/
├── packages/
│   ├── cli/              # Core CLI package
│   │   ├── src/
│   │   │   ├── commands/       # CLI commands
│   │   │   ├── use-cases/      # Business logic
│   │   │   ├── services/       # Domain services
│   │   │   ├── infrastructure/ # File system, repositories
│   │   │   ├── interfaces/     # TypeScript interfaces
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   └── utils/          # Utility functions
│   │   └── package.json
│   ├── api/              # Express API server
│   │   ├── src/
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── routes/         # Route definitions
│   │   │   ├── middleware/     # Express middleware
│   │   │   └── schemas/        # API validation schemas
│   │   └── package.json
│   └── web/              # React frontend
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── pages/          # Page components
│       │   ├── lib/            # Utilities and API client
│       │   └── layouts/        # Layout components
│       └── package.json
├── docs/                 # Documentation
├── turbo.json           # Turborepo config
└── package.json         # Root package.json
```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates

Example: `feature/add-gemini-support`

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance

Example:
```
feat(cli): add support for Gemini CLI tool

- Add tool metadata for Gemini
- Implement MCP sync for Gemini config
- Add rules filename mapping
```

## Coding Guidelines

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all public APIs
- Use Zod schemas for runtime validation
- Avoid `any` type - use `unknown` if type is truly unknown

### Architecture

This project follows Clean Architecture principles:

1. **Commands** (CLI) / **Controllers** (API): Handle I/O
2. **Use Cases**: Orchestrate business logic
3. **Services**: Domain-specific operations
4. **Repositories**: Data access abstraction
5. **Infrastructure**: External system integration

**Dependency Rule**: Dependencies point inward. Inner layers should not know about outer layers.

### File Naming

- Use PascalCase for classes: `RulesService.ts`
- Use camelCase for utilities: `validation.ts`
- Use kebab-case for routes: `mcp.routes.ts`
- Suffix test files with `.test.ts`

### Code Style

```typescript
// Use interfaces for dependencies (DIP)
export class RulesService implements IRulesService {
    constructor(
        private fs: IFileSystem,
        private masterDir?: string
    ) {}
}

// Use Zod for validation
const result = validateData(RulesConfigSchema, data, 'Invalid rules config');

// Use async/await for async operations
async function syncRules(): Promise<SyncResult[]> {
    const rules = await this.loadRules();
    // ...
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test -w @ai-cli-syncer/cli

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e -w @ai-cli-syncer/web
```

### Writing Tests

Use Vitest for unit tests and Playwright for E2E tests.

```typescript
// Unit test example
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('RulesService', () => {
    let service: RulesService;
    let mockFs: MockedFileSystem;

    beforeEach(() => {
        mockFs = createMockFileSystem();
        service = new RulesService(mockFs as IFileSystem);
    });

    it('should load master rules', () => {
        mockFs.readFile.mockReturnValue('# Rules');
        const result = service.loadMasterRules();
        expect(result).toBe('# Rules');
    });
});
```

### Test Coverage Goals

| Layer | Target |
|-------|--------|
| Use Cases | 90%+ |
| Services | 80%+ |
| Repositories | 80%+ |
| Utilities | 90%+ |

## Pull Request Process

### Before Submitting

1. Ensure all tests pass: `npm test`
2. Ensure build succeeds: `npm run build`
3. Update documentation if needed
4. Add tests for new features

### PR Description Template

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements (except intentional)
```

### Review Process

1. Create PR with description
2. Automated checks run (tests, build)
3. Code review by maintainers
4. Address feedback
5. Merge when approved

## Adding New Tool Support

To add support for a new AI tool:

1. **Add tool metadata** in `packages/cli/src/constants/tools.ts`:

```typescript
{
    id: 'newtool',
    name: 'New Tool',
    configPaths: ['~/.newtool/config.json'],
    rulesFilename: '.newtoollrules',
    globalRulesDir: '~/.newtool',
    supportsMcp: true,
}
```

2. **Add tests** for the new tool configuration

3. **Update documentation** to include the new tool

4. **Test manually** with the actual tool installed

## Questions?

- Open a GitHub issue for bugs or feature requests
- Check existing issues before creating new ones
- Join discussions in GitHub Discussions

Thank you for contributing! 🎉
