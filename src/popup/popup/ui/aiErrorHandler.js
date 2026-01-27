// BuzzChat - AI Error Handler
// Displays user-friendly error messages for AI operations

import { Toast } from './toast.js';

// Error type to user message mapping
const ERROR_MESSAGES = {
  NO_API_KEY: {
    message: 'AI requires an API key. Click to configure.',
    type: 'error',
    action: 'Configure'
  },
  INVALID_API_KEY: {
    message: 'Invalid API key. Please check your settings.',
    type: 'error',
    action: 'Configure'
  },
  RATE_LIMITED: {
    message: 'AI rate limited. Using template response.',
    type: 'warning',
    action: null
  },
  NO_CREDITS: {
    message: 'AI credits exhausted. Resets on {resetDate}.',
    type: 'error',
    action: 'View Credits'
  },
  NETWORK_ERROR: {
    message: 'AI unavailable. Using template response.',
    type: 'warning',
    action: null
  },
  TIMEOUT: {
    message: 'AI response timed out. Using template.',
    type: 'warning',
    action: null
  },
  UNKNOWN: {
    message: 'AI error occurred. Using template response.',
    type: 'error',
    action: null
  }
};

// Credit warning thresholds
const CREDIT_WARNINGS = {
  LOW: { threshold: 50, message: '50 AI credits remaining this month.' },
  CRITICAL: { threshold: 10, message: 'Only 10 AI credits left! Renews soon.' }
};

/**
 * Classify error message into a known error type
 * @param {string} errorMessage - The raw error message
 * @returns {string} Error type key
 */
function classifyError(errorMessage) {
  if (!errorMessage) return 'UNKNOWN';

  const msg = errorMessage.toLowerCase();

  if (msg.includes('api key required') || msg.includes('no api key')) {
    return 'NO_API_KEY';
  }
  if (msg.includes('invalid api key') || msg.includes('401') || msg.includes('authentication')) {
    return 'INVALID_API_KEY';
  }
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
    return 'RATE_LIMITED';
  }
  if (msg.includes('no ai credits') || msg.includes('credits exhausted') || msg.includes('no_credits')) {
    return 'NO_CREDITS';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline') || msg.includes('unreachable')) {
    return 'NETWORK_ERROR';
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('abort')) {
    return 'TIMEOUT';
  }

  return 'UNKNOWN';
}

/**
 * Show AI error toast with appropriate message and action
 * @param {string} errorMessage - The raw error message
 * @param {Object} options - Additional options
 * @param {string} options.resetDate - Credit reset date (for NO_CREDITS)
 * @param {Function} options.onConfigureClick - Callback when "Configure" is clicked
 * @param {Function} options.onViewCreditsClick - Callback when "View Credits" is clicked
 */
export function showAIError(errorMessage, options = {}) {
  const errorType = classifyError(errorMessage);
  const config = ERROR_MESSAGES[errorType];

  // Replace placeholders in message
  let message = config.message;
  if (options.resetDate) {
    message = message.replace('{resetDate}', options.resetDate);
  }

  // Determine action handler
  let actionConfig = null;
  if (config.action) {
    const onClick = config.action === 'Configure'
      ? options.onConfigureClick
      : options.onViewCreditsClick;

    if (onClick) {
      actionConfig = { label: config.action, onClick };
    }
  }

  if (actionConfig) {
    Toast.showWithAction(message, config.type, actionConfig, 5000);
  } else {
    Toast.show(message, config.type, 4000);
  }
}

/**
 * Show credit warning toast if credits are low
 * @param {number} creditsRemaining - Number of credits remaining
 * @param {Object} options - Additional options
 * @param {Function} options.onViewCreditsClick - Callback for viewing credits
 */
export function showCreditWarning(creditsRemaining, options = {}) {
  if (creditsRemaining <= CREDIT_WARNINGS.CRITICAL.threshold) {
    Toast.showWithAction(
      CREDIT_WARNINGS.CRITICAL.message,
      'warning',
      options.onViewCreditsClick ? { label: 'View Credits', onClick: options.onViewCreditsClick } : null,
      5000
    );
  } else if (creditsRemaining <= CREDIT_WARNINGS.LOW.threshold) {
    Toast.show(CREDIT_WARNINGS.LOW.message, 'warning', 4000);
  }
}

/**
 * Initialize AI error message listener
 * Listens for messages from content script
 * @param {Object} options - Handler options
 */
export function initAIErrorListener(options = {}) {
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  browserAPI.runtime.onMessage.addListener((message) => {
    if (message.type === 'AI_ERROR') {
      showAIError(message.error, {
        resetDate: message.resetDate,
        onConfigureClick: options.onConfigureClick,
        onViewCreditsClick: options.onViewCreditsClick
      });
    }

    if (message.type === 'AI_CREDIT_WARNING') {
      showCreditWarning(message.creditsRemaining, {
        onViewCreditsClick: options.onViewCreditsClick
      });
    }

    return false; // Don't keep the message channel open
  });
}

// Export for use in popup
export const AIErrorHandler = {
  showAIError,
  showCreditWarning,
  initAIErrorListener,
  classifyError
};
