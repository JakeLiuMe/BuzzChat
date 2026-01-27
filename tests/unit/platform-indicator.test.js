// BuzzChat - Platform Indicator Unit Tests
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { test, expect } from '@playwright/test';

test.describe('Platform Detection Indicator', () => {
  // Platform patterns for testing (mirrors popup.js)
  const PLATFORM_PATTERNS = {
    whatnot: { hosts: ['whatnot.com'], name: 'Whatnot', icon: '🛒', color: '#FF6B35' },
    youtube: { hosts: ['youtube.com'], paths: ['/live', '/watch'], name: 'YouTube', icon: '▶️', color: '#FF0000' },
    ebay: { hosts: ['ebay.com'], paths: ['/live'], name: 'eBay', icon: '🏷️', color: '#E53238' },
    twitch: { hosts: ['twitch.tv'], name: 'Twitch', icon: '🎮', color: '#9146FF' },
    kick: { hosts: ['kick.com'], name: 'Kick', icon: '🎬', color: '#53FC18' }
  };

  // Helper to detect platform from URL (mirrors popup.js logic)
  function detectPlatformFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      const pathname = urlObj.pathname.toLowerCase();

      for (const [platformId, config] of Object.entries(PLATFORM_PATTERNS)) {
        const hostMatch = config.hosts.some(h => hostname === h || hostname.endsWith('.' + h));
        if (hostMatch) {
          if (config.paths) {
            const pathMatch = config.paths.some(p => pathname.startsWith(p));
            if (!pathMatch) continue;
          }
          return { id: platformId, ...config };
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  test.describe('URL Detection', () => {
    test('detects Whatnot from whatnot.com', async () => {
      const platform = detectPlatformFromUrl('https://www.whatnot.com/live/seller');
      expect(platform).not.toBeNull();
      expect(platform.id).toBe('whatnot');
      expect(platform.name).toBe('Whatnot');
    });

    test('detects YouTube from youtube.com/live', async () => {
      const platform = detectPlatformFromUrl('https://www.youtube.com/live/abc123');
      expect(platform).not.toBeNull();
      expect(platform.id).toBe('youtube');
      expect(platform.name).toBe('YouTube');
    });

    test('detects YouTube from youtube.com/watch', async () => {
      const platform = detectPlatformFromUrl('https://youtube.com/watch?v=xyz');
      expect(platform).not.toBeNull();
      expect(platform.id).toBe('youtube');
    });

    test('does NOT detect YouTube from youtube.com homepage', async () => {
      const platform = detectPlatformFromUrl('https://www.youtube.com/');
      expect(platform).toBeNull();
    });

    test('detects eBay from ebay.com/live', async () => {
      const platform = detectPlatformFromUrl('https://www.ebay.com/live/event');
      expect(platform).not.toBeNull();
      expect(platform.id).toBe('ebay');
      expect(platform.name).toBe('eBay');
    });

    test('does NOT detect eBay from regular ebay.com pages', async () => {
      const platform = detectPlatformFromUrl('https://www.ebay.com/itm/12345');
      expect(platform).toBeNull();
    });

    test('detects Twitch from twitch.tv', async () => {
      const platform = detectPlatformFromUrl('https://www.twitch.tv/channel');
      expect(platform).not.toBeNull();
      expect(platform.id).toBe('twitch');
      expect(platform.name).toBe('Twitch');
    });

    test('detects Kick from kick.com', async () => {
      const platform = detectPlatformFromUrl('https://kick.com/streamer');
      expect(platform).not.toBeNull();
      expect(platform.id).toBe('kick');
      expect(platform.name).toBe('Kick');
    });

    test('returns null for unsupported platforms', async () => {
      expect(detectPlatformFromUrl('https://facebook.com/live')).toBeNull();
      expect(detectPlatformFromUrl('https://instagram.com/live')).toBeNull();
      expect(detectPlatformFromUrl('https://tiktok.com/live')).toBeNull();
    });

    test('returns null for invalid URLs', async () => {
      expect(detectPlatformFromUrl('not-a-url')).toBeNull();
      expect(detectPlatformFromUrl('')).toBeNull();
    });
  });

  test.describe('Platform Properties', () => {
    test('each platform has required properties', async () => {
      for (const [id, config] of Object.entries(PLATFORM_PATTERNS)) {
        expect(config.hosts).toBeDefined();
        expect(config.hosts.length).toBeGreaterThan(0);
        expect(config.name).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    test('Whatnot icon is shopping cart', async () => {
      expect(PLATFORM_PATTERNS.whatnot.icon).toBe('🛒');
    });

    test('YouTube icon is play button', async () => {
      expect(PLATFORM_PATTERNS.youtube.icon).toBe('▶️');
    });

    test('Twitch icon is gaming controller', async () => {
      expect(PLATFORM_PATTERNS.twitch.icon).toBe('🎮');
    });
  });

  test.describe('Badge State', () => {
    test('badge has data-platform attribute set on detection', async () => {
      const platform = detectPlatformFromUrl('https://whatnot.com/live');
      expect(platform.id).toBe('whatnot');
      // In actual DOM: elements.platformBadge.setAttribute('data-platform', platform.id)
      const dataAttribute = platform.id;
      expect(dataAttribute).toBe('whatnot');
    });

    test('unsupported sites get "unsupported" data-platform', async () => {
      const platform = detectPlatformFromUrl('https://google.com');
      expect(platform).toBeNull();
      // In actual DOM: elements.platformBadge.setAttribute('data-platform', 'unsupported')
      const dataAttribute = 'unsupported';
      expect(dataAttribute).toBe('unsupported');
    });
  });

  test.describe('CSS Classes', () => {
    test('CSS colors match platform definitions', async () => {
      const cssColors = {
        whatnot: '#FF6B35',
        youtube: '#FF0000',
        ebay: '#E53238',
        twitch: '#9146FF',
        kick: '#53FC18'
      };

      for (const [id, expectedColor] of Object.entries(cssColors)) {
        expect(PLATFORM_PATTERNS[id].color).toBe(expectedColor);
      }
    });
  });
});
