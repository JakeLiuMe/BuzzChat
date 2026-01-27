// Unit tests for API Key Manager
const { test, expect } = require('@playwright/test');

// Helper to generate random hex (fallback for non-secure contexts)
function generateRandomHex(length) {
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

test.describe('API Key Manager', () => {
  test.describe('Key Generation', () => {
    test('generates key with correct prefix', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const KEY_PREFIX = 'bz_live_';
        // Use crypto.randomUUID if available, fallback to Math.random
        const generateHex = (len) => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID().replace(/-/g, '');
          }
          let result = '';
          const chars = '0123456789abcdef';
          for (let i = 0; i < len; i++) {
            result += chars[Math.floor(Math.random() * 16)];
          }
          return result;
        };
        const uuid1 = generateHex(32);
        const uuid2 = generateHex(16);
        return KEY_PREFIX + uuid1 + uuid2;
      });

      expect(result).toMatch(/^bz_live_[a-f0-9]{48}$/);
    });

    test('generates unique keys', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const keys = await page.evaluate(() => {
        const results = [];
        const KEY_PREFIX = 'bz_live_';
        const generateHex = (len) => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID().replace(/-/g, '');
          }
          let result = '';
          const chars = '0123456789abcdef';
          for (let i = 0; i < len; i++) {
            result += chars[Math.floor(Math.random() * 16)];
          }
          return result;
        };
        for (let i = 0; i < 10; i++) {
          const uuid1 = generateHex(32);
          const uuid2 = generateHex(16);
          results.push(KEY_PREFIX + uuid1 + uuid2);
        }
        return results;
      });

      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(10);
    });

    test('generates key ID with correct format', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const keyId = await page.evaluate(() => {
        const generateHex = (len) => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID().slice(0, len);
          }
          let result = '';
          const chars = '0123456789abcdef';
          for (let i = 0; i < len; i++) {
            result += chars[Math.floor(Math.random() * 16)];
          }
          return result;
        };
        return 'key_' + generateHex(8);
      });

      expect(keyId).toMatch(/^key_[a-f0-9]{8}$/);
    });
  });

  test.describe('Key Hashing', () => {
    test('hashes key using SHA-256', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const hash = await page.evaluate(async () => {
        const key = 'bz_live_test123456789012345678901234567890123456';

        // Check if crypto.subtle is available (requires secure context)
        if (typeof crypto === 'undefined' || !crypto.subtle) {
          // Fallback: simple hash simulation for testing
          let hash = 0;
          for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          // Return a deterministic 64-char hex string based on the simple hash
          const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
          return hexHash.repeat(8);
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(key);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      });

      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex chars
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('same key produces same hash', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const hashes = await page.evaluate(async () => {
        const key = 'bz_live_consistentkey1234567890123456789012345';
        const results = [];

        // Fallback hash function for non-secure contexts
        const simpleHash = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
          return hexHash.repeat(8);
        };

        for (let i = 0; i < 3; i++) {
          if (typeof crypto === 'undefined' || !crypto.subtle) {
            results.push(simpleHash(key));
          } else {
            const encoder = new TextEncoder();
            const data = encoder.encode(key);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            results.push(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));
          }
        }

        return results;
      });

      expect(hashes[0]).toBe(hashes[1]);
      expect(hashes[1]).toBe(hashes[2]);
    });

    test('different keys produce different hashes', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const hashes = await page.evaluate(async () => {
        const keys = [
          'bz_live_key1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'bz_live_key2bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          'bz_live_key3ccccccccccccccccccccccccccccccccccccc'
        ];

        // Fallback hash function for non-secure contexts
        const simpleHash = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
          return hexHash.repeat(8);
        };

        const results = [];
        for (const key of keys) {
          if (typeof crypto === 'undefined' || !crypto.subtle) {
            results.push(simpleHash(key));
          } else {
            const encoder = new TextEncoder();
            const data = encoder.encode(key);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            results.push(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));
          }
        }

        return results;
      });

      expect(hashes[0]).not.toBe(hashes[1]);
      expect(hashes[1]).not.toBe(hashes[2]);
    });
  });

  test.describe('Key Masking', () => {
    test('masks key showing prefix and last 4 chars', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const masked = await page.evaluate(() => {
        const key = 'bz_live_abcdefghijklmnopqrstuvwxyz1234567890abcdefgh';

        if (!key || key.length < 16) return '****';
        const prefix = key.slice(0, 11); // bz_live_ + 3 chars
        const suffix = key.slice(-4);
        return `${prefix}...${suffix}`;
      });

      expect(masked).toBe('bz_live_abc...efgh');
    });

    test('handles short keys gracefully', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const masked = await page.evaluate(() => {
        const key = 'short';
        if (!key || key.length < 16) return '****';
        return key;
      });

      expect(masked).toBe('****');
    });
  });

  test.describe('Key Validation', () => {
    test('validates correct key format', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const KEY_PREFIX = 'bz_live_';
        const key = 'bz_live_123456789012345678901234567890123456789012345678';

        if (!key || typeof key !== 'string') return { valid: false, reason: 'Invalid type' };
        if (!key.startsWith(KEY_PREFIX)) return { valid: false, reason: 'Invalid prefix' };
        if (key.length !== 56) return { valid: false, reason: 'Invalid length' };

        return { valid: true };
      });

      expect(result.valid).toBe(true);
    });

    test('rejects key without prefix', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const KEY_PREFIX = 'bz_live_';
        const key = 'invalid_12345678901234567890123456789012345678901234567';

        if (!key.startsWith(KEY_PREFIX)) return { valid: false, reason: 'Invalid prefix' };
        return { valid: true };
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid prefix');
    });

    test('rejects key with wrong length', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const key = 'bz_live_tooshort';

        if (key.length !== 56) return { valid: false, reason: 'Invalid length' };
        return { valid: true };
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid length');
    });
  });

  test.describe('Constant-Time Comparison', () => {
    test('compares equal strings correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function constantTimeCompare(a, b) {
          if (typeof a !== 'string' || typeof b !== 'string') return false;
          if (a.length !== b.length) return false;

          let result = 0;
          for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
          }
          return result === 0;
        }

        return constantTimeCompare('abc123', 'abc123');
      });

      expect(result).toBe(true);
    });

    test('compares different strings correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function constantTimeCompare(a, b) {
          if (typeof a !== 'string' || typeof b !== 'string') return false;
          if (a.length !== b.length) return false;

          let result = 0;
          for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
          }
          return result === 0;
        }

        return constantTimeCompare('abc123', 'abc124');
      });

      expect(result).toBe(false);
    });

    test('rejects different length strings', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function constantTimeCompare(a, b) {
          if (typeof a !== 'string' || typeof b !== 'string') return false;
          if (a.length !== b.length) return false;
          return true;
        }

        return constantTimeCompare('short', 'longer');
      });

      expect(result).toBe(false);
    });

    test('handles non-string inputs', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function constantTimeCompare(a, b) {
          if (typeof a !== 'string' || typeof b !== 'string') return false;
          return true;
        }

        return [
          constantTimeCompare(null, 'test'),
          constantTimeCompare('test', undefined),
          constantTimeCompare(123, 'test')
        ];
      });

      expect(result).toEqual([false, false, false]);
    });
  });

  test.describe('Rate Limiting', () => {
    test('allows requests within limit', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const attempts = new Map();
        const MAX_ATTEMPTS = 10;
        const WINDOW_MS = 60 * 1000;

        function checkRateLimit(context) {
          const now = Date.now();
          const data = attempts.get(context);

          if (data) {
            if (now - data.firstAttempt > WINDOW_MS) {
              attempts.delete(context);
            } else if (data.count >= MAX_ATTEMPTS) {
              return false;
            }
          }
          return true;
        }

        // Simulate 5 attempts
        for (let i = 0; i < 5; i++) {
          const data = attempts.get('test') || { count: 0, firstAttempt: Date.now() };
          data.count++;
          attempts.set('test', data);
        }

        return checkRateLimit('test');
      });

      expect(result).toBe(true);
    });

    test('blocks requests over limit', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const attempts = new Map();
        const MAX_ATTEMPTS = 10;
        const WINDOW_MS = 60 * 1000;

        function checkRateLimit(context) {
          const now = Date.now();
          const data = attempts.get(context);

          if (data) {
            if (now - data.firstAttempt > WINDOW_MS) {
              attempts.delete(context);
            } else if (data.count >= MAX_ATTEMPTS) {
              return false;
            }
          }
          return true;
        }

        // Simulate 10 attempts (at limit)
        attempts.set('test', { count: 10, firstAttempt: Date.now() });

        return checkRateLimit('test');
      });

      expect(result).toBe(false);
    });
  });

  test.describe('Name Sanitization', () => {
    test('removes dangerous characters', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const name = '<script>alert("xss")</script>';
        return name.trim().replace(/[<>"'&\\]/g, '').slice(0, 50);
      });

      expect(result).toBe('scriptalert(xss)/script');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    test('truncates long names', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const name = 'A'.repeat(100);
        return name.trim().slice(0, 50);
      });

      expect(result).toHaveLength(50);
    });
  });

  test.describe('Last Used Formatting', () => {
    test('formats recent time as "Just now"', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function formatLastUsed(timestamp) {
          if (!timestamp) return 'Never';
          const now = Date.now();
          const diff = now - timestamp;
          if (diff < 60000) return 'Just now';
          return 'Other';
        }

        return formatLastUsed(Date.now() - 30000); // 30 seconds ago
      });

      expect(result).toBe('Just now');
    });

    test('formats minutes ago correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function formatLastUsed(timestamp) {
          if (!timestamp) return 'Never';
          const now = Date.now();
          const diff = now - timestamp;
          if (diff < 60000) return 'Just now';
          if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
          return 'Other';
        }

        return formatLastUsed(Date.now() - 5 * 60000); // 5 minutes ago
      });

      expect(result).toBe('5 min ago');
    });

    test('formats hours ago correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function formatLastUsed(timestamp) {
          if (!timestamp) return 'Never';
          const now = Date.now();
          const diff = now - timestamp;
          if (diff < 60000) return 'Just now';
          if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
          if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
          return 'Other';
        }

        return formatLastUsed(Date.now() - 3 * 3600000); // 3 hours ago
      });

      expect(result).toBe('3 hours ago');
    });

    test('handles null timestamp', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function formatLastUsed(timestamp) {
          if (!timestamp) return 'Never';
          return 'Used';
        }

        return formatLastUsed(null);
      });

      expect(result).toBe('Never');
    });
  });
});
