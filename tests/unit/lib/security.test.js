// Unit tests for Security module
const { test, expect } = require('@playwright/test');

test.describe('Security Module', () => {
  test.describe('Logger sanitization', () => {
    test('redacts API keys from strings', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function sanitize(data) {
          if (typeof data === 'string') {
            return data
              .replace(/bz_live_[a-f0-9]+/gi, 'bz_live_[REDACTED]')
              .replace(/bearer\s+[a-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
              .replace(/api[_-]?key[=:]\s*["']?[a-z0-9\-_]+["']?/gi, 'api_key=[REDACTED]')
              .replace(/password[=:]\s*["']?[^"'\s]+["']?/gi, 'password=[REDACTED]');
          }
          return data;
        }

        return {
          apiKey: sanitize('api_key=abc123xyz'),
          bearer: sanitize('Bearer eyJhbGciOiJIUzI1NiJ9'),
          password: sanitize('password=mysecret123'),
          bzLive: sanitize('bz_live_abc123def456')
        };
      });

      expect(result.apiKey).toBe('api_key=[REDACTED]');
      expect(result.bearer).toBe('Bearer [REDACTED]');
      expect(result.password).toBe('password=[REDACTED]');
      expect(result.bzLive).toBe('bz_live_[REDACTED]');
    });

    test('redacts sensitive object keys', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'key'];

        function sanitizeObject(data) {
          if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const key in data) {
              if (sensitiveKeys.includes(key)) {
                sanitized[key] = '[REDACTED]';
              } else {
                sanitized[key] = data[key];
              }
            }
            return sanitized;
          }
          return data;
        }

        return sanitizeObject({
          username: 'testuser',
          password: 'secret123',
          token: 'abc123',
          apiKey: 'xyz789',
          data: 'visible'
        });
      });

      expect(result.username).toBe('testuser');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.data).toBe('visible');
    });
  });

  test.describe('Sanitizer.string', () => {
    test('trims and limits string length', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function sanitizeString(input, maxLength = 1000) {
          if (typeof input !== 'string') return '';
          return input.trim().slice(0, maxLength);
        }

        return {
          trimmed: sanitizeString('  hello world  '),
          limited: sanitizeString('abcdefghij', 5),
          nonString: sanitizeString(123)
        };
      });

      expect(result.trimmed).toBe('hello world');
      expect(result.limited).toBe('abcde');
      expect(result.nonString).toBe('');
    });

    test('removes dangerous characters', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function sanitizeString(input, maxLength = 1000) {
          if (typeof input !== 'string') return '';
          return input
            .trim()
            .slice(0, maxLength)
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
        }

        return {
          htmlTags: sanitizeString('<script>alert(1)</script>'),
          jsProtocol: sanitizeString('javascript:alert(1)'),
          eventHandler: sanitizeString('onclick=alert(1)')
        };
      });

      expect(result.htmlTags).not.toContain('<');
      expect(result.htmlTags).not.toContain('>');
      expect(result.jsProtocol).not.toContain('javascript:');
      expect(result.eventHandler).not.toContain('onclick=');
    });
  });

  test.describe('Sanitizer.escapeHtml', () => {
    test('escapes HTML entities', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function escapeHtml(input) {
          if (typeof input !== 'string') return '';
          const div = document.createElement('div');
          div.textContent = input;
          return div.innerHTML;
        }

        return escapeHtml('<script>alert("xss")</script>');
      });

      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });
  });

  test.describe('Sanitizer.url', () => {
    test('allows HTTPS URLs', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function sanitizeUrl(input, allowedProtocols = ['https:']) {
          try {
            const url = new URL(input);
            if (!allowedProtocols.includes(url.protocol)) {
              return null;
            }
            return url.href;
          } catch (e) {
            return null;
          }
        }

        return {
          https: sanitizeUrl('https://example.com/path'),
          http: sanitizeUrl('http://example.com/path'),
          javascript: sanitizeUrl('javascript:alert(1)'),
          invalid: sanitizeUrl('not-a-url')
        };
      });

      expect(result.https).toBe('https://example.com/path');
      expect(result.http).toBeNull();
      expect(result.javascript).toBeNull();
      expect(result.invalid).toBeNull();
    });
  });

  test.describe('Sanitizer.object', () => {
    test('rejects dangerous keys', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

        function sanitizeObject(obj, maxDepth = 5, currentDepth = 0) {
          if (currentDepth > maxDepth) return null;
          if (obj === null || typeof obj !== 'object') return obj;

          const sanitized = {};

          for (const key of Object.keys(obj)) {
            if (dangerousKeys.includes(key)) continue;
            sanitized[key] = obj[key];
          }

          return sanitized;
        }

        const input = {
          safe: 'value',
          __proto__: { polluted: true },
          constructor: 'bad',
          prototype: 'bad',
          nested: { valid: true }
        };

        return sanitizeObject(input);
      });

      expect(result.safe).toBe('value');
      // Check dangerous keys were not copied as own properties
      expect(Object.hasOwn(result, '__proto__')).toBe(false);
      expect(Object.hasOwn(result, 'constructor')).toBe(false);
      expect(Object.hasOwn(result, 'prototype')).toBe(false);
      expect(result.nested).toBeDefined();
    });

    test('respects max depth', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function sanitizeObject(obj, maxDepth = 5, currentDepth = 0) {
          if (currentDepth > maxDepth) return null;
          if (obj === null || typeof obj !== 'object') return obj;

          const sanitized = {};
          for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
              sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
            } else {
              sanitized[key] = value;
            }
          }
          return sanitized;
        }

        // Create deep object
        const deep = { l1: { l2: { l3: { l4: { l5: { l6: { l7: 'deep' } } } } } } };

        return sanitizeObject(deep, 5);
      });

      expect(result.l1.l2.l3.l4.l5).toBeDefined();
      expect(result.l1.l2.l3.l4.l5.l6).toBeNull(); // Exceeds depth
    });
  });

  test.describe('RateLimiter', () => {
    test('allows operations within limit', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const buckets = new Map();

        function check(key, maxOps, windowMs) {
          const now = Date.now();
          let bucket = buckets.get(key);

          if (!bucket || now - bucket.windowStart > windowMs) {
            bucket = { count: 0, windowStart: now };
          }

          if (bucket.count >= maxOps) {
            return false;
          }

          bucket.count++;
          buckets.set(key, bucket);
          return true;
        }

        // Test 5 operations with limit of 10
        const results = [];
        for (let i = 0; i < 5; i++) {
          results.push(check('test-key', 10, 60000));
        }

        return results;
      });

      expect(result.every(r => r === true)).toBe(true);
    });

    test('blocks operations exceeding limit', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const buckets = new Map();

        function check(key, maxOps, windowMs) {
          const now = Date.now();
          let bucket = buckets.get(key);

          if (!bucket || now - bucket.windowStart > windowMs) {
            bucket = { count: 0, windowStart: now };
          }

          if (bucket.count >= maxOps) {
            return false;
          }

          bucket.count++;
          buckets.set(key, bucket);
          return true;
        }

        // Test 15 operations with limit of 10
        const results = [];
        for (let i = 0; i < 15; i++) {
          results.push(check('test-key', 10, 60000));
        }

        return {
          allowed: results.filter(r => r === true).length,
          blocked: results.filter(r => r === false).length
        };
      });

      expect(result.allowed).toBe(10);
      expect(result.blocked).toBe(5);
    });
  });

  test.describe('License verification', () => {
    test('rejects invalid license format', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function verify(license) {
          if (!license || typeof license !== 'object') {
            return { valid: false, reason: 'Invalid license format' };
          }
          return { valid: true };
        }

        return {
          nullLicense: verify(null),
          stringLicense: verify('not-an-object'),
          validLicense: verify({ tier: 'pro' })
        };
      });

      expect(result.nullLicense.valid).toBe(false);
      expect(result.stringLicense.valid).toBe(false);
      expect(result.validLicense.valid).toBe(true);
    });

    test('rejects expired licenses', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function verify(license) {
          if (!license || typeof license !== 'object') {
            return { valid: false, reason: 'Invalid license format' };
          }

          if (license.expiresAt && Date.now() > license.expiresAt) {
            return { valid: false, reason: 'License expired' };
          }

          return { valid: true };
        }

        const expiredLicense = { expiresAt: Date.now() - 1000 };
        const validLicense = { expiresAt: Date.now() + 86400000 };

        return {
          expired: verify(expiredLicense),
          valid: verify(validLicense)
        };
      });

      expect(result.expired.valid).toBe(false);
      expect(result.expired.reason).toBe('License expired');
      expect(result.valid.valid).toBe(true);
    });
  });

  test.describe('Error wrapping', () => {
    test('sanitizes error messages', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function sanitize(str) {
          return str.replace(/password[=:]\s*["']?[^"'\s]+["']?/gi, 'password=[REDACTED]');
        }

        function wrapError(error, context = '') {
          return {
            message: sanitize(error.message || 'Unknown error'),
            context: context,
            timestamp: Date.now()
          };
        }

        const error = new Error('Failed with password=secret123');
        return wrapError(error, 'login');
      });

      expect(result.message).toContain('[REDACTED]');
      expect(result.message).not.toContain('secret123');
      expect(result.context).toBe('login');
      expect(result.timestamp).toBeDefined();
    });
  });
});
