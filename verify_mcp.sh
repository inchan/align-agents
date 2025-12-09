#!/bin/bash

echo "=== MCP Configuration Verification ==="

# Function to check file content
check_file() {
    local name=$1
    local path=$2
    
    echo -e "\n--- Checking $name ---"
    echo "Path: $path"
    
    if [ -f "$path" ]; then
        echo "✅ File exists."
        echo "Content preview (searching for MCP servers):"
        # Search for key server names to verify injection
        if grep -q "sequential-thinking" "$path"; then
            echo "  - Found: sequential-thinking ✅"
            # Print the relevant section if possible, or just a snippet (to avoid huge output)
             grep -C 2 "sequential-thinking" "$path" | head -n 5
        else
            echo "  - NOT FOUND: sequential-thinking ❌"
            # Show file content if small, or head
            head -n 20 "$path"
        fi
        
        if grep -q "context7" "$path"; then
             echo "  - Found: context7 ✅"
        else
             echo "  - NOT FOUND: context7 ❌"
        fi
    else
        echo "❌ File not found at $path"
    fi
}

# 1. Claude Desktop
check_file "Claude Desktop" "$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# 2. Cursor
check_file "Cursor" "$HOME/.cursor/mcp.json"

# 3. Windsurf
check_file "Windsurf" "$HOME/.codeium/windsurf/mcp_config.json"

# 4. Claude Code (Check both potential locations)
check_file "Claude Code (Settings)" "$HOME/.claude/settings.json"
check_file "Claude Code (Config)" "$HOME/.claude/config.json"

echo -e "\n=== CLI Command Tests (if available) ==="
# Try to run CLI commands if they exist
if command -v claude &> /dev/null; then
    echo "Running 'claude mcp list'..."
    claude mcp list || echo "Command failed or not supported."
else
    echo "'claude' command not found."
fi

# Cursor command check
if command -v cursor &> /dev/null; then
    echo "Running 'cursor --help' to check for mcp..."
    # Cursor CLI usually opens the IDE, doesn't output info often. verifying.
    cursor --version
else 
     echo "'cursor' command not found."
fi

echo -e "\n=== Verification Complete ==="
