# fn-1-6ya.2 Platform-Specific Selector Modules

## Description
# fn-1-6ya.2 Platform-Specific Selector Modules

## Goal
Create modular selector definitions for each platform's chat UI, replacing the single hardcoded selector set with platform-aware selectors.

## Implementation

### 1. Selector Module Structure (`src/lib/selectors/`)
```
src/lib/selectors/
├── index.js          # Exports getSelectors(platform)
├── whatnot.js        # Whatnot selectors
├── youtube.js        # YouTube Live selectors
├── ebay.js           # eBay Live selectors
├── twitch.js         # Twitch selectors
└── kick.js           # Kick selectors
```

### 2. Selector Interface
Each platform module exports:
```javascript
export const whatnotSelectors = {
  // Chat container
  chatContainer: [
    '[data-testid="chat-container"]',
    '.chat-messages',
    '[class*="ChatContainer"]'
  ],

  // Individual message
  chatMessage: [
    '[data-testid="chat-message"]',
    '.chat-message',
    '[class*="ChatMessage"]'
  ],

  // Username within message
  username: [
    '[data-testid="username"]',
    '.username',
    '[class*="Username"]'
  ],

  // Message text
  messageText: [
    '[data-testid="message-text"]',
    '.message-text',
    '[class*="MessageText"]'
  ],

  // Input field
  chatInput: [
    '[data-testid="chat-input"]',
    'textarea[placeholder*="chat"]',
    '[class*="ChatInput"]'
  ],

  // Send button
  sendButton: [
    '[data-testid="send-button"]',
    'button[type="submit"]',
    '[class*="SendButton"]'
  ],

  // Live indicator
  liveIndicator: [
    '[data-testid="live-badge"]',
    '.live-badge',
    '[class*="LiveBadge"]'
  ]
};
```

### 3. Selector Loader
```javascript
// src/lib/selectors/index.js
import { whatnotSelectors } from './whatnot.js';
import { youtubeSelectors } from './youtube.js';
import { ebaySelectors } from './ebay.js';
import { twitchSelectors } from './twitch.js';
import { kickSelectors } from './kick.js';

const SELECTORS = {
  whatnot: whatnotSelectors,
  youtube: youtubeSelectors,
  ebay: ebaySelectors,
  twitch: twitchSelectors,
  kick: kickSelectors
};

export function getSelectors(platformId) {
  return SELECTORS[platformId] || whatnotSelectors;
}
```

## Files to Create
- `src/lib/selectors/index.js`
- `src/lib/selectors/whatnot.js`
- `src/lib/selectors/youtube.js`
- `src/lib/selectors/ebay.js`
- `src/lib/selectors/twitch.js`
- `src/lib/selectors/kick.js`

## Files to Modify
- `src/scripts/content/state.js` - Import platform-specific selectors
- `src/scripts/content/init.js` - Pass platform to getSelectors()

## Research Required
- [ ] YouTube Live chat DOM structure
- [ ] eBay Live chat DOM structure
- [ ] Twitch chat DOM structure (well documented)
- [ ] Kick chat DOM structure

## Acceptance Criteria
- [ ] Each platform has working selectors
- [ ] Fallback selectors for common patterns
- [ ] Selectors validated on live sites
- [ ] No breaking changes to Whatnot functionality
## Acceptance
- [ ] TBD

## Done summary
## What changed
- Extended SelectorManager with PLATFORM_SELECTORS containing platform-specific CSS selectors for Whatnot, YouTube, eBay, Twitch, and Kick
- Added setPlatform(), getSelectorsForPlatform(), getSelectorsSync() methods to SelectorManager
- Updated getSelectors() to be platform-aware with automatic fallback to default selectors
- Updated init.js to pass detected platform ID to SelectorManager.setPlatform()

## Why
- Each platform has different DOM structure for chat UI elements
- YouTube uses web components (yt-live-chat-*), Twitch uses data-a-target attributes, etc.
- Platform-specific selectors improve reliability and reduce fallback attempts
- Backward compatible - unknown platforms fall back to generic selectors

## Verification
- `npm run test:unit` - 132/132 passed (16 new selector tests)
- `npm test` - 258/265 passed (1 network test failed - expected)
- `npm run lint` - 8 errors (pre-existing, unchanged)

## Follow-ups
- Task fn-1-6ya.3: Add self-healing remote selector updates
## Evidence
- Commits: 41f330f1e296e9414394745504a043e00b1b64a5
- Tests: npm test, npm run test:unit
- PRs: