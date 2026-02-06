# FAQ Auto-Reply Setup Guide

Set up smart auto-replies to handle common questions while you focus on selling.

## Basic FAQ Rules

### Creating a Rule

1. Open BuzzChat → **FAQ** tab
2. Click **+ Add Rule**
3. Fill in:
   - **Trigger keywords**: Words that trigger this reply (comma-separated)
   - **Reply message**: What BuzzChat sends
   - **Match mode**: Any word or All words
4. Click **Save**

### Example Rules

| Trigger Keywords | Reply |
|-----------------|-------|
| `shipping, ship, deliver` | We ship within 24 hours! Free shipping over $50 🚚 |
| `size, sizing, fit` | Check the size chart in the listing! DM me if you need help 📏 |
| `payment, pay, checkout` | We accept all major cards! Payment due within 24h of claim ✅ |
| `return, refund` | 7-day returns on unworn items. See our policy in bio 📋 |
| `bundle, discount` | Bundle 3+ items for 15% off! Just ask 🎉 |
| `available, stock` | Check what's available in the pinned inventory list! 📦 |

## Advanced: AI Intent Detection (Pro)

With Pro tier, BuzzChat uses AI to understand *intent*, not just keywords.

### How It Works

**Without AI (Free):**
- Buyer: "how much for the red one?"
- ❌ No match (no keyword)

**With AI (Pro):**
- Buyer: "how much for the red one?"
- ✅ Detected: PRICE_INQUIRY intent
- Reply: "Which item are you asking about? Check the pinned list for prices! 💰"

### AI Intent Categories

| Intent | What It Detects |
|--------|-----------------|
| `PRICE_INQUIRY` | "how much", "what's the price", "cost" |
| `AVAILABILITY` | "is this available", "still have", "in stock" |
| `SHIPPING` | "do you ship to", "shipping cost", "delivery" |
| `SIZE_FIT` | "what size", "does it fit", "measurements" |
| `PURCHASE` | "SOLD", "I'll take it", "mine", "claiming" |
| `GREETING` | "hey", "hi", "hello", "what's up" |

### Enable AI Intent Detection

1. Upgrade to Pro tier
2. Go to **Settings** → **AI Features**
3. Toggle **Intent Detection** ON
4. (Optional) Add your Anthropic API key for higher limits

## Template Packs

Don't want to write FAQs from scratch? Use our pre-made packs:

1. Go to **FAQ** tab
2. Click **📦 Load Template Pack**
3. Choose a pack:
   - 👟 Sneaker Seller
   - 👗 Fashion & Clothing
   - 📱 Electronics
   - 🎴 Collectibles & Vintage
   - 💄 Beauty & Cosmetics
   - ⚾ Sports Memorabilia
   - 🛒 General Seller
4. Click **Import**

Packs merge with your existing rules (no duplicates).

## Pro Tips

1. **Be specific** — "shipping" catches more than "ship to canada"
2. **Use emojis** — They catch attention in busy chats
3. **Keep replies short** — Under 200 characters is best
4. **Test your rules** — Use Demo Mode to simulate messages
5. **Review analytics** — See which FAQs trigger most often

## Troubleshooting

**FAQ not triggering?**
- Check if Bot is Active
- Verify keywords match (case-insensitive)
- Check match mode (Any vs All)
- Make sure you haven't hit tier limits

**Too many false positives?**
- Use more specific keywords
- Switch to "All words" match mode
- Enable AI intent for smarter matching

---

[← Back to Getting Started](GETTING_STARTED.md)
