#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "🎬 Starting Full Test Suite (Unit -> Integration -> E2E)..."

# 1. Unit Tests
echo ""
echo "========================================"
echo "👉 Step 1: Unit Tests"
echo "========================================"
./tests/unit/run.sh

# 2. Integration Tests
echo ""
echo "========================================"
echo "👉 Step 2: Integration Tests"
echo "========================================"
# Ensure API server is reachable or warn user
./tests/integration/run.sh

# 3. E2E Tests
echo ""
echo "========================================"
echo "👉 Step 3: E2E Tests"
echo "========================================"
./tests/e2e/run.sh

echo ""
echo "========================================"
echo "🎉 All tests passed successfully!"
echo "========================================"
