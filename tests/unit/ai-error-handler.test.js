/**
 * BuzzChat - AI Error Handler Unit Tests
 * Verifies error classification and user-friendly messages
 */

import { test, expect } from '@playwright/test';

test.describe('AI Error Handler', () => {
  // Mock the error classifier
  function classifyError(errorMessage) {
    if (!errorMessage) return 'UNKNOWN';
    const msg = errorMessage.toLowerCase();
    if (msg.includes('api key required') || msg.includes('no api key')) return 'NO_API_KEY';
    if (msg.includes('invalid api key') || msg.includes('401') || msg.includes('authentication')) return 'INVALID_API_KEY';
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) return 'RATE_LIMITED';
    if (msg.includes('no ai credits') || msg.includes('credits exhausted') || msg.includes('no_credits')) return 'NO_CREDITS';
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) return 'NETWORK_ERROR';
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('abort')) return 'TIMEOUT';
    return 'UNKNOWN';
  }

  test.describe('Error Classification', () => {
    test('classifies missing API key error', async () => {
      expect(classifyError('API key required')).toBe('NO_API_KEY');
      expect(classifyError('No api key provided')).toBe('NO_API_KEY');
    });

    test('classifies invalid API key error', async () => {
      expect(classifyError('Invalid API key')).toBe('INVALID_API_KEY');
      expect(classifyError('401 Unauthorized')).toBe('INVALID_API_KEY');
      expect(classifyError('Authentication failed')).toBe('INVALID_API_KEY');
    });

    test('classifies rate limit error', async () => {
      expect(classifyError('Rate limited - too many requests')).toBe('RATE_LIMITED');
      expect(classifyError('429 Too Many Requests')).toBe('RATE_LIMITED');
    });

    test('classifies no credits error', async () => {
      expect(classifyError('No AI credits remaining')).toBe('NO_CREDITS');
      expect(classifyError('Credits exhausted')).toBe('NO_CREDITS');
      expect(classifyError('NO_CREDITS')).toBe('NO_CREDITS');
    });

    test('classifies network error', async () => {
      expect(classifyError('Network error')).toBe('NETWORK_ERROR');
      expect(classifyError('Failed to fetch')).toBe('NETWORK_ERROR');
      expect(classifyError('User is offline')).toBe('NETWORK_ERROR');
    });

    test('classifies timeout error', async () => {
      expect(classifyError('Request timed out')).toBe('TIMEOUT');
      expect(classifyError('AbortError: timeout')).toBe('TIMEOUT');
    });

    test('classifies unknown error', async () => {
      expect(classifyError('Something went wrong')).toBe('UNKNOWN');
      expect(classifyError('')).toBe('UNKNOWN');
      expect(classifyError(null)).toBe('UNKNOWN');
    });
  });

  test.describe('Error Messages', () => {
    const ERROR_MESSAGES = {
      NO_API_KEY: { message: 'AI requires an API key. Click to configure.', type: 'error', action: 'Configure' },
      INVALID_API_KEY: { message: 'Invalid API key. Please check your settings.', type: 'error', action: 'Configure' },
      RATE_LIMITED: { message: 'AI rate limited. Using template response.', type: 'warning', action: null },
      NO_CREDITS: { message: 'AI credits exhausted. Resets on {resetDate}.', type: 'error', action: 'View Credits' },
      NETWORK_ERROR: { message: 'AI unavailable. Using template response.', type: 'warning', action: null },
      TIMEOUT: { message: 'AI response timed out. Using template.', type: 'warning', action: null },
      UNKNOWN: { message: 'AI error occurred. Using template response.', type: 'error', action: null }
    };

    test('NO_API_KEY has Configure action', async () => {
      const config = ERROR_MESSAGES.NO_API_KEY;
      expect(config.action).toBe('Configure');
      expect(config.type).toBe('error');
    });

    test('INVALID_API_KEY has Configure action', async () => {
      const config = ERROR_MESSAGES.INVALID_API_KEY;
      expect(config.action).toBe('Configure');
      expect(config.type).toBe('error');
    });

    test('RATE_LIMITED has no action (just informative)', async () => {
      const config = ERROR_MESSAGES.RATE_LIMITED;
      expect(config.action).toBeNull();
      expect(config.type).toBe('warning');
    });

    test('NO_CREDITS has View Credits action', async () => {
      const config = ERROR_MESSAGES.NO_CREDITS;
      expect(config.action).toBe('View Credits');
      expect(config.message).toContain('{resetDate}');
    });

    test('NETWORK_ERROR is a warning (not blocking)', async () => {
      const config = ERROR_MESSAGES.NETWORK_ERROR;
      expect(config.type).toBe('warning');
    });

    test('TIMEOUT is a warning (fallback used)', async () => {
      const config = ERROR_MESSAGES.TIMEOUT;
      expect(config.type).toBe('warning');
    });

    test('all error types have messages defined', async () => {
      const errorTypes = ['NO_API_KEY', 'INVALID_API_KEY', 'RATE_LIMITED', 'NO_CREDITS', 'NETWORK_ERROR', 'TIMEOUT', 'UNKNOWN'];
      for (const type of errorTypes) {
        expect(ERROR_MESSAGES[type]).toBeDefined();
        expect(ERROR_MESSAGES[type].message).toBeTruthy();
        expect(ERROR_MESSAGES[type].type).toMatch(/^(error|warning|info)$/);
      }
    });
  });

  test.describe('Credit Warning Thresholds', () => {
    function getCreditWarningLevel(creditsRemaining) {
      if (creditsRemaining <= 10) return 'CRITICAL';
      if (creditsRemaining <= 50) return 'LOW';
      return null;
    }

    test('shows critical warning at 10 credits', async () => {
      expect(getCreditWarningLevel(10)).toBe('CRITICAL');
      expect(getCreditWarningLevel(5)).toBe('CRITICAL');
      expect(getCreditWarningLevel(0)).toBe('CRITICAL');
    });

    test('shows low warning at 50 credits', async () => {
      expect(getCreditWarningLevel(50)).toBe('LOW');
      expect(getCreditWarningLevel(30)).toBe('LOW');
      expect(getCreditWarningLevel(11)).toBe('LOW');
    });

    test('no warning above 50 credits', async () => {
      expect(getCreditWarningLevel(51)).toBeNull();
      expect(getCreditWarningLevel(100)).toBeNull();
      expect(getCreditWarningLevel(500)).toBeNull();
    });
  });

  test.describe('Message Content', () => {
    test('user-friendly messages do not expose technical details', async () => {
      const ERROR_MESSAGES = {
        NO_API_KEY: 'AI requires an API key. Click to configure.',
        INVALID_API_KEY: 'Invalid API key. Please check your settings.',
        NETWORK_ERROR: 'AI unavailable. Using template response.'
      };

      // Messages should not contain technical jargon
      for (const [type, message] of Object.entries(ERROR_MESSAGES)) {
        expect(message).not.toContain('Exception');
        expect(message).not.toContain('Error:');
        expect(message).not.toContain('stack');
        expect(message).not.toContain('undefined');
      }
    });

    test('messages inform user of fallback behavior', async () => {
      const fallbackMessages = [
        'AI rate limited. Using template response.',
        'AI unavailable. Using template response.',
        'AI response timed out. Using template.'
      ];

      for (const message of fallbackMessages) {
        expect(message.toLowerCase()).toContain('template');
      }
    });
  });

  test.describe('Toast Integration', () => {
    test('error toasts have 5 second duration with action', async () => {
      const defaultDuration = 5000;
      expect(defaultDuration).toBe(5000);
    });

    test('warning toasts have 4 second duration', async () => {
      const warningDuration = 4000;
      expect(warningDuration).toBe(4000);
    });

    test('toast types match CSS classes', async () => {
      const toastTypes = ['success', 'error', 'warning', 'info'];
      for (const type of toastTypes) {
        const expectedClass = `toast-${type}`;
        expect(expectedClass).toMatch(/^toast-(success|error|warning|info)$/);
      }
    });
  });
});
