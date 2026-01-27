# fn-3-8cl.6 Add Empty States and Accessibility Polish

## Description
Lists don't have proper empty states, and various accessibility issues need fixing.

### Empty States Needed
1. Timer messages list (when no timers)
2. FAQ rules list (when no rules)
3. Commands list (when no commands)
4. Templates list (when no templates)
5. Giveaway entries (already has basic one, needs polish)
6. Viewer leaderboard (already has basic one, needs polish)

### Empty State Design
```
[Icon]
No timer messages yet
Add your first recurring message to engage viewers.
[+ Add Timer Message] button
```

### Accessibility Fixes
1. Add missing `aria-label` to account selector
2. Fix `&times;` in close buttons (use "Close" text)
3. Add `aria-invalid` styling for form errors (Task 3 related)
4. Fix toast `aria-live` to be "assertive" for errors
5. Add `aria-busy` during loading states
6. Improve color contrast on `.tier-usage` and `.member-since`

### Button Hierarchy Fixes
- Make "Add X" buttons use `btn-primary` (they're the main action)
- Keep "Remove" buttons as `btn-danger btn-sm`
- Consistent sizing across all action buttons

### Files to Modify
- `src/popup/popup.html` - Empty state markup, ARIA attributes
- `src/popup/popup.css` - Empty state styles, contrast fixes
- `src/popup/popup.js` - Show/hide empty states based on list length

## Acceptance
- [ ] All lists show helpful empty state
- [ ] Empty states have icon + text + action button
- [ ] All ARIA labels present
- [ ] Color contrast passes WCAG AA (4.5:1)
- [ ] Button hierarchy is consistent
- [ ] Unit tests for empty state display

## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
