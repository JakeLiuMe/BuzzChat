# BuzzChat MCP Server

Model Context Protocol (MCP) server for BuzzChat - the chat automation tool for Whatnot sellers.

This server allows AI assistants like Claude to configure and control BuzzChat directly through natural language.

## Installation

```bash
npx buzzchat-mcp
```

Or install globally:

```bash
npm install -g buzzchat-mcp
buzzchat-mcp
```

## Requirements

- Node.js 18+
- BuzzChat Chrome Extension installed
- Native messaging host configured (see BuzzChat docs)

## Configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "buzzchat": {
      "command": "npx",
      "args": ["buzzchat-mcp"]
    }
  }
}
```

## Available Tools

### Bot Control
- `get_status` - Get current bot status (active/inactive, tier, message count)
- `enable_bot` - Enable the chat bot
- `disable_bot` - Disable the chat bot
- `get_all_settings` - Get all BuzzChat settings

### Welcome Messages
- `get_welcome_settings` - Get welcome message configuration
- `set_welcome_message` - Set the welcome message text
- `enable_welcome` / `disable_welcome` - Toggle welcome messages
- `set_welcome_delay` - Set delay between welcomes

### FAQ Auto-Replies
- `get_faq_rules` - List all FAQ rules
- `add_faq_rule` - Add a new FAQ rule with triggers and reply
- `remove_faq_rule` - Remove an FAQ rule
- `enable_faq` / `disable_faq` - Toggle FAQ auto-replies

### Timer Messages
- `get_timer_messages` - List all timer messages
- `add_timer_message` - Add a recurring message
- `remove_timer_message` - Remove a timer message
- `enable_timer` / `disable_timer` - Toggle timer messages

### Templates
- `get_templates` - List all quick templates
- `add_template` - Add a new template
- `remove_template` - Remove a template
- `send_template` - Send a template immediately

### Moderation
- `get_moderation_settings` - Get moderation configuration
- `add_blocked_word` - Add a word to the block list
- `remove_blocked_word` - Remove a blocked word
- `enable_moderation` / `disable_moderation` - Toggle moderation

### Giveaway
- `get_giveaway_settings` - Get giveaway configuration
- `get_giveaway_entries` - Get current giveaway entries
- `reset_giveaway` - Clear all giveaway entries
- `enable_giveaway` / `disable_giveaway` - Toggle giveaway tracking

### Analytics
- `get_analytics` - Get bot analytics (messages sent, breakdown, etc.)

## Example Usage

Ask Claude:
- "Set up a welcome message that says 'Hey {username}! Welcome to my stream!'"
- "Add an FAQ rule that responds to 'shipping' with our shipping policy"
- "Show me how many messages the bot has sent today"
- "Add a timer message about free shipping that repeats every 5 minutes"

## How It Works

The MCP server communicates with the BuzzChat Chrome extension via Chrome's native messaging protocol. When you give Claude a command, it:

1. Receives your natural language request
2. Calls the appropriate BuzzChat tool
3. The tool sends a message to the native messaging bridge
4. The bridge forwards it to the Chrome extension
5. The extension updates settings in Chrome storage
6. Changes take effect immediately on your live stream

```
Claude <-> MCP Server <-> Native Bridge <-> Chrome Extension <-> Whatnot
```

## Pricing

BuzzChat offers three tiers:

| Feature | Free | Pro ($7.99/mo) | Business ($19.99/mo) |
|---------|------|----------------|----------------------|
| Messages/day | 25 | Unlimited | Unlimited |
| FAQ Rules | 2 | Unlimited | Unlimited |
| Analytics | 7 days | 90 days | 90 days + export |
| Giveaway | Basic | Basic | Advanced |
| Support | Community | Priority | Priority |

## Support

- GitHub Issues: https://github.com/buzzchat/buzzchat-mcp/issues
- Website: https://buzzchat.app

## License

MIT
