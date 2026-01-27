# fn-3-8cl.1 Fix Responsive Layout

## Description
The popup currently has a hard-coded `width: 380px` which doesn't work well on different screen sizes or when users resize the popup window.

### Current Issues
- `popup.css` line 140: `body { width: 380px; }` - fixed width
- `popup.css` line 141-142: `min-height: 500px; max-height: 600px;` - fixed heights
- No media queries for smaller screens
- Tab overflow at narrow widths

### Implementation
1. Replace fixed width with min/max width range (320px - 500px)
2. Use CSS `clamp()` for responsive sizing
3. Add media query for narrow popups
4. Fix tab overflow with proper scroll indicators
5. Test header layout at different widths

### Files to Modify
- `src/popup/popup.css` - Layout changes

## Acceptance
- [ ] Popup works at 320px width (mobile-like)
- [ ] Popup works at 500px width (wide)
- [ ] Tabs scroll gracefully at narrow widths
- [ ] Header doesn't break with platform badge
- [ ] All existing tests pass

## Done summary
- Changed body width from fixed 380px to responsive clamp(320px, 100vw, 500px)
- Added scrollbar styling for tabs to enable smooth horizontal scrolling
- Added @media query for narrow widths (<360px) with compact spacing

- Improves usability on different screen sizes
- Chrome extension popups can vary in size based on user settings

- 263 unit tests passing
- Lint check shows no new issues (only pre-existing warnings)
## Evidence
- Commits: 6398c4849a98beb2ba26ad086c8183138924ee52
- Tests: npm run test:unit
- PRs: