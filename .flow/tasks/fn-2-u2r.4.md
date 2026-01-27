# fn-2-u2r.4 Add AI Error Handling and User Feedback

## Description
Add user-facing feedback when AI operations fail. Currently errors only log to console - users have no idea why AI responses aren't working.

### Current State
- `aiService.js:116-123` throws errors but no UI feedback
- `faq.js:63` catches errors, logs to console only
- No toast/notification system in popup
- No feedback for credit exhaustion

### Error Scenarios to Handle
1. **No API key configured**: Max user enables AI but hasn't set key
2. **Invalid API key**: Key format wrong or revoked
3. **Rate limited**: Too many requests
4. **Credits exhausted**: 0 remaining credits
5. **Network error**: Offline or API unreachable
6. **Timeout**: Response took too long (>5s)

### Implementation
1. Add simple toast notification system to popup
2. Send error messages from content script to popup
3. Show appropriate message for each error type
4. Add credit warning at 50 and 10 remaining
5. Add "Configure API Key" button in error toast

### User-Facing Messages
- No API key: "AI requires an API key. Click to configure."
- Invalid key: "Invalid API key. Please check your settings."
- Rate limited: "AI rate limited. Using template response."
- Credits exhausted: "AI credits exhausted. Resets on [date]."
- Network error: "AI unavailable. Using template response."

### Files to Modify
- `src/popup/popup.html` - Toast container
- `src/popup/popup.js` - Toast display logic
- `src/popup/popup.css` - Toast styles
- `src/scripts/content/features/faq.js` - Send error messages
- `src/lib/aiService.js` - Enhanced error classification

## Acceptance
- [ ] Toast appears for AI errors
- [ ] Appropriate message for each error type
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Credit warning at 50 and 10 remaining
- [ ] User can click to configure API key
- [ ] Playwright test verifies error handling

## Done summary
Added AI error handler with user-friendly messages for 7 error types (NO_API_KEY, INVALID_API_KEY, RATE_LIMITED, NO_CREDITS, NETWORK_ERROR, TIMEOUT, UNKNOWN). Toast shows action buttons for configurable errors. Added credit warnings at 50 and 10 remaining. 22 new unit tests (232 total).
## Evidence
- Commits:
- Tests:
- PRs: