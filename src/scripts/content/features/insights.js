// BuzzChat - Chat Insights (Proactive AI Suggestions)
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
//
// Analyzes chat patterns in real-time and surfaces actionable insights.
// No AI API calls needed - uses local pattern matching for speed.

import { state } from '../state.js';
import { CONFIG, LRUMap } from '../config.js';

// Insight types
export const INSIGHT_TYPES = {
  REPEATED_QUESTION: 'repeated_question',
  HIGH_ACTIVITY: 'high_activity',
  SENTIMENT_SHIFT: 'sentiment_shift',
  KEYWORD_SPIKE: 'keyword_spike'
};

// Common question patterns (expanded)
const QUESTION_PATTERNS = {
  shipping: ['shipping', 'ship', 'delivery', 'deliver', 'when will', 'how long', 'tracking'],
  price: ['price', 'cost', 'how much', 'dollars', '$', 'discount', 'deal'],
  size: ['size', 'dimensions', 'big', 'small', 'fit', 'measure'],
  availability: ['available', 'in stock', 'left', 'remaining', 'more', 'sold out'],
  payment: ['pay', 'payment', 'venmo', 'paypal', 'card', 'credit'],
  condition: ['condition', 'new', 'used', 'damage', 'worn', 'authentic', 'real', 'fake'],
  return: ['return', 'refund', 'exchange', 'money back']
};

// Positive/negative sentiment words
const SENTIMENT = {
  positive: ['love', 'great', 'amazing', 'awesome', 'beautiful', 'perfect', 'thanks', 'thank you', '❤️', '🔥', '😍', '👏'],
  negative: ['bad', 'slow', 'expensive', 'fake', 'scam', 'never', 'worst', 'disappointed', 'angry', '😡', '👎']
};

// Insights state
const insightsState = {
  questionCounts: new LRUMap(50), // pattern -> count
  recentMessages: [], // last 50 messages with timestamps
  lastInsightTime: 0,
  activeInsights: [],
  dismissed: new Set()
};

// Minimum time between showing same insight type (ms)
const INSIGHT_COOLDOWN = 60000; // 1 minute

/**
 * Analyze a new message for patterns
 * @param {string} message - The chat message
 * @param {string} username - The sender's username
 */
export function analyzeMessage(message, username) {
  if (!message || !state.settings?.masterEnabled) return;

  const lowerMessage = message.toLowerCase();
  const now = Date.now();

  // Add to recent messages (keep last 50)
  insightsState.recentMessages.push({ message: lowerMessage, username, time: now });
  if (insightsState.recentMessages.length > 50) {
    insightsState.recentMessages.shift();
  }

  // Check for question patterns
  for (const [category, keywords] of Object.entries(QUESTION_PATTERNS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        const count = (insightsState.questionCounts.get(category) || 0) + 1;
        insightsState.questionCounts.set(category, count);

        // Trigger insight if 3+ people asked about same thing in last 5 minutes
        if (count >= 3) {
          triggerInsight(INSIGHT_TYPES.REPEATED_QUESTION, {
            category,
            count,
            suggestion: getQuestionSuggestion(category)
          });
          // Reset counter after triggering
          insightsState.questionCounts.set(category, 0);
        }
        break; // Only count one category per message
      }
    }
  }

  // Check for high activity (more than 20 messages in last minute)
  const oneMinuteAgo = now - 60000;
  const recentCount = insightsState.recentMessages.filter(m => m.time > oneMinuteAgo).length;
  if (recentCount >= 20) {
    triggerInsight(INSIGHT_TYPES.HIGH_ACTIVITY, {
      messagesPerMinute: recentCount,
      suggestion: "Chat is popping! Great time to promote."
    });
  }
}

/**
 * Get suggestion text for a question category
 */
function getQuestionSuggestion(category) {
  const suggestions = {
    shipping: "Send shipping info? (Usually ships in 1-3 business days)",
    price: "Announce current price or any deals?",
    size: "Share size/dimensions info?",
    availability: "Update on stock availability?",
    payment: "Clarify payment methods accepted?",
    condition: "Confirm item condition/authenticity?",
    return: "Share your return policy?"
  };
  return suggestions[category] || "Address this in chat?";
}

/**
 * Trigger an insight notification
 */
function triggerInsight(type, data) {
  const now = Date.now();

  // Cooldown check
  if (now - insightsState.lastInsightTime < INSIGHT_COOLDOWN) return;

  // Don't show dismissed insights
  const insightKey = `${type}-${data.category || data.messagesPerMinute}`;
  if (insightsState.dismissed.has(insightKey)) return;

  insightsState.lastInsightTime = now;

  const insight = {
    id: `insight-${now}`,
    type,
    data,
    time: now
  };

  insightsState.activeInsights.push(insight);

  // Show the insight in UI
  showInsightUI(insight);
}

/**
 * Show insight notification in the page
 */
function showInsightUI(insight) {
  // Remove existing insight panel
  const existing = document.getElementById('buzzchat-insight');
  if (existing) existing.remove();

  // Create insight panel
  const panel = document.createElement('div');
  panel.id = 'buzzchat-insight';
  panel.style.cssText = `
    position: fixed;
    bottom: 200px;
    right: 20px;
    max-width: 280px;
    padding: 16px;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
    color: white;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    z-index: 10002;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    animation: slideInRight 0.3s ease;
    border: 1px solid rgba(255,255,255,0.1);
  `;

  // Add animation
  if (!document.getElementById('buzzchat-insight-styles')) {
    const style = document.createElement('style');
    style.id = 'buzzchat-insight-styles';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';

  const icon = document.createElement('span');
  icon.textContent = '💡';
  icon.style.fontSize = '18px';

  const title = document.createElement('strong');
  title.textContent = 'BuzzChat Insight';
  title.style.color = '#c4b5fd';

  header.appendChild(icon);
  header.appendChild(title);

  // Message
  const message = document.createElement('div');
  message.style.marginBottom = '12px';

  if (insight.type === INSIGHT_TYPES.REPEATED_QUESTION) {
    message.textContent = `${insight.data.count}+ people asked about ${insight.data.category}. ${insight.data.suggestion}`;
  } else if (insight.type === INSIGHT_TYPES.HIGH_ACTIVITY) {
    message.textContent = `🔥 ${insight.data.messagesPerMinute} messages/min! ${insight.data.suggestion}`;
  }

  // Buttons
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display: flex; gap: 8px;';

  const actionBtn = document.createElement('button');
  actionBtn.textContent = 'Send Now';
  actionBtn.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    background: #7c3aed;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  `;
  actionBtn.addEventListener('click', () => {
    // Could trigger a quick reply or open template selector
    panel.remove();
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.style.cssText = `
    padding: 8px 12px;
    background: transparent;
    color: #a5b4fc;
    border: 1px solid #4c1d95;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
  `;
  dismissBtn.addEventListener('click', () => {
    const insightKey = `${insight.type}-${insight.data.category || insight.data.messagesPerMinute}`;
    insightsState.dismissed.add(insightKey);
    panel.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => panel.remove(), 200);
  });

  buttons.appendChild(actionBtn);
  buttons.appendChild(dismissBtn);

  panel.appendChild(header);
  panel.appendChild(message);
  panel.appendChild(buttons);

  document.body.appendChild(panel);

  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (panel.parentNode) {
      panel.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => panel.remove(), 300);
    }
  }, 15000);
}

/**
 * Reset insights state (for new stream)
 */
export function resetInsights() {
  insightsState.questionCounts.clear();
  insightsState.recentMessages = [];
  insightsState.lastInsightTime = 0;
  insightsState.activeInsights = [];
  insightsState.dismissed.clear();
}

/**
 * Get current chat sentiment (positive/negative/neutral)
 * @returns {string} 'positive' | 'negative' | 'neutral'
 */
export function getCurrentSentiment() {
  const recent = insightsState.recentMessages.slice(-20);
  let positive = 0;
  let negative = 0;

  for (const { message } of recent) {
    for (const word of SENTIMENT.positive) {
      if (message.includes(word)) positive++;
    }
    for (const word of SENTIMENT.negative) {
      if (message.includes(word)) negative++;
    }
  }

  if (positive > negative + 3) return 'positive';
  if (negative > positive + 2) return 'negative';
  return 'neutral';
}
