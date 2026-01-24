# BuzzChat

A Chrome extension that automates chat interactions during live selling shows. Boost engagement with auto-welcome messages, timed promotions, and FAQ auto-replies.

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
├── manifest.json          # Chrome extension manifest
├── assets/
│   └── icons/            # Extension icons
├── src/
│   ├── popup/            # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── scripts/          # Content scripts
│   │   └── content.js    # Main chat automation logic
│   ├── background/       # Service worker
│   │   └── background.js
│   └── styles/           # Injected styles
│       └── content.css
└── README.md
```

### Building for Production
1. Update version in `manifest.json`
2. Generate production icons
3. Zip the entire extension folder
4. Submit to Chrome Web Store

### Testing
1. Load the extension in developer mode
2. Navigate to a live stream
3. Open DevTools (F12) and check the Console for `[BuzzChat]` logs
4. Test each feature individually

## Privacy

- All settings are stored locally in Chrome storage
- No data is sent to external servers
- Chat messages are processed in-browser only
- See our Privacy Policy for more details

## Support

- **GitHub Issues**: [Report an issue](https://github.com/JakeLiuMe/buzzchat/issues)

## License

MIT License - See LICENSE file for details

---

Made with love for the live selling community.
