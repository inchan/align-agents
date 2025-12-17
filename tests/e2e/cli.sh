#!/bin/bash
# Run CLI E2E tests
echo "🧪 Running CLI E2E Tests..."
cd packages/cli
npx vitest run src/e2e
