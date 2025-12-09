#!/bin/bash
echo "=== Updating Master Config ==="
mkdir -p ~/.ai-cli-syncer
cp temp_master_mcp.json ~/.ai-cli-syncer/master-mcp.json
echo "Master config updated."

echo -e "\n=== Running Sync ==="
cd packages/cli
node dist/index.js sync --all --strategy overwrite
cd ../../

echo -e "\n=== Verifying Results ==="
./verify_mcp.sh
