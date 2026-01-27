# fn-3-8cl.4 Add Confirmation Dialogs for Delete Actions

## Description
Delete and reset operations happen immediately without confirmation. Users can accidentally lose data.

### Destructive Actions Needing Confirmation
1. Remove FAQ Rule (line 287 popup.html)
2. Remove Timer Message (line 215)
3. Remove Command (line 344)
4. Remove Template (line 233)
5. Reset Giveaway Entries (line 427)
6. Reset Viewer Leaderboard (line 503)
7. Clear Chat History (line 519)
8. Delete Account (account management)
9. Delete API Key

### Implementation
1. Create reusable confirmation modal component
2. Modal shows: "Are you sure?" + description + Cancel/Confirm buttons
3. Confirm button is red/danger styled
4. Add keyboard support (Escape to cancel, Enter to confirm)
5. Focus trap in modal

### Modal Text Examples
- "Delete FAQ Rule? This cannot be undone."
- "Reset all giveaway entries? 47 entries will be cleared."
- "Delete API key ending in ...x7k9?"

### Files to Modify
- `src/popup/popup.html` - Add confirmation modal HTML
- `src/popup/popup.css` - Confirmation modal styles
- `src/popup/popup.js` - Confirmation logic and handlers

## Acceptance
- [ ] All delete buttons show confirmation dialog
- [ ] All reset buttons show confirmation dialog
- [ ] Modal is accessible (focus trap, keyboard nav)
- [ ] Cancel returns without action
- [ ] Confirm executes deletion
- [ ] Unit tests for confirmation flow

## Done summary
- Added ConfirmDialog component with promise-based show() API
- Replaced 11 browser confirm() calls with styled modal dialogs
- Added keyboard support (Escape, Enter, Tab focus trap)
- Added aria-labelledby, aria-describedby for accessibility

- Users now see consistent, styled confirmation dialogs
- Modal focuses cancel button by default (safer)
- All destructive actions protected by confirmation

- 327 unit tests passing (33 new tests)
- Lint check unchanged
## Evidence
- Commits: 6f5043c
- Tests: npm run test:unit
- PRs: