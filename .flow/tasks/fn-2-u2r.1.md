# fn-2-u2r.1 Add AI Toggle to FAQ Rules UI

## Description
Add a per-rule toggle for AI-powered responses in the FAQ configuration. The toggle should:
- Only appear for Max tier users
- Set `rule.useAI = true/false` in settings
- Show AI icon/indicator when enabled
- Include tooltip explaining AI feature

### Current State
- `src/scripts/content/features/faq.js:80` checks `rule.useAI === true`
- `src/scripts/content/features/faq.js:29,96` gates AI to 'max' tier
- NO UI toggle exists in popup.html or popup.js

### Implementation
1. Add toggle to FAQ rule template in `popup.html`
2. Add toggle handler in `popup.js` FAQ section
3. Show/hide toggle based on tier (Max only)
4. Add CSS styling for AI toggle

### Files to Modify
- `src/popup/popup.html` - Add toggle to FAQ rule template
- `src/popup/popup.js` - Add toggle logic
- `src/popup/popup.css` - Add toggle styles

## Acceptance
- [ ] AI toggle appears in FAQ rules for Max tier users
- [ ] Toggle hidden for Free/Pro tier users
- [ ] Toggle state persists to settings
- [ ] Tooltip explains "Enable AI-powered responses"
- [ ] Unit test verifies toggle behavior

## Done summary
## What Changed
- Added AI toggle checkbox to FAQ rule template in popup.html
- Added tier-gating logic in popup.js to show toggle only for Max tier users
- Added CSS styling for the AI toggle with gradient background
- Added 15 unit tests covering toggle visibility, tier gating, and state management

## Why
- Max tier users need UI to enable AI-powered responses for FAQ rules
- Code already supported `rule.useAI` but no UI existed to set it

## Verification
- npm run test:unit: 175 tests passing (15 new AI toggle tests)
- Manual inspection of popup.html template structure

## Follow-ups
- Task fn-2-u2r.4 will add error feedback when AI fails
## Evidence
- Commits: 33ae78c24727de86c0ab0af50192e0642d1f4b07
- Tests: npm run test:unit - 175 passed
- PRs: