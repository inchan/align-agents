#!/bin/bash
# Run all E2E tests (CLI and Web)

echo "🚀 Starting All E2E Tests..."

# Run CLI tests
./tests/e2e/cli.sh
CLI_EXIT_CODE=$?

if [ $CLI_EXIT_CODE -ne 0 ]; then
    echo "❌ CLI E2E Tests Failed!"
    exit $CLI_EXIT_CODE
fi

# Run Web tests
./tests/e2e/web.sh
WEB_EXIT_CODE=$?

if [ $WEB_EXIT_CODE -ne 0 ]; then
    echo "❌ Web E2E Tests Failed!"
    exit $WEB_EXIT_CODE
fi

echo "✅ All E2E Tests Passed!"
