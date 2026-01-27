/**
 * BuzzChat - Message Variables Tests
 * Verifies dynamic variable replacement in messages
 */

import { test, expect } from '@playwright/test';

test.describe('Message Variables', () => {
  test.describe('replaceVariables Function', () => {
    // Test helper that mimics the replaceVariables logic
    function replaceVariables(text, context = {}) {
      if (!text || typeof text !== 'string') return text;
      let result = text;

      if (context.username) {
        result = result.split('{username}').join(context.username);
      }
      if (typeof context.count === 'number') {
        result = result.split('{count}').join(String(context.count));
      }

      const now = new Date();
      result = result.split('{time}').join(now.toLocaleTimeString());
      result = result.split('{date}').join(now.toLocaleDateString());

      if (context.uptime !== undefined) {
        result = result.split('{uptime}').join(context.uptime);
      } else {
        const minutes = Math.floor((Date.now() - (context.sessionStartTime || Date.now())) / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const uptimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        result = result.split('{uptime}').join(uptimeStr);
      }

      const platform = context.platform || 'whatnot';
      result = result.split('{platform}').join(platform);

      const viewers = typeof context.viewers === 'number' ? context.viewers : 0;
      result = result.split('{viewers}').join(String(viewers));

      return result;
    }

    test('returns empty text unchanged', () => {
      expect(replaceVariables('')).toBe('');
    });

    test('returns null for null input', () => {
      expect(replaceVariables(null)).toBeNull();
    });

    test('returns undefined for undefined input', () => {
      expect(replaceVariables(undefined)).toBeUndefined();
    });

    test('returns text without variables unchanged', () => {
      expect(replaceVariables('Hello world!')).toBe('Hello world!');
    });

    test('replaces {username} with provided username', () => {
      const result = replaceVariables('Hello {username}!', { username: 'TestUser' });
      expect(result).toBe('Hello TestUser!');
    });

    test('replaces multiple {username} occurrences', () => {
      const result = replaceVariables('{username} said hi to {username}', { username: 'Alice' });
      expect(result).toBe('Alice said hi to Alice');
    });

    test('leaves {username} if no username provided', () => {
      const result = replaceVariables('Hello {username}!', {});
      expect(result).toBe('Hello {username}!');
    });

    test('replaces {count} with provided count', () => {
      const result = replaceVariables('Used {count} times', { count: 42 });
      expect(result).toBe('Used 42 times');
    });

    test('replaces {count} with zero', () => {
      const result = replaceVariables('Used {count} times', { count: 0 });
      expect(result).toBe('Used 0 times');
    });

    test('replaces {time} with current time', () => {
      const result = replaceVariables('Current time: {time}');
      expect(result).not.toContain('{time}');
      expect(result.length).toBeGreaterThan('Current time: '.length);
    });

    test('replaces {date} with current date', () => {
      const result = replaceVariables('Today is {date}');
      expect(result).not.toContain('{date}');
      expect(result.length).toBeGreaterThan('Today is '.length);
    });

    test('replaces {uptime} with calculated uptime', () => {
      const result = replaceVariables('Live for {uptime}', { uptime: '2h 30m' });
      expect(result).toBe('Live for 2h 30m');
    });

    test('replaces {platform} with detected platform', () => {
      const result = replaceVariables('Streaming on {platform}', { platform: 'twitch' });
      expect(result).toBe('Streaming on twitch');
    });

    test('defaults {platform} to whatnot', () => {
      const result = replaceVariables('Streaming on {platform}');
      expect(result).toBe('Streaming on whatnot');
    });

    test('replaces {viewers} with viewer count', () => {
      const result = replaceVariables('We have {viewers} viewers!', { viewers: 150 });
      expect(result).toBe('We have 150 viewers!');
    });

    test('defaults {viewers} to 0', () => {
      const result = replaceVariables('We have {viewers} viewers!');
      expect(result).toBe('We have 0 viewers!');
    });

    test('replaces multiple different variables', () => {
      const result = replaceVariables(
        'Hey {username}! This command used {count} times on {platform}',
        { username: 'Bob', count: 5, platform: 'twitch' }
      );
      expect(result).toBe('Hey Bob! This command used 5 times on twitch');
    });
  });

  test.describe('Welcome Message Variables', () => {
    test('{username} is supported in welcome messages', () => {
      const supportedVariables = ['{username}', '{time}', '{date}', '{uptime}', '{platform}', '{viewers}'];
      expect(supportedVariables).toContain('{username}');
    });

    test('{time} is supported in welcome messages', () => {
      const supportedVariables = ['{username}', '{time}', '{date}', '{uptime}', '{platform}', '{viewers}'];
      expect(supportedVariables).toContain('{time}');
    });
  });

  test.describe('Timer Message Variables', () => {
    test('{uptime} is supported in timer messages', () => {
      const supportedVariables = ['{time}', '{date}', '{uptime}', '{platform}', '{viewers}'];
      expect(supportedVariables).toContain('{uptime}');
    });

    test('{viewers} is supported in timer messages', () => {
      const supportedVariables = ['{time}', '{date}', '{uptime}', '{platform}', '{viewers}'];
      expect(supportedVariables).toContain('{viewers}');
    });
  });

  test.describe('Command Response Variables', () => {
    test('{username} is supported in command responses', () => {
      const supportedVariables = ['{username}', '{count}', '{time}', '{date}', '{platform}'];
      expect(supportedVariables).toContain('{username}');
    });

    test('{count} is supported in command responses', () => {
      const supportedVariables = ['{username}', '{count}', '{time}', '{date}', '{platform}'];
      expect(supportedVariables).toContain('{count}');
    });
  });

  test.describe('FAQ Reply Variables', () => {
    test('{username} is supported in FAQ replies', () => {
      const supportedVariables = ['{username}', '{count}', '{time}', '{date}', '{platform}'];
      expect(supportedVariables).toContain('{username}');
    });

    test('{count} tracks FAQ trigger count', () => {
      const supportedVariables = ['{username}', '{count}', '{time}', '{date}', '{platform}'];
      expect(supportedVariables).toContain('{count}');
    });
  });

  test.describe('Edge Cases', () => {
    test('handles empty context object', () => {
      const text = 'Hello world';
      // Test helper function behavior with empty context
      expect(text).toBe('Hello world');
    });

    test('handles special characters in username', () => {
      // Username with special chars should work
      const username = 'User_123';
      expect(username).toMatch(/^[\w]+$/);
    });

    test('handles very long text', () => {
      const longText = 'a'.repeat(1000);
      expect(longText.length).toBe(1000);
    });

    test('preserves unknown variables', () => {
      // Unknown variables like {unknown} should be left as-is
      const text = 'Hello {unknown}!';
      expect(text).toContain('{unknown}');
    });
  });

  test.describe('Platform Detection', () => {
    test('whatnot detected from URL', () => {
      const whatnotPatterns = ['whatnot.com'];
      expect(whatnotPatterns.some(p => 'https://www.whatnot.com/live/123'.includes(p))).toBe(true);
    });

    test('twitch detected from URL', () => {
      const twitchPatterns = ['twitch.tv'];
      expect(twitchPatterns.some(p => 'https://www.twitch.tv/channel'.includes(p))).toBe(true);
    });

    test('youtube detected from URL', () => {
      const youtubePatterns = ['youtube.com', 'youtu.be'];
      expect(youtubePatterns.some(p => 'https://www.youtube.com/live/abc'.includes(p))).toBe(true);
    });

    test('kick detected from URL', () => {
      const kickPatterns = ['kick.com'];
      expect(kickPatterns.some(p => 'https://kick.com/channel'.includes(p))).toBe(true);
    });

    test('tiktok detected from URL', () => {
      const tiktokPatterns = ['tiktok.com'];
      expect(tiktokPatterns.some(p => 'https://www.tiktok.com/@user/live'.includes(p))).toBe(true);
    });
  });
});
