# BuzzChat

A Chrome extension that automates chat interactions during live selling shows. Boost engagement with auto-welcome messages, timed promotions, and FAQ auto-replies.

**Platform Support:** Chrome only (Manifest V3). Firefox is not currently supported.

## Features

### Free Tier
- **25 auto-messages per show** (+5 bonus with watermark)
- Auto-welcome messages
- Timer messages
- 2 FAQ auto-reply rules
- Quick templates
- Giveaway tracking
- Basic analytics (7 days)

### Pro Tier ($7.99/month or $59/year)
- **Unlimited auto-messages**
- **Unlimited FAQ rules**
- Full analytics (90-day history)
- CSV export
- Priority support
- Early access to new features

### Business Tier ($19.99/month or $149/year)
- Everything in Pro
- Giveaway management tools
- Advanced analytics dashboard
- Multi-account support (coming soon)
- API access (coming soon)

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "BuzzChat"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Generate icon files (see below)
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the extension folder
7. The extension icon should appear in your toolbar

## Generating Icons

Before loading the extension, you need to generate PNG icons from the SVG:

```bash
# Using ImageMagick
convert -background none assets/icons/icon.svg -resize 16x16 assets/icons/icon16.png
convert -background none assets/icons/icon.svg -resize 48x48 assets/icons/icon48.png
convert -background none assets/icons/icon.svg -resize 128x128 assets/icons/icon128.png

# Or using Inkscape
inkscape -w 16 -h 16 assets/icons/icon.svg -o assets/icons/icon16.png
inkscape -w 48 -h 48 assets/icons/icon.svg -o assets/icons/icon48.png
inkscape -w 128 -h 128 assets/icons/icon.svg -o assets/icons/icon128.png
```

Alternatively, use an online SVG to PNG converter like https://svgtopng.com/

## Usage

### Getting Started
1. Click the extension icon in your Chrome toolbar
2. Toggle "Bot Active" to enable the extension
3. Navigate to a live stream
4. The bot will automatically detect the chat and start working

### Auto-Welcome
- Enable "Auto-Welcome New Viewers" in the Welcome tab
- Customize your welcome message
- Use `{username}` to include the viewer's name
- Set a delay between welcomes to avoid spam

### Timer Messages
- Add promotional messages that repeat every X minutes
- Great for shipping deals, coupon codes, or reminders
- Add multiple timer messages with different intervals

### FAQ Auto-Replies
- Set up trigger keywords (comma-separated)
- When a viewer's message contains a trigger, the auto-reply is sent
- Perfect for common questions about shipping, payment, returns, etc.

### Templates
- Save frequently used messages as templates
- Click "Send Now" to instantly send a template
- Great for shipping info, follow reminders, thank you messages

## Configuration

### Settings
- **Chat Input Selector**: Override auto-detection with a custom CSS selector
- **Sound Notifications**: Enable/disable notification sounds
- **Show Message Count**: Display message counter in the UI

### Export/Import
- Export all your settings and templates to a JSON file
- Import settings on a new device or share with team members

## Troubleshooting

### Bot not detecting chat
- Make sure you're on a live stream page
- Try refreshing the page
- Check if the status indicator shows "Active"
- Try setting a custom chat selector in Settings

### Messages not sending
- Verify the bot is enabled (green status dot)
- Check your message limit (Free tier: 3 per show)
- Make sure the chat input is visible and accessible

### FAQ triggers not working
- Keywords are matched case-insensitively by default
- Make sure the trigger keyword is contained in the message
- Check that FAQ auto-reply is enabled

## Development

### Project Structure
```
buzzchat/
├── manifest.json              # Chrome extension manifest
├── rollup.config.js           # Rollup bundler configuration
├── assets/
│   └── icons/                 # Extension icons
├── src/
│   ├── popup/                 # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup-entry.js     # Main entry point
│   │   ├── popup/             # Modular popup components
│   │   │   ├── core/          # Config, state, storage, utils
│   │   │   ├── ui/            # UI components (tabs, modals, toast)
│   │   │   ├── features/      # Feature modules (timers, FAQ, giveaway)
│   │   │   ├── business/      # Business tier features
│   │   │   └── settings/      # Import/export
│   │   └── styles/            # Modular CSS
│   │       ├── main.css       # Entry point
│   │       ├── variables.css  # CSS custom properties
│   │       ├── components/    # Button, form, card, modal styles
│   │       └── features/      # Feature-specific styles
│   ├── scripts/               # Content scripts
│   │   ├── content-entry.js   # Main entry point
│   │   └── content/           # Modular content script components
│   │       ├── config.js      # Configuration constants
│   │       ├── state.js       # Global state management
│   │       ├── messaging.js   # Message processing
│   │       ├── features/      # Feature modules
│   │       └── ui.js          # Status indicator, notifications
│   ├── background/            # Service worker
│   │   └── background.js
│   └── lib/                   # Shared libraries
│       ├── analytics.js       # Analytics tracking
│       ├── security.js        # Security utilities
│       └── selectors.js       # Selector management
├── tests/                     # Test suites
│   ├── popup.test.js          # Popup UI tests
│   ├── e2e.test.js            # End-to-end tests
│   ├── stress.test.js         # Performance tests
│   └── unit/                  # Unit tests
├── dist/                      # Built output (generated)
└── README.md
```

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers for testing
npx playwright install chromium
```

### Building

```bash
# Development build (with source maps)
npm run build:dev

# Production build (minified)
npm run build

# Watch mode for development
npm run build:watch
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:popup     # Popup UI tests (Playwright)
npm run test:e2e       # End-to-end tests
npm run test:stress    # Stress/performance tests
npm run test:unit      # Unit tests

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### CI/CD

This project uses GitHub Actions for continuous integration:
- Tests run automatically on every push and pull request
- Linting is enforced before tests
- Test reports are uploaded as artifacts on failure

### Building for Production
1. Update version in `manifest.json`
2. Run `npm run build` for production build
3. Zip the `dist/` folder
4. Submit to Chrome Web Store

### Manual Testing
1. Load the extension in developer mode from `dist/` folder
2. Navigate to a live stream
3. Open DevTools (F12) and check the Console for `[BuzzChat]` logs
4. Test each feature individually

## Privacy

- All settings are stored locally in Chrome sync storage
- Analytics data is stored locally and never transmitted
- Chat messages are processed in-browser only
- Payment processing is handled securely by ExtensionPay
- See our full [Privacy Policy](docs/PRIVACY_POLICY.md) for details

### Data Collection Disclosure
BuzzChat collects:
- Anonymous usage analytics (message counts, feature usage)
- Your settings and preferences (stored locally)
- Payment/subscription info (via ExtensionPay for Pro/Business users)

BuzzChat does NOT collect:
- Chat message content
- Viewer usernames or information
- Browsing history

## Requirements

- **Chrome 100+** (or Chromium-based browsers like Edge, Brave)
- Manifest V3 compatible browser
- JavaScript enabled

## Automated Maintenance

This product is designed to run forever with minimal maintenance. The following automation is in place:

### AI-Powered Bug Fixes
- Users report bugs using the structured issue template
- **Maintainer** comments `/autofix` to trigger AI analysis
- AI analyzes the issue and proposes a fix
- Creates a **draft PR** that requires human review
- All 220 tests must pass before PR is created

**Safety Features:**
- Only maintainers can trigger `/autofix` (not random users)
- Never auto-merges - always requires human review
- Rate limited to 10 attempts per day
- AI instructed to reject suspicious requests
- All PRs clearly labeled as AI-generated

### Automatic Dependency Updates
- Dependencies are updated weekly via Dependabot
- Security vulnerabilities are flagged automatically
- Patch updates can be auto-merged after tests pass

### Stale Issue Management
- Issues without activity for 60 days are marked stale
- Stale issues are closed after 14 additional days
- Add "keep-open" label to prevent auto-closure

### Required Secrets (for maintainers)
- `ANTHROPIC_API_KEY` - Claude API key for AI auto-fix (~$0.10 per attempt)

## Support

- **GitHub Issues**: [Report a bug](../../issues/new?template=bug_report.yml)
- **Feature Requests**: [Suggest a feature](../../issues/new?template=feature_request.yml)

*Note: This product is in maintenance mode. Bug fixes are automated, but new features are not planned.*

## License

MIT License - See LICENSE file for details

---

Made with love for the live selling community.
