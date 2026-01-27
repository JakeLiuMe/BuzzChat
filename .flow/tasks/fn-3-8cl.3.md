# fn-3-8cl.3 Add Form Validation Feedback

## Description
Form inputs don't show visual feedback when validation fails. Users don't see error messages or know which field is wrong.

### Current Issues
- No error messages displayed below fields
- No red border on invalid inputs
- No `aria-invalid="true"` when validation fails
- Placeholder text used as labels (loses context on focus)
- `maxlength` attributes present but no character counter

### Implementation
1. Add `.error` class styles (red border, error message)
2. Add error message elements below inputs
3. Add `aria-invalid` attribute toggling
4. Add character counter component for maxlength fields
5. Show validation errors on blur and submit

### Error Message Examples
- "Welcome message is required"
- "Trigger cannot be empty"
- "Response must be at least 5 characters"
- "Maximum 500 characters (450 remaining)"

### Files to Modify
- `src/popup/popup.css` - Error state styles
- `src/popup/popup.js` - Validation feedback logic
- `src/popup/popup.html` - Error message containers

## Acceptance
- [ ] Invalid inputs have red border
- [ ] Error messages appear below invalid fields
- [ ] `aria-invalid` set for screen readers
- [ ] Character counter shows remaining chars
- [ ] Errors clear when user fixes input
- [ ] Unit tests for validation states

## Done summary
- Added CSS error states: .has-error class with red border, .form-error message element
- Added FormValidator helper with showError, clearError, validateRequired, validateMinLength
- Added character counter component with warning/error states
- Added dark mode support for all error state styles

- Visual feedback helps users understand validation issues
- aria-invalid attribute improves accessibility for screen readers

- 294 unit tests passing (21 new validation tests)
- Lint check unchanged
## Evidence
- Commits: 7c4db70
- Tests: npm run test:unit
- PRs: