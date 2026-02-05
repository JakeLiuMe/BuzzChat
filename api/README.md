# 🐝 BuzzChat API

**Monetize live commerce automation.**

## Overview

The BuzzChat API lets developers integrate live selling automation into their own apps, dashboards, and workflows.

## Pricing

| Tier | Price | Requests | Features |
|------|-------|----------|----------|
| **Developer** | $29/mo | 10,000/mo | Core API, Webhooks |
| **Startup** | $99/mo | 100,000/mo | + Analytics API, Priority Support |
| **Enterprise** | $499/mo | Unlimited | + Custom Models, SLA, Dedicated Support |

## Use Cases

1. **Custom Dashboards** — Build your own analytics UI
2. **Multi-Platform Tools** — Integrate with inventory systems
3. **Agency Tools** — Manage multiple sellers from one place
4. **AI Integrations** — Connect to your own AI models

## Endpoints

### Authentication
All requests require an API key in the header:
```
Authorization: Bearer bz_live_xxxxxxxxxxxxx
```

### Core Endpoints

#### POST /v1/messages/generate
Generate an AI chat response.

```json
{
  "message": "How much is shipping?",
  "context": {
    "platform": "whatnot",
    "seller_name": "CoolSeller",
    "item": "Vintage Pokemon Cards"
  },
  "tone": "friendly"
}
```

Response:
```json
{
  "response": "Hey! Shipping is $5 flat rate for all cards. Ships within 1-2 business days! 📦",
  "tokens_used": 45,
  "model": "claude-3-haiku"
}
```

#### POST /v1/templates/match
Find the best template for a message.

```json
{
  "message": "do you ship international",
  "templates": [
    {"trigger": "shipping", "response": "We ship worldwide! DM for rates."},
    {"trigger": "returns", "response": "30-day returns on all items."}
  ]
}
```

#### GET /v1/analytics/stream
Get real-time stream analytics.

```json
{
  "stream_id": "abc123",
  "metrics": {
    "messages_per_minute": 25,
    "unique_chatters": 142,
    "sentiment": "positive",
    "top_questions": ["shipping", "price", "size"]
  }
}
```

#### POST /v1/webhooks
Register webhooks for real-time events.

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["message.received", "sale.detected", "question.repeated"]
}
```

## Rate Limits

| Tier | Requests/min | Burst |
|------|-------------|-------|
| Developer | 60 | 100 |
| Startup | 300 | 500 |
| Enterprise | Unlimited | Unlimited |

## SDKs

- JavaScript: `npm install @buzzchat/sdk`
- Python: `pip install buzzchat`
- Ruby: `gem install buzzchat`

## Quick Start

```javascript
import BuzzChat from '@buzzchat/sdk';

const bz = new BuzzChat('bz_live_your_api_key');

// Generate AI response
const reply = await bz.messages.generate({
  message: "What's the price?",
  tone: "hype"
});

console.log(reply.response);
// "Yo! This one's going for just $25! Absolute steal! 🔥"
```

## Coming Soon

- [ ] Streaming responses (SSE)
- [ ] Batch processing
- [ ] Custom model fine-tuning
- [ ] Multi-language support

---

**Get Started:** https://buzzchat.app/api
**Docs:** https://docs.buzzchat.app
**Support:** api@buzzchat.app
