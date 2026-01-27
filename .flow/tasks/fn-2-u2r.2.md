# fn-2-u2r.2 Add Platform Detection Indicator

## Description
Add a visible indicator in the popup header showing which platform was detected. Users should immediately know if the extension recognizes their current platform.

### Current State
- `src/lib/platforms.js` detects 5 platforms with colors defined
- `content.js` calls `detectPlatform()` and stores in state
- NO visual indicator in popup UI

### Implementation
1. Add platform badge to popup header (next to logo)
2. Query active tab URL to detect platform
3. Display platform name with color-coded badge
4. Show "Not Detected" for unsupported sites
5. Add platform icon (optional - use platform colors)

### Platform Colors (from platforms.js)
- Whatnot: #FF6B35 (orange)
- YouTube: #FF0000 (red)
- eBay: #0064D2 (blue)
- Twitch: #9146FF (purple)
- Kick: #53FC18 (green)

### Files to Modify
- `src/popup/popup.html` - Add badge container in header
- `src/popup/popup.js` - Detect platform, update badge
- `src/popup/popup.css` - Badge styles with platform colors

## Acceptance
- [ ] Badge shows detected platform name
- [ ] Badge uses platform-specific color
- [ ] Badge shows "Not Detected" on unsupported sites
- [ ] Badge updates when tab changes (if popup stays open)
- [ ] Playwright test verifies badge display

## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
