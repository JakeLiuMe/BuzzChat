# fn-1-6ya.3 Self-Healing Remote Selector Updates

## Description
# fn-1-6ya.3 Self-Healing Remote Selector Updates

## Goal
Implement a system that automatically fetches updated selectors from a remote source (GitHub Gist) when platform UIs change, eliminating manual updates.

## Implementation

### 1. Remote Selector Service (`src/lib/selectorUpdater.js`)
```javascript
const GIST_URL = 'https://gist.githubusercontent.com/{user}/{gist_id}/raw/selectors.json';
const CACHE_KEY = 'buzzchat_remote_selectors';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function fetchRemoteSelectors() {
  try {
    const cached = await getCachedSelectors();
    if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
      return cached.selectors;
    }

    const response = await fetch(GIST_URL);
    if (!response.ok) throw new Error('Fetch failed');

    const selectors = await response.json();
    await cacheSelectors(selectors);
    return selectors;
  } catch (error) {
    console.warn('[BuzzChat] Using local selectors:', error);
    return null; // Fall back to bundled selectors
  }
}
```

### 2. Selector Health Monitor
```javascript
export function monitorSelectorHealth(selectors) {
  const healthChecks = {};

  for (const [key, selectorList] of Object.entries(selectors)) {
    const element = document.querySelector(selectorList.join(','));
    healthChecks[key] = {
      found: !!element,
      selector: element ? getMatchingSelector(element, selectorList) : null
    };
  }

  // Report broken selectors
  const broken = Object.entries(healthChecks)
    .filter(([_, h]) => !h.found)
    .map(([key]) => key);

  if (broken.length > 0) {
    reportBrokenSelectors(broken);
  }

  return healthChecks;
}
```

### 3. Automatic Fallback Detection
```javascript
export function discoverSelectors(platformId) {
  // Try to find elements using heuristics when selectors fail
  const discoveries = {};

  // Chat container: look for scrollable div with many children
  const candidates = document.querySelectorAll('[class*="chat"], [class*="Chat"]');
  for (const el of candidates) {
    if (el.children.length > 5 && el.scrollHeight > el.clientHeight) {
      discoveries.chatContainer = generateSelector(el);
      break;
    }
  }

  // Chat input: look for textarea or contenteditable
  const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
  for (const el of inputs) {
    if (el.placeholder?.toLowerCase().includes('chat') ||
        el.closest('[class*="chat"]')) {
      discoveries.chatInput = generateSelector(el);
      break;
    }
  }

  return discoveries;
}
```

### 4. GitHub Gist Structure
```json
{
  "version": "1.0.0",
  "updated": "2026-01-27T00:00:00Z",
  "platforms": {
    "whatnot": {
      "chatContainer": ["[data-testid='chat']", ".chat-container"],
      "chatMessage": ["[data-testid='message']"],
      ...
    },
    "youtube": { ... },
    "ebay": { ... }
  }
}
```

## Files to Create
- `src/lib/selectorUpdater.js`
- `src/lib/selectorHealth.js`

## Files to Modify
- `src/scripts/content/init.js` - Integrate remote selectors
- `src/background/background.js` - Periodic selector updates

## Acceptance Criteria
- [ ] Selectors fetched from Gist on startup
- [ ] Cached locally with 1-hour expiry
- [ ] Falls back to bundled selectors if fetch fails
- [ ] Health monitor detects broken selectors
- [ ] Broken selectors reported (console + optional analytics)
- [ ] Auto-discovery attempts to find elements when selectors fail
## Acceptance
- [ ] TBD

## Done summary
- Task completed
## Evidence
- Commits:
- Tests:
- PRs: