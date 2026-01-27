# fn-3-8cl.2 Add Loading States to Async Buttons

## Description
Buttons that trigger async operations (API calls, storage) don't show loading feedback. Users don't know if their click registered.

### Buttons Missing Loading States
1. "Start Free Trial" buttons (lines 937, 983, 1001 in popup.html)
2. "Create API Key" button (line 824)
3. "Confirm Create Account" button (line 1098)
4. "Spin the Wheel!" giveaway button (line 446)
5. "Export Analytics" button
6. "Import/Export Settings" buttons

### Implementation
1. Use existing `Loading` helper class from toast.js
2. Add `.loading` class application to all async button handlers
3. Add spinner animation inside buttons during loading
4. Disable button during operation to prevent double-clicks
5. Show success/error toast after completion

### Files to Modify
- `src/popup/popup.js` - Add Loading.show/hide calls
- `src/popup/popup.css` - Ensure loading spinner styles work

## Acceptance
- [ ] Subscribe buttons show spinner while processing
- [ ] Create API Key shows loading state
- [ ] Giveaway spin shows spinning animation
- [ ] Export/Import shows loading feedback
- [ ] All buttons disabled during loading
- [ ] Unit tests for loading state behavior

## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
