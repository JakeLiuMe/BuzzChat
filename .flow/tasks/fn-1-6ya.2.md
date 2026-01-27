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
TBD

## Evidence
- Commits:
- Tests:
- PRs:
