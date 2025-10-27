#!/bin/bash

# Check if BRAVE_API_KEY is set
if [ -z "$BRAVE_API_KEY" ]; then
    echo "Error: BRAVE_API_KEY not found in environment" >&2
    exit 1
fi

# Launch the Brave Search MCP server with the API key
exec npx -y @brave/brave-search-mcp-server
