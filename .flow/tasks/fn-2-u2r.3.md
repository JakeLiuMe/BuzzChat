# fn-2-u2r.3 Fix Tier Naming Consistency

## Description
Standardize tier naming throughout the codebase. Currently inconsistent:
- Code uses 'max' tier name
- UI shows 'business' in some places
- ExtensionPay may use different names

### Current State
- `background.js:34` treats 'business' as legacy alias for 'pro'
- `aiService.js:3` checks for 'max' tier
- `faq.js:29,96` checks for 'max' tier
- `popup.html:969` shows "Business" text
- Upgrade modal references inconsistent tier names

### Decision
Standardize on **"Max"** tier name because:
- It's the premium tier with AI features
- "Max" communicates "maximum features"
- Code already uses 'max' internally

### Implementation
1. Update all UI text from "Business" to "Max"
2. Update upgrade modal tier descriptions
3. Keep 'business' as legacy alias in background.js for existing users
4. Add migration note in comments

### Files to Modify
- `src/popup/popup.html` - Update tier text
- `src/popup/popup.js` - Update tier display logic
- `src/background/background.js` - Add comment about legacy alias

## Acceptance
- [ ] All UI shows "Max" not "Business"
- [ ] Upgrade modal shows correct tier names
- [ ] Legacy 'business' users still work (backward compat)
- [ ] No broken references to old tier names
- [ ] Search codebase confirms no stray "business" tier references

## Done summary
Updated user-visible tier naming: Business → Max in extensionpay.js display name, theme.js tier labels/badges. Added 18 tier naming unit tests. 'business' kept as legacy tier ID for backward compatibility.
## Evidence
- Commits:
- Tests:
- PRs: