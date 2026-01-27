# fn-1-6ya.1 Platform Detection System

## Description
# fn-1-6ya.1 Platform Detection System

## Goal
Create automatic platform detection that identifies which live selling platform the user is on (Whatnot, YouTube Live, eBay Live, Twitch, Kick) and loads appropriate configuration.

## Implementation

### 1. Platform Registry (`src/lib/platforms.js`)
```javascript
export const PLATFORMS = {
  whatnot: {
    name: 'Whatnot',
    hostPatterns: ['whatnot.com', '*.whatnot.com'],
    icon: 'whatnot-icon.svg',
    features: ['chat', 'giveaway', 'moderation']
  },
  youtube: {
    name: 'YouTube Live',
    hostPatterns: ['youtube.com', '*.youtube.com'],
    pathPatterns: ['/live/', '/watch?v='],
    icon: 'youtube-icon.svg',
    features: ['chat', 'moderation']
  },
  ebay: {
    name: 'eBay Live',
    hostPatterns: ['ebay.com', '*.ebay.com'],
    pathPatterns: ['/live/'],
    icon: 'ebay-icon.svg',
    features: ['chat']
  },
  twitch: {
    name: 'Twitch',
    hostPatterns: ['twitch.tv', '*.twitch.tv'],
    icon: 'twitch-icon.svg',
    features: ['chat', 'moderation', 'commands']
  },
  kick: {
    name: 'Kick',
    hostPatterns: ['kick.com', '*.kick.com'],
    icon: 'kick-icon.svg',
    features: ['chat']
  }
};
```

### 2. Detection Function
```javascript
export function detectPlatform() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  for (const [id, platform] of Object.entries(PLATFORMS)) {
    if (matchesHost(hostname, platform.hostPatterns)) {
      if (platform.pathPatterns) {
        if (platform.pathPatterns.some(p => pathname.includes(p))) {
          return { id, ...platform };
        }
      } else {
        return { id, ...platform };
      }
    }
  }
  return null;
}
```

### 3. Update manifest.json
Add host permissions for all platforms:
```json
"host_permissions": [
  "*://*.whatnot.com/*",
  "*://*.youtube.com/*",
  "*://*.ebay.com/*",
  "*://*.twitch.tv/*",
  "*://*.kick.com/*"
]
```

## Files to Modify
- `src/lib/platforms.js` (NEW)
- `src/scripts/content/init.js` - Use detectPlatform()
- `manifest.json` - Add host permissions

## Acceptance Criteria
- [ ] detectPlatform() returns correct platform on each site
- [ ] Returns null on unsupported sites
- [ ] Extension icon shows platform name when active
- [ ] Content script only initializes on supported platforms
## Acceptance
- [ ] TBD

## Done summary
## What changed
- Created `src/lib/platforms.js` with IIFE-based platform registry supporting Whatnot, YouTube, eBay, Twitch, and Kick
- Updated `manifest.json` with host_permissions and content_scripts matches for all 5 platforms
- Integrated platform detection into `src/scripts/content/init.js` - extension now auto-detects platform on page load
- Added `platform` property to state and `isFeatureEnabled()` helper for feature gating

## Why
- Enable BuzzChat to work across multiple live selling platforms (not just Whatnot)
- Auto-detection means zero configuration for users - just visit a supported site
- Platform-specific feature lists ensure only relevant features are enabled per platform

## Verification
- `npm run lint` - 54 problems (8 errors, 46 warnings) - pre-existing, not from this change
- `npm test` - 242 passed, 1 failed (network test), 6 skipped
- `npm run test:unit` - 116/116 passed (22 new platform detection tests)

## Follow-ups
- Task fn-1-6ya.2: Add platform-specific selectors for each platform's chat UI
## Evidence
- Commits: 498f33713111479a6be24b48c1e9c5af040a4c24
- Tests: npm test, npm run test:unit
- PRs: