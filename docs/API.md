# BuzzChat API Documentation

> **Business Tier Feature**: API access is available exclusively to Business tier subscribers.

## Overview

The BuzzChat API allows you to programmatically control extension features, retrieve analytics data, and integrate with external tools like MCP servers, automation platforms, and custom dashboards.

> **OpenAPI Specification**: For a machine-readable API definition, see [`openapi.yaml`](./openapi.yaml). This can be imported into tools like Swagger UI, Postman, or used to generate client SDKs.

## Authentication

All API requests require authentication using an API key.

### Generating API Keys

1. Open the BuzzChat extension popup
2. Navigate to Settings → API Access
3. Click "Create API Key"
4. Give your key a descriptive name
5. **Important**: Copy and save your API key immediately - it won't be shown again

### Using API Keys

Include your API key in the request header:

```http
Authorization: Bearer YOUR_API_KEY
```

Or as a query parameter (less secure, not recommended):

```http
GET /api/v1/analytics?api_key=YOUR_API_KEY
```

## API Endpoints

### Analytics

#### Get Session Analytics

Retrieve analytics data for your chat sessions.

```http
GET /api/v1/analytics
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | Time period: `day`, `week`, `month`, `all` (default: `week`) |
| `account` | string | No | Account ID for multi-account users |

**Response:**

```json
{
  "success": true,
  "data": {
    "totalMessages": 1250,
    "welcomeMessages": 450,
    "faqReplies": 320,
    "timerMessages": 480,
    "period": "week",
    "breakdown": {
      "welcome": 36,
      "faq": 25.6,
      "timer": 38.4
    }
  }
}
```

#### Get Top FAQ Triggers

```http
GET /api/v1/analytics/faq-triggers
```

**Response:**

```json
{
  "success": true,
  "data": {
    "triggers": [
      { "keyword": "shipping", "count": 145 },
      { "keyword": "payment", "count": 89 },
      { "keyword": "size", "count": 67 }
    ]
  }
}
```

### Messages

#### Send Message

Send a chat message programmatically.

```http
POST /api/v1/messages/send
```

**Request Body:**

```json
{
  "message": "Thanks for joining! Use code SAVE10 for 10% off!",
  "delay": 0
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "sentAt": "2025-01-24T10:30:00Z"
  }
}
```

### Giveaways

#### Get Current Entries

```http
GET /api/v1/giveaway/entries
```

**Response:**

```json
{
  "success": true,
  "data": {
    "entries": [
      { "username": "viewer123", "timestamp": "2025-01-24T10:25:00Z" },
      { "username": "shopper456", "timestamp": "2025-01-24T10:26:30Z" }
    ],
    "count": 2
  }
}
```

#### Pick Random Winner

```http
POST /api/v1/giveaway/pick-winner
```

**Request Body:**

```json
{
  "count": 1
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "winners": ["viewer123"],
    "timestamp": "2025-01-24T10:30:00Z"
  }
}
```

#### Clear Entries

```http
DELETE /api/v1/giveaway/entries
```

**Response:**

```json
{
  "success": true,
  "message": "All entries cleared"
}
```

### Settings

#### Get Current Settings

```http
GET /api/v1/settings
```

**Response:**

```json
{
  "success": true,
  "data": {
    "botActive": true,
    "welcomeEnabled": true,
    "welcomeMessage": "Welcome to the stream, {username}!",
    "welcomeDelay": 3000,
    "timerMessages": [...],
    "faqRules": [...]
  }
}
```

#### Update Settings

```http
PATCH /api/v1/settings
```

**Request Body:**

```json
{
  "welcomeEnabled": true,
  "welcomeMessage": "Hey {username}, glad you're here!"
}
```

### Accounts (Multi-Account)

#### List Accounts

```http
GET /api/v1/accounts
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accounts": [
      { "id": "acc_1", "name": "Main Store", "isActive": true },
      { "id": "acc_2", "name": "Summer Sale", "isActive": false }
    ]
  }
}
```

#### Switch Active Account

```http
POST /api/v1/accounts/switch
```

**Request Body:**

```json
{
  "accountId": "acc_2"
}
```

## MCP Server Integration

BuzzChat supports integration with Model Context Protocol (MCP) servers for AI-powered automation.

### Available MCP Tools

| Tool Name | Description |
|-----------|-------------|
| `buzzchat_send_message` | Send a chat message |
| `buzzchat_get_analytics` | Retrieve analytics data |
| `buzzchat_pick_winner` | Select giveaway winner |
| `buzzchat_toggle_bot` | Enable/disable the bot |

### Example MCP Configuration

```json
{
  "mcpServers": {
    "buzzchat": {
      "command": "buzzchat-mcp",
      "args": ["--api-key", "YOUR_API_KEY"],
      "env": {
        "BUZZCHAT_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

### Using with Claude Desktop

1. Add the MCP server configuration to your Claude Desktop settings
2. Start a conversation and mention BuzzChat tools
3. Claude can now send messages, check analytics, and manage giveaways

**Example prompt:**
> "Send a welcome message saying 'Thanks for tuning in!' and then pick a giveaway winner"

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or expired"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or expired |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INSUFFICIENT_TIER` | 403 | Feature requires Business tier |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `BOT_INACTIVE` | 400 | Bot must be active for this action |
| `NOT_FOUND` | 404 | Resource not found |

## Rate Limits

| Tier | Requests per minute | Requests per day |
|------|---------------------|------------------|
| Business | 60 | 10,000 |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1706093400
```

## Webhooks

Configure webhooks to receive real-time event notifications. Webhooks are available to Business tier subscribers.

### Supported Events

| Event | Description |
|-------|-------------|
| `giveaway.entry` | New user entered the giveaway |
| `giveaway.winner` | Winner(s) selected |
| `message.sent` | Bot sent a message |
| `message.received` | Chat message received (matching FAQ/command) |
| `bot.started` | Bot was activated |
| `bot.stopped` | Bot was deactivated |

### Register a Webhook

```http
POST /api/v1/webhooks
```

**Request Body:**

```json
{
  "url": "https://example.com/webhooks/buzzchat",
  "events": ["giveaway.entry", "giveaway.winner"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "wh_abc123",
    "url": "https://example.com/webhooks/buzzchat",
    "events": ["giveaway.entry", "giveaway.winner"],
    "secret": "whsec_xyz789...",
    "active": true,
    "createdAt": "2025-01-24T10:00:00Z"
  }
}
```

> **Important**: Save the `secret` immediately - it won't be shown again. Use it to verify webhook signatures.

### Webhook Payload Format

All webhook events are delivered as POST requests with this structure:

```json
{
  "id": "evt_xyz789",
  "type": "giveaway.entry",
  "timestamp": "2025-01-24T10:30:00Z",
  "data": {
    "username": "viewer123",
    "entryTime": "2025-01-24T10:30:00Z"
  }
}
```

### Signature Verification

Webhooks include an HMAC-SHA256 signature in the `X-BuzzChat-Signature` header. Verify it using your webhook secret:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### List Webhooks

```http
GET /api/v1/webhooks
```

### Update Webhook

```http
PATCH /api/v1/webhooks/{webhookId}
```

```json
{
  "events": ["giveaway.entry", "giveaway.winner", "bot.started"],
  "active": true
}
```

### Delete Webhook

```http
DELETE /api/v1/webhooks/{webhookId}
```

### Test Webhook

Send a test event to verify your endpoint is receiving webhooks correctly:

```http
POST /api/v1/webhooks/{webhookId}/test
```

**Response:**

```json
{
  "success": true,
  "data": {
    "delivered": true,
    "responseCode": 200,
    "responseTime": 150
  }
}
```

## Code Examples

### JavaScript/Node.js

```javascript
const BUZZCHAT_API_KEY = 'your_api_key_here';

async function sendMessage(message) {
  const response = await fetch('https://api.buzzchat.app/v1/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUZZCHAT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });

  return response.json();
}

// Send a promotional message
sendMessage('Flash sale! 20% off everything for the next 30 minutes!')
  .then(result => console.log('Message sent:', result));
```

### Python

```python
import requests

API_KEY = 'your_api_key_here'
BASE_URL = 'https://api.buzzchat.app/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

def get_analytics(period='week'):
    response = requests.get(
        f'{BASE_URL}/analytics',
        headers=headers,
        params={'period': period}
    )
    return response.json()

def pick_winner(count=1):
    response = requests.post(
        f'{BASE_URL}/giveaway/pick-winner',
        headers=headers,
        json={'count': count}
    )
    return response.json()

# Get weekly analytics
stats = get_analytics('week')
print(f"Total messages this week: {stats['data']['totalMessages']}")

# Pick a giveaway winner
result = pick_winner()
print(f"Winner: {result['data']['winners'][0]}")
```

### cURL

```bash
# Get analytics
curl -X GET "https://api.buzzchat.app/v1/analytics?period=week" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Send a message
curl -X POST "https://api.buzzchat.app/v1/messages/send" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Thanks for watching!"}'

# Pick a winner
curl -X POST "https://api.buzzchat.app/v1/giveaway/pick-winner" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"count": 1}'
```

## Support

Need help with the API?

- **Email**: api-support@buzzchat.app
- **Discord**: [Join our community](https://discord.gg/buzzchat)
- **GitHub Issues**: [Report a bug](https://github.com/JakeLiuMe/buzzchat/issues)

---

*API documentation last updated: January 2025*
