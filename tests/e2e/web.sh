#!/bin/bash
# Run Web E2E tests using Playwright
echo "🧪 Running Web E2E Tests..."

# Function to cleanup API server if we started it
cleanup() {
    if [ ! -z "$API_PID" ]; then
        echo "🛑 Stopping API Server (PID: $API_PID)..."
        kill $API_PID
    fi
}

# Check if API server is running on port 3001
if ! lsof -i :3001 > /dev/null; then
    echo "⚠️  API Server is not running on port 3001. Starting it now..."
    
    # Start API server in background
    # Use 'npm run dev' for the API workspace
    # Redirect output to avoid clutter, or log to a file
    npm run dev --workspace=@align-agents/api > /dev/null 2>&1 &
    API_PID=$!
    echo "   🚀 API Server started with PID: $API_PID"

    # Trap exit signal to ensure we kill the server we started
    trap cleanup EXIT

    # Wait for the API server to be ready
    echo "   ⏳ Waiting for API server to become ready..."
    # We can use the wait-for-port script from packages/web if available
    if [ -f "packages/web/scripts/wait-for-port.cjs" ]; then
        node packages/web/scripts/wait-for-port.cjs
    else
        # Fallback wait using sleep loop if script missing
        sleep 5
    fi
else
    echo "✅ API Server is already running on port 3001."
fi

cd packages/web
npm run test:e2e -- --reporter=line