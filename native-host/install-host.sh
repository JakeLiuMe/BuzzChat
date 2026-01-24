#!/bin/bash

# BuzzChat MCP Native Host Installer for macOS/Linux
# This script registers the native messaging host with Chrome/Chromium

set -e

echo "========================================="
echo "BuzzChat MCP Native Host Installer"
echo "========================================="
echo

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_PATH="${SCRIPT_DIR}/../mcp-server/build/index.js"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_PATH=$(which node)

# Prompt for Chrome extension ID
echo "Enter your BuzzChat Chrome extension ID:"
read -r EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo "ERROR: Extension ID is required."
    exit 1
fi

# Determine the target directory based on OS and browser
HOST_NAME="com.buzzchat.mcp"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_TARGET_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    CHROMIUM_TARGET_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
else
    # Linux
    CHROME_TARGET_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROMIUM_TARGET_DIR="$HOME/.config/chromium/NativeMessagingHosts"
fi

# Create manifest content
create_manifest() {
    local target_path="$1"
    cat > "$target_path" << EOF
{
  "name": "${HOST_NAME}",
  "description": "BuzzChat MCP Bridge - Enables AI assistant communication with BuzzChat Chrome extension",
  "path": "${NODE_PATH}",
  "args": ["${BRIDGE_PATH}"],
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://${EXTENSION_ID}/"
  ]
}
EOF
}

# Install for Chrome
install_for_browser() {
    local browser_name="$1"
    local target_dir="$2"

    if [ -d "$(dirname "$target_dir")" ]; then
        echo "Installing for ${browser_name}..."
        mkdir -p "$target_dir"
        create_manifest "${target_dir}/${HOST_NAME}.json"
        echo "  Installed to: ${target_dir}/${HOST_NAME}.json"
        return 0
    fi
    return 1
}

# Try to install for available browsers
INSTALLED=0

if install_for_browser "Google Chrome" "$CHROME_TARGET_DIR"; then
    INSTALLED=1
fi

if install_for_browser "Chromium" "$CHROMIUM_TARGET_DIR"; then
    INSTALLED=1
fi

if [ $INSTALLED -eq 0 ]; then
    echo "ERROR: No Chrome or Chromium installation found."
    echo "Please install Chrome or Chromium first."
    exit 1
fi

echo
echo "========================================="
echo "SUCCESS! Native messaging host installed."
echo "========================================="
echo
echo "The BuzzChat MCP server can now communicate"
echo "with your Chrome extension."
echo
echo "Next steps:"
echo "1. Make sure the MCP server is built:"
echo "   cd mcp-server && npm install && npm run build"
echo "2. Restart Chrome"
echo "3. Configure your AI assistant to use buzzchat-mcp"
echo
