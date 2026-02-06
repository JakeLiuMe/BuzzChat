# AI Features Guide

BuzzChat uses AI to understand your buyers better. Here's how it works.

## Overview

| Feature | Free | Pro | Seller+ | Team |
|---------|:----:|:---:|:-------:|:----:|
| Keyword FAQ | ✅ | ✅ | ✅ | ✅ |
| AI Intent Detection | ❌ | ✅ | ✅ | ✅ |
| Sentiment Analysis | ❌ | ✅ | ✅ | ✅ |
| Chat Translation | ❌ | ❌ | ✅ | ✅ |
| BYOK (Unlimited) | ❌ | ❌ | ❌ | ✅ |

## AI Intent Detection

### What It Does

Instead of matching exact keywords, AI understands what buyers *mean*.

**Example:**
```
Buyer: "yo is that still up for grabs?"
```

- **Keyword matching**: ❌ No match
- **AI detection**: ✅ AVAILABILITY intent detected

### Supported Intents

| Intent | Examples | Suggested Action |
|--------|----------|------------------|
| `PURCHASE` | "SOLD", "mine", "I'll take it" | Mark item, update inventory |
| `PRICE_INQUIRY` | "how much", "what's the tag" | Show price or ask which item |
| `AVAILABILITY` | "still have?", "in stock?" | Check inventory, offer alternatives |
| `SHIPPING` | "ship to UK?", "delivery time?" | Share shipping policy |
| `QUESTION` | General questions | Queue for manual response |
| `GREETING` | "hey!", "what's up" | Auto-welcome response |
| `COMPLAINT` | Negative sentiment | Flag for attention |

### Setup

1. Go to **Settings** → **AI Features**
2. Toggle **Intent Detection** ON
3. Adjust confidence threshold (default: 80%)

## Sentiment Analysis

### What It Does

Detects the emotional tone of messages so you can prioritize responses.

| Sentiment | Example | Action |
|-----------|---------|--------|
| 😊 Positive | "These are fire! 🔥" | Engage, upsell |
| 😐 Neutral | "What size is this?" | Normal response |
| 😤 Negative | "This is taking forever" | Prioritize, defuse |

### How to Use

- Negative sentiment messages are highlighted in the dashboard
- VIP + negative = high priority alert
- Use sentiment trends to improve your stream

## Chat Translation (Seller+)

### What It Does

Auto-detects buyer language and translates to English. Optionally translates your responses back.

**Example:**
```
Buyer (Spanish): "¿Cuánto cuesta el azul?"
BuzzChat shows: 🌍 "How much does the blue one cost?" [Spanish]
```

### Supported Languages

50+ languages including:
- Spanish, French, German, Italian, Portuguese
- Chinese, Japanese, Korean
- Arabic, Hindi, Russian
- And many more

### Setup

1. Go to **Settings** → **Translation**
2. Toggle **Auto-translate Chat** ON
3. Set your preferred language (for response translation)
4. Optional: Show original message alongside translation

### Smart Detection

BuzzChat skips translation for:
- Emojis only 😂🔥
- Prices ($25, €50)
- @mentions
- Common chat shortcuts (lol, omg, ty)

## AI Cost Control

### How We Keep It Cheap

1. **Local pattern matching first** — 80% of requests handled without AI
2. **Aggressive caching** — Same question = cached answer (7-day TTL)
3. **Claude Haiku** — Fast, cheap model ($0.25/1M tokens)
4. **Smart batching** — Multiple requests combined

### Rate Limits

| Tier | AI Requests/Day | AI Requests/Min |
|------|-----------------|-----------------|
| Free | 50 | 5 |
| Pro | 500 | 15 |
| Seller+ | 1,000 | 30 |
| Team | Unlimited* | 60 |

*Team tier with BYOK has no daily limit.

### Bring Your Own Key (BYOK)

Team tier users can add their own Anthropic API key:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Go to **Settings** → **AI Features** → **API Key**
3. Enter your `sk-ant-...` key
4. Enjoy unlimited AI requests

Your key is encrypted and stored locally. We never see it.

## Privacy

- AI processing happens via Anthropic's API
- We send only the message text (no usernames, no metadata)
- No messages are stored on our servers
- API responses are cached locally on your device
- You can disable AI features anytime

## Troubleshooting

**AI not responding?**
- Check if you've hit rate limits (see dashboard)
- Verify API key is valid (Team tier)
- Ensure intent detection is enabled

**Wrong intent detected?**
- Lower the confidence threshold
- Add specific FAQ rules for common cases
- Report false positives to help us improve

**Translation not working?**
- Check if message is long enough (short = skipped)
- Verify translation is enabled in settings
- Some slang may not translate well

---

[← Back to Getting Started](GETTING_STARTED.md)
