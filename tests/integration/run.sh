#!/bin/bash
# Run integration tests
# Assumes the API server is running on http://localhost:3001

echo "🧪 Running Integration Tests..."

# Check if server port 3001 is open (optional simple check)
if ! lsof -i :3001 > /dev/null; then
    echo "⚠️  Warning: Port 3001 does not seem to be in use. Make sure the API server is running."
    echo "   You can start it with: npm run dev --workspace=@align-agents/api"
    # We don't exit here, just warn, in case lsof is missing or server is starting
fi

node tests/integration/api-test.js
