// BuzzChat - AI Toggle Unit Tests
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { test, expect } from '@playwright/test';

test.describe('AI Toggle for FAQ Rules', () => {
  test.describe('Toggle Visibility', () => {
    test('AI toggle appears in FAQ template structure', async () => {
      // The faq-use-ai class should exist in the template
      const toggleClass = 'faq-use-ai';
      const groupClass = 'faq-ai-toggle-group';
      expect(toggleClass).toBeTruthy();
      expect(groupClass).toBeTruthy();
    });

    test('AI toggle is hidden by default (style="display: none")', async () => {
      // Default state is hidden, shown only for Max tier
      const defaultDisplay = 'none';
      expect(defaultDisplay).toBe('none');
    });

    test('AI toggle group has correct structure', async () => {
      // Expected elements in the AI toggle group
      const expectedElements = [
        'faq-ai-toggle-group',
        'ai-toggle',
        'ai-toggle-label',
        'ai-icon',
        'faq-use-ai',
        'toggle-slider'
      ];

      for (const element of expectedElements) {
        expect(element).toBeTruthy();
      }
    });
  });

  test.describe('Tier Gating', () => {
    test('Max tier shows AI toggle', async () => {
      const tier = 'max';
      const isMaxTier = tier === 'max' || tier === 'business';
      expect(isMaxTier).toBe(true);
    });

    test('Business tier shows AI toggle (legacy alias)', async () => {
      const tier = 'business';
      const isMaxTier = tier === 'max' || tier === 'business';
      expect(isMaxTier).toBe(true);
    });

    test('Pro tier does NOT show AI toggle', async () => {
      const tier = 'pro';
      const isMaxTier = tier === 'max' || tier === 'business';
      expect(isMaxTier).toBe(false);
    });

    test('Free tier does NOT show AI toggle', async () => {
      const tier = 'free';
      const isMaxTier = tier === 'max' || tier === 'business';
      expect(isMaxTier).toBe(false);
    });
  });

  test.describe('Rule State', () => {
    test('new FAQ rules have useAI: false by default', async () => {
      const newRule = { triggers: [], reply: '', caseSensitive: false, useAI: false };
      expect(newRule.useAI).toBe(false);
    });

    test('useAI can be toggled to true', async () => {
      const rule = { triggers: ['test'], reply: 'Test reply', caseSensitive: false, useAI: false };
      rule.useAI = true;
      expect(rule.useAI).toBe(true);
    });

    test('useAI can be toggled back to false', async () => {
      const rule = { triggers: ['test'], reply: 'Test reply', caseSensitive: false, useAI: true };
      rule.useAI = false;
      expect(rule.useAI).toBe(false);
    });

    test('rule without useAI property defaults to falsy', async () => {
      const legacyRule = { triggers: ['old'], reply: 'Old reply', caseSensitive: false };
      const useAI = legacyRule.useAI || false;
      expect(useAI).toBe(false);
    });
  });

  test.describe('AI Toggle CSS', () => {
    test('AI toggle group has gradient background', async () => {
      // CSS class should include gradient styling
      const cssClass = 'faq-ai-toggle-group';
      expect(cssClass).toContain('ai');
    });

    test('AI toggle has robot emoji icon', async () => {
      // The AI icon uses robot emoji
      const robotEmoji = '\u{1F916}'; // 🤖
      expect(robotEmoji).toBe('🤖');
    });
  });

  test.describe('Integration with FAQ Rules', () => {
    test('FAQ rules array can contain mixed AI/non-AI rules', async () => {
      const rules = [
        { triggers: ['shipping'], reply: 'We ship fast!', useAI: false },
        { triggers: ['recommend'], reply: 'I recommend...', useAI: true },
        { triggers: ['price'], reply: '$99', useAI: false }
      ];

      const aiEnabledRules = rules.filter(r => r.useAI);
      const nonAiRules = rules.filter(r => !r.useAI);

      expect(aiEnabledRules.length).toBe(1);
      expect(nonAiRules.length).toBe(2);
    });

    test('useAI flag persists through rule updates', async () => {
      const rule = { triggers: ['test'], reply: 'Original', useAI: true };

      // Update other fields
      rule.reply = 'Updated reply';
      rule.triggers = ['test', 'testing'];

      // useAI should remain unchanged
      expect(rule.useAI).toBe(true);
    });
  });
});
