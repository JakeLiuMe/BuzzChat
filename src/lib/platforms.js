// BuzzChat - Platform Detection System
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

/**
 * Platform Manager - Global object for platform detection
 * Loaded as content script, exposes global functions
 */
const BuzzChatPlatform = (function() {
  'use strict';

  /**
   * Platform Registry
   * Defines supported live selling platforms with detection patterns and features
   */
  const PLATFORMS = {
    whatnot: {
      id: 'whatnot',
      name: 'Whatnot',
      hostPatterns: ['whatnot.com', 'www.whatnot.com'],
      pathPatterns: null, // All pages on whatnot.com
      features: ['chat', 'giveaway', 'moderation', 'welcome', 'faq', 'timer', 'commands'],
      color: '#FF6B35'
    },
    youtube: {
      id: 'youtube',
      name: 'YouTube Live',
      hostPatterns: ['youtube.com', 'www.youtube.com'],
      pathPatterns: ['/live', '/watch'], // Live streams and videos with live chat
      features: ['chat', 'moderation', 'welcome', 'faq', 'commands'],
      color: '#FF0000'
    },
    ebay: {
      id: 'ebay',
      name: 'eBay Live',
      hostPatterns: ['ebay.com', 'www.ebay.com'],
      pathPatterns: ['/live'],
      features: ['chat', 'welcome', 'faq'],
      color: '#E53238'
    },
    twitch: {
      id: 'twitch',
      name: 'Twitch',
      hostPatterns: ['twitch.tv', 'www.twitch.tv'],
      pathPatterns: null, // Channel pages are streams
      features: ['chat', 'moderation', 'welcome', 'faq', 'timer', 'commands'],
      color: '#9146FF'
    },
    kick: {
      id: 'kick',
      name: 'Kick',
      hostPatterns: ['kick.com', 'www.kick.com'],
      pathPatterns: null, // Channel pages are streams
      features: ['chat', 'welcome', 'faq', 'commands'],
      color: '#53FC18'
    }
  };

  /**
   * Check if hostname matches any of the patterns
   */
  function matchesHost(hostname, patterns) {
    const normalizedHost = hostname.toLowerCase();
    return patterns.some(function(pattern) {
      const normalizedPattern = pattern.toLowerCase();
      // Exact match or subdomain match
      return normalizedHost === normalizedPattern ||
             normalizedHost.endsWith('.' + normalizedPattern);
    });
  }

  /**
   * Check if pathname matches any of the path patterns
   */
  function matchesPath(pathname, patterns) {
    if (!patterns) return true; // No path restriction
    const normalizedPath = pathname.toLowerCase();
    return patterns.some(function(pattern) {
      return normalizedPath.startsWith(pattern.toLowerCase());
    });
  }

  /**
   * Detect which platform the current page belongs to
   * @returns {Object|null} Platform object with id, name, features, or null if unsupported
   */
  function detectPlatform() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    for (const platformId in PLATFORMS) {
      const platform = PLATFORMS[platformId];
      if (matchesHost(hostname, platform.hostPatterns)) {
        if (matchesPath(pathname, platform.pathPatterns)) {
          return Object.assign({}, platform, {
            detected: true,
            url: window.location.href
          });
        }
      }
    }

    return null;
  }

  /**
   * Check if a specific feature is supported on the current platform
   */
  function isFeatureSupported(featureName, platform) {
    const currentPlatform = platform || detectPlatform();
    if (!currentPlatform) return false;
    return currentPlatform.features.indexOf(featureName) !== -1;
  }

  /**
   * Get all supported platforms for display
   */
  function getSupportedPlatforms() {
    return Object.keys(PLATFORMS).map(function(key) {
      const p = PLATFORMS[key];
      return {
        id: p.id,
        name: p.name,
        color: p.color
      };
    });
  }

  /**
   * Get platform by ID
   */
  function getPlatformById(platformId) {
    return PLATFORMS[platformId] || null;
  }

  // Expose public API
  return {
    // Verification marker
    __BUZZCHAT_VERIFIED: true,

    // Platform data
    PLATFORMS: PLATFORMS,

    // Functions
    detectPlatform: detectPlatform,
    isFeatureSupported: isFeatureSupported,
    getSupportedPlatforms: getSupportedPlatforms,
    getPlatformById: getPlatformById
  };
})();

// Also expose as individual global functions for convenience (using window for true globals)
// eslint-disable-next-line no-undef
if (typeof window !== 'undefined') {
  window.detectPlatform = BuzzChatPlatform.detectPlatform;
  window.isFeatureSupported = BuzzChatPlatform.isFeatureSupported;
  window.PLATFORMS = BuzzChatPlatform.PLATFORMS;
}
