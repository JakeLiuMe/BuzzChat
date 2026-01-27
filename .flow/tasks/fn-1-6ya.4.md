# fn-1-6ya.4 Claude Haiku AI Integration

## Description
# fn-1-6ya.4 Claude Haiku AI Integration

## Goal
Integrate Claude Haiku API for smart, context-aware chat responses. Max tier only. Responses should feel natural, match seller personality, and understand context.

## Implementation

### 1. AI Service (`src/lib/aiService.js`)
```javascript
import Anthropic from '@anthropic-ai/sdk';

const HAIKU_MODEL = 'claude-3-haiku-20240307';
const MAX_TOKENS = 100; // Keep responses short for chat

export async function generateAIResponse(options) {
  const {
    userMessage,
    context,
    tone = 'friendly',
    apiKey
  } = options;

  if (!apiKey) throw new Error('API key required');

  const client = new Anthropic({ apiKey });

  const systemPrompt = buildSystemPrompt(context, tone);

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  return {
    text: response.content[0].text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  };
}

function buildSystemPrompt(context, tone) {
  const toneStyles = {
    friendly: 'warm, casual, use emojis occasionally',
    professional: 'polite, clear, businesslike',
    hype: 'excited, energetic, lots of enthusiasm and emojis',
    chill: 'relaxed, laid-back, conversational'
  };

  return `You are a chat assistant for a live selling stream.
Tone: ${toneStyles[tone] || toneStyles.friendly}
${context.currentItem ? `Currently selling: ${context.currentItem}` : ''}
${context.sellerName ? `Seller name: ${context.sellerName}` : ''}

Rules:
- Keep responses under 100 characters
- Never mention being AI
- Match the platform's chat culture
- Be helpful and engaging
- If asked about price/shipping, say "Check the listing for details!"`;
}
```

### 2. Secure API Key Storage
```javascript
// src/lib/secureApiKey.js
import { browserAPI } from './config.js';

const KEY_NAME = 'buzzchat_anthropic_key';

export async function storeApiKey(apiKey) {
  // Validate key format first
  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid API key format');
  }

  // Store encrypted in local storage (not sync - too sensitive)
  await browserAPI.storage.local.set({
    [KEY_NAME]: btoa(apiKey) // Basic obfuscation, not true encryption
  });
}

export async function getApiKey() {
  const result = await browserAPI.storage.local.get([KEY_NAME]);
  if (result[KEY_NAME]) {
    return atob(result[KEY_NAME]);
  }
  return null;
}

export async function clearApiKey() {
  await browserAPI.storage.local.remove([KEY_NAME]);
}
```

### 3. AI-Enhanced FAQ Rules
```javascript
// Extend FAQ rule structure
const faqRule = {
  trigger: 'shipping',
  response: '', // Empty = use AI
  useAI: true,
  aiTone: 'friendly',
  aiContext: 'shipping and delivery questions'
};

// In FAQ handler
async function handleFaqWithAI(userMessage, rule) {
  if (rule.useAI && settings.tier === 'max') {
    const aiResponse = await generateAIResponse({
      userMessage,
      context: {
        currentItem: state.currentItem,
        sellerName: settings.sellerName,
        additionalContext: rule.aiContext
      },
      tone: rule.aiTone,
      apiKey: await getApiKey()
    });
    return aiResponse.text;
  }
  return rule.response;
}
```

## Files to Create
- `src/lib/aiService.js`
- `src/lib/secureApiKey.js`

## Files to Modify
- `package.json` - Add @anthropic-ai/sdk dependency
- `src/scripts/content/features/faq.js` - AI-enhanced responses
- `src/popup/popup.html` - API key input UI
- `src/popup/popup.js` - API key management

## Acceptance Criteria
- [ ] API key securely stored (local storage, not sync)
- [ ] AI responses generated in <2 seconds
- [ ] Tone selection works (friendly, professional, hype, chill)
- [ ] Context-aware responses (knows current item)
- [ ] Graceful fallback if API fails
- [ ] Only available for Max tier users
## Acceptance
- [ ] TBD

## Done summary
- Task completed
## Evidence
- Commits:
- Tests:
- PRs: