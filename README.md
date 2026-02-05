# 🐝 BuzzChat — Live Selling Chat Automation

<p align="center">
  <img src="assets/icons/icon128.png" alt="BuzzChat Logo" width="128">
</p>

<p align="center">
  <strong>Make your live streams buzz with engagement!</strong>
</p>

<p align="center">
  <a href="https://github.com/JakeLiuMe/buzzchat/actions"><img src="https://img.shields.io/github/actions/workflow/status/JakeLiuMe/buzzchat/ci.yml?branch=main&style=for-the-badge" alt="CI Status"></a>
  <a href="https://github.com/JakeLiuMe/buzzchat/releases"><img src="https://img.shields.io/github/v/release/JakeLiuMe/buzzchat?style=for-the-badge" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/JakeLiuMe/buzzchat/issues"><img src="https://img.shields.io/github/issues/JakeLiuMe/buzzchat?style=for-the-badge" alt="Issues"></a>
</p>

**BuzzChat** is a browser extension that automates chat interactions during live selling shows. Welcome viewers instantly, answer FAQs automatically, run giveaways, and keep engagement high — all while you focus on selling.

Works on **Whatnot**, **YouTube Live**, **eBay Live**, **Twitch**, and **Kick**.

[Installation](#-quick-start) · [Features](#-features) · [Documentation](docs/) · [Issues](https://github.com/JakeLiuMe/buzzchat/issues) · [Privacy](docs/PRIVACY_POLICY.md)

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/JakeLiuMe/buzzchat.git
cd buzzchat

# Install dependencies & generate icons
npm install
npm run icons

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → select this folder
```

That's it! Navigate to a live stream and click the 🐝 icon to start.

---

## ✨ Features

### 🎯 Core Features (Free)
| Feature | Description |
|---------|-------------|
| 👋 **Auto-Welcome** | Greet new viewers with personalized messages |
| ⏰ **Timer Messages** | Schedule recurring announcements (deals, reminders) |
| ❓ **FAQ Auto-Reply** | Automatically respond to common questions |
| 💬 **Quick Templates** | One-click message templates |
| 🎁 **Giveaway Tracking** | Track entries and pick random winners |
| 📊 **Basic Analytics** | 7-day message history |

### 🚀 Pro Features ($7.99/mo)
- ♾️ Unlimited auto-messages
- ♾️ Unlimited FAQ rules
- 📈 90-day analytics history
- 📥 CSV export
- ⚡ Priority support

### 🏢 Business Features ($19.99/mo)
- Everything in Pro
- 🎰 Advanced giveaway tools
- 📊 Full analytics dashboard
- 🔌 API access (coming soon)

---

## 🖼️ Screenshots

<p align="center">
  <em>Screenshots coming soon!</em>
</p>

---

## 💡 Why BuzzChat?

| Pain Point | BuzzChat Solution |
|------------|-------------------|
| 😓 Can't greet everyone manually | Auto-welcome handles it |
| 🔁 Repeating the same answers | FAQ auto-replies save you |
| ⏰ Forgetting to announce deals | Timer messages never forget |
| 📝 Typing the same messages | Templates = one click |
| 🎁 Tracking giveaway entries | Built-in entry tracking |

**Focus on selling. Let BuzzChat handle the chat.**

---

## 📦 Installation

### Chrome Web Store (Recommended)
*Coming soon!*

### Manual Installation

1. **Download** — Clone or download this repo
2. **Install** — Run `npm install && npm run icons`
3. **Load** — Open `chrome://extensions`, enable Developer mode, click "Load unpacked"
4. **Done** — The 🐝 icon appears in your toolbar

---

## 🎮 Usage

### Getting Started
1. Click the 🐝 icon in Chrome
2. Toggle **Bot Active** to enable
3. Go to a live stream (Whatnot, YouTube, etc.)
4. Watch BuzzChat work its magic!

### Configuration Tips

**Auto-Welcome Messages:**
```
Hey {username}! Welcome to the stream! 🎉
```

**FAQ Triggers:**
- Keywords: `shipping, ship, deliver`
- Reply: `We ship within 24 hours! Free shipping over $50 🚚`

**Timer Messages:**
- Message: `🔥 Use code LIVE10 for 10% off!`
- Interval: Every 5 minutes

---

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Chrome or Chromium browser

### Setup
```bash
npm install
npm run icons
npx playwright install chromium
```

### Commands
| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Auto-fix issues |
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests only |

### Project Structure
```
buzzchat/
├── src/
│   ├── popup/          # Extension popup UI
│   ├── scripts/        # Content scripts
│   ├── background/     # Service worker
│   └── lib/            # Shared utilities
├── tests/              # Test suites
├── assets/             # Icons & images
└── docs/               # Documentation
```

---

## 🔒 Privacy

Your data stays with you:
- ✅ All settings stored locally
- ✅ Chat processed in-browser only
- ✅ No message content collected
- ❌ No tracking or telemetry

See our full [Privacy Policy](docs/PRIVACY_POLICY.md).

---

## 🤝 Contributing

We love contributions! Here's how to help:

- 🐛 [Report a Bug](https://github.com/JakeLiuMe/buzzchat/issues/new?template=bug_report.yml)
- 💡 [Request a Feature](https://github.com/JakeLiuMe/buzzchat/issues/new?template=feature_request.yml)
- 📖 Improve documentation
- 🔧 Submit a PR

---

## 📋 Requirements

- **Chrome 100+** (or Edge, Brave, Arc)
- Manifest V3 compatible browser
- JavaScript enabled

---

## 📄 License

[MIT License](LICENSE) — Use it, modify it, share it.

---

<p align="center">
  Made with 🐝 for the live selling community
</p>

<p align="center">
  <sub>BuzzChat is not affiliated with Whatnot, YouTube, eBay, Twitch, or Kick. All trademarks belong to their respective owners.</sub>
</p>
