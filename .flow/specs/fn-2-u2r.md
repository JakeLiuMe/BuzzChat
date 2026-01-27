# fn-2-u2r Production Readiness Audit: World Class 10/10

## Overview
Comprehensive QA audit to make BuzzChat Chrome extension production-ready. Focus on smart platform detection, AI chat toggle, user settings freedom, and achieving 10/10 quality grade.

## Scope
1. Add missing AI Toggle UI to FAQ rules (Max tier only)
2. Add platform detection indicator in popup
3. Fix tier naming consistency (max vs business)
4. Add AI error handling with user feedback
5. Add comprehensive Playwright tests
6. Final polish until 10/10 grade achieved

## Approach
Systematic task-by-task implementation with testing at each step. Run grading rubric after each task to track progress toward 10/10.

## Quick commands
- `npm run lint` - ESLint check
- `npm run build:prod` - Production build
- `npm test` - All Playwright tests
- `npm run test:unit` - Unit tests only

## Acceptance
- [ ] AI toggle visible in FAQ rules for Max tier users
- [ ] Platform indicator badge shows in popup header
- [ ] All tier references use "Max" (not "Business")
- [ ] AI errors show toast notifications to user
- [ ] All new features have Playwright test coverage
- [ ] Final grade: 10/10 across all categories

## Current Grade: 7/10

| Category | Weight | Current | Target |
|----------|--------|---------|--------|
| Platform Detection | 15% | 8/10 | 10/10 |
| AI Integration | 20% | 6/10 | 10/10 |
| User Settings Freedom | 20% | 7/10 | 10/10 |
| Error Handling/UX | 15% | 5/10 | 10/10 |
| Test Coverage | 15% | 8/10 | 10/10 |
| Polish/Consistency | 15% | 6/10 | 10/10 |

## Critical Gaps Found
1. **AI Toggle Missing**: `faq.js:80` supports `rule.useAI` but no UI exists
2. **Platform Indicator Missing**: Detection works but no visible feedback
3. **Tier Naming**: Code uses 'max', UI shows 'business'
4. **AI Errors**: Logged to console only, no user notification
5. **Test Gaps**: No E2E for AI toggle, platform indicator, tier flow

## References
- Research findings from repo-scout, practice-scout, docs-scout
- Gap analysis from flow-gap-analyst
