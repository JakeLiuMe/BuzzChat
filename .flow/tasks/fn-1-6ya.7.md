# fn-1-6ya.7 Production Build and Testing

## Description
# fn-1-6ya.7 Production Build and Testing

## Goal
Final verification, production build, and preparation for Chrome Web Store submission.

## Pre-Submission Checklist

### 1. Code Quality
- [ ] `npm run lint` passes with 0 errors
- [ ] All console.log statements removed/disabled in production
- [ ] No hardcoded API keys or secrets
- [ ] Copyright headers on all source files

### 2. Testing
- [ ] `npm test` - All 227+ Playwright tests pass
- [ ] `npm run test:unit` - All unit tests pass
- [ ] `npm run test:stress` - Stress tests pass
- [ ] Manual testing on each platform:
  - [ ] Whatnot
  - [ ] YouTube Live
  - [ ] eBay Live
  - [ ] Twitch
  - [ ] Kick

### 3. Production Build
```bash
# Clean build
rm -rf dist/

# Production build with minification
npm run build:prod

# Create submission package
npm run zip
```

### 4. Manifest Verification
```json
{
  "manifest_version": 3,
  "name": "BuzzChat - Live Selling Chat Automation",
  "version": "2.0.0",
  "description": "Automate chat for Whatnot, YouTube, eBay, Twitch & more",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "*://*.whatnot.com/*",
    "*://*.youtube.com/*",
    "*://*.ebay.com/*",
    "*://*.twitch.tv/*",
    "*://*.kick.com/*"
  ]
}
```

### 5. Chrome Web Store Assets
- [ ] Icon 128x128 PNG
- [ ] Screenshots (1280x800 or 640x400):
  - Whatnot integration
  - YouTube integration
  - Settings popup
  - Quick reply bar
- [ ] Promotional tile 440x280
- [ ] Description (max 132 chars for short, full for detailed)
- [ ] Privacy policy URL

### 6. Privacy Policy Requirements
Document data handling:
- Chat messages: processed locally, not stored
- Settings: stored in Chrome sync storage
- API key (Max tier): stored locally, encrypted
- Analytics: anonymous usage counts only

### 7. Store Listing Copy
```
Short Description (132 chars):
"Automate live selling chat on Whatnot, YouTube, eBay & Twitch. Welcome messages, FAQ replies, giveaways & AI-powered responses."

Detailed Description:
🎯 One Extension for All Platforms
BuzzChat works everywhere you sell live - Whatnot, YouTube, eBay, Twitch, and Kick.

✨ Key Features:
• Auto-welcome new viewers
• FAQ auto-replies with keyword triggers
• Timed messages for promotions
• Quick reply buttons for instant chat
• Giveaway management with random winner selection
• Chat moderation with blocked words
• AI-powered smart responses (Max tier)

💰 Pricing:
• Free: 50 messages/show, 3 FAQ rules
• Pro ($9.99/mo): 250 messages, unlimited rules
• Max ($24.99/mo): Unlimited + AI responses

🔒 Privacy First:
All processing happens locally in your browser. We never see your chat messages or store personal data.
```

## Build Verification Steps

### 1. Load Unpacked Extension
```
1. Open chrome://extensions/
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select dist/ folder
5. Verify no errors in console
```

### 2. Functional Testing
```
For each platform:
1. Navigate to live stream
2. Verify extension icon shows platform name
3. Open popup, enable master toggle
4. Send test chat message
5. Verify message appears in chat
6. Test FAQ auto-reply trigger
7. Test quick reply buttons
```

### 3. Performance Checks
- [ ] Popup opens in <200ms
- [ ] Chat message processing <50ms
- [ ] No memory leaks after 1 hour
- [ ] CPU usage <5% when idle

## Files to Verify
- `manifest.json` - Version, permissions, hosts
- `package.json` - Dependencies, build scripts
- `rollup.config.js` - Production minification
- All source files - Copyright headers

## Final Submission
```bash
# 1. Bump version
npm version 2.0.0

# 2. Production build
npm run build:prod

# 3. Create zip
npm run zip

# 4. Upload to Chrome Web Store
# https://chrome.google.com/webstore/devconsole
```

## Acceptance Criteria
- [ ] All automated tests pass
- [ ] Manual testing on all 5 platforms complete
- [ ] Production build creates valid extension
- [ ] No console errors in normal operation
- [ ] Chrome Web Store assets prepared
- [ ] Privacy policy published
- [ ] Store listing copy finalized
## Acceptance
- [ ] TBD

## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
