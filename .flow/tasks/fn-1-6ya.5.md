# fn-1-6ya.5 AI Credit System and Usage Tracking

## Description
# fn-1-6ya.5 AI Credit System and Usage Tracking

## Goal
Implement credit-based AI usage tracking to control costs. Max tier gets 500 credits/month. Track usage, show remaining credits, warn when low.

## Pricing Analysis
- Claude Haiku: $1/M input, $5/M output tokens
- Average response: ~30 input + ~50 output tokens
- Cost per response: ~$0.00028
- 500 credits = ~$0.14/user/month
- Max tier at $24.99 = 99.4% margin on AI

## Implementation

### 1. Credit Tracker (`src/lib/aiCredits.js`)
```javascript
const STORAGE_KEY = 'buzzchat_ai_credits';
const MONTHLY_ALLOWANCE = 500;

export async function getCredits() {
  const result = await browserAPI.storage.sync.get([STORAGE_KEY]);
  const data = result[STORAGE_KEY] || {};

  // Reset if new month
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"
  if (data.month !== currentMonth) {
    return {
      remaining: MONTHLY_ALLOWANCE,
      used: 0,
      month: currentMonth,
      resetDate: getNextResetDate()
    };
  }

  return {
    remaining: MONTHLY_ALLOWANCE - (data.used || 0),
    used: data.used || 0,
    month: currentMonth,
    resetDate: getNextResetDate()
  };
}

export async function useCredit() {
  const credits = await getCredits();

  if (credits.remaining <= 0) {
    throw new Error('No AI credits remaining');
  }

  await browserAPI.storage.sync.set({
    [STORAGE_KEY]: {
      used: credits.used + 1,
      month: credits.month
    }
  });

  return credits.remaining - 1;
}

export async function checkCreditWarning() {
  const credits = await getCredits();
  if (credits.remaining <= 50) {
    return {
      warning: true,
      message: `Only ${credits.remaining} AI credits left this month`,
      level: credits.remaining <= 10 ? 'critical' : 'low'
    };
  }
  return { warning: false };
}

function getNextResetDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
```

### 2. Usage UI Component
```html
<!-- In popup.html - AI Credits Section -->
<div id="aiCreditsSection" class="credits-section hidden">
  <div class="credits-header">
    <span class="credits-icon">🤖</span>
    <span class="credits-title">AI Credits</span>
  </div>
  <div class="credits-bar">
    <div class="credits-fill" style="width: 80%"></div>
  </div>
  <div class="credits-info">
    <span id="creditsRemaining">400</span> / 500 remaining
  </div>
  <div class="credits-reset">
    Resets <span id="creditsResetDate">Feb 1</span>
  </div>
</div>
```

### 3. CSS Styles
```css
.credits-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
  color: white;
}

.credits-bar {
  background: rgba(255,255,255,0.3);
  border-radius: 8px;
  height: 8px;
  overflow: hidden;
}

.credits-fill {
  background: white;
  height: 100%;
  transition: width 0.3s ease;
}

.credits-warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.credits-critical {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  animation: pulse 2s infinite;
}
```

### 4. Integration with AI Service
```javascript
// In aiService.js
export async function generateAIResponseWithCredits(options) {
  // Check credits first
  const credits = await getCredits();
  if (credits.remaining <= 0) {
    return {
      error: 'NO_CREDITS',
      message: 'No AI credits remaining. Resets ' + credits.resetDate
    };
  }

  // Check warning threshold
  const warning = await checkCreditWarning();

  // Generate response
  const response = await generateAIResponse(options);

  // Deduct credit
  await useCredit();

  return {
    ...response,
    creditsRemaining: credits.remaining - 1,
    warning
  };
}
```

## Files to Create
- `src/lib/aiCredits.js`

## Files to Modify
- `src/lib/aiService.js` - Integrate credit checking
- `src/popup/popup.html` - Credits display UI
- `src/popup/popup.css` - Credits styling
- `src/popup/popup.js` - Credits update logic

## Acceptance Criteria
- [ ] Credits tracked in sync storage
- [ ] 500 credits/month for Max tier
- [ ] Auto-reset on new month
- [ ] Visual progress bar in popup
- [ ] Warning at 50 credits remaining
- [ ] Critical warning at 10 credits
- [ ] AI disabled when credits exhausted
- [ ] Reset date clearly shown
## Acceptance
- [ ] TBD

## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
