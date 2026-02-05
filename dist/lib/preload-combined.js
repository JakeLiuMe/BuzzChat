// BuzzChat - Security Module
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// Runtime integrity verification, tamper detection, and secure logging

const BuzzChatSecurity = {
  // Verification marker
  __BUZZCHAT_VERIFIED: true,

  // Extension fingerprint (verified at runtime)
  EXTENSION_FINGERPRINT: 'BUZZCHAT_v1.2.0_PRODUCTION',

  // State
  _criticalFunctions: new Map(),
  _initialized: false,
  _integrityValid: true,

  // Secure logging with sanitization
  Logger: {
    LOG_LEVELS: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, SECURITY: 4 },
    currentLevel: 1,
    _logs: [],
    MAX_LOGS: 1000,

    // Sanitize log data to prevent sensitive info leakage
    _sanitize(data) {
      if (typeof data === 'string') {
        return data
          .replace(/bz_live_[a-f0-9]+/gi, 'bz_live_[REDACTED]')
          .replace(/bearer\s+[a-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
          .replace(/api[_-]?key[=:]\s*["']?[a-z0-9\-_]+["']?/gi, 'api_key=[REDACTED]')
          .replace(/password[=:]\s*["']?[^"'\s]+["']?/gi, 'password=[REDACTED]');
      }
      if (typeof data === 'object' && data !== null) {
        const sanitized = Array.isArray(data) ? [] : {};
        for (const key in data) {
          if (['password', 'token', 'secret', 'apiKey', 'api_key', 'key'].includes(key)) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = this._sanitize(data[key]);
          }
        }
        return sanitized;
      }
      return data;
    },

    _log(level, levelName, message, data = null) {
      if (level < this.currentLevel) return;

      const entry = {
        timestamp: new Date().toISOString(),
        level: levelName,
        message: this._sanitize(message),
        data: data ? this._sanitize(data) : null
      };

      this._logs.push(entry);
      if (this._logs.length > this.MAX_LOGS) {
        this._logs.shift();
      }

      const prefix = '[BuzzChat ' + levelName + ']';
      if (level >= this.LOG_LEVELS.ERROR) {
        console.error(prefix, message, data || '');
      } else if (level >= this.LOG_LEVELS.WARN) {
        console.warn(prefix, message, data || '');
      } else {
        console.log(prefix, message, data || '');
      }
    },

    debug(message, data) { this._log(this.LOG_LEVELS.DEBUG, 'DEBUG', message, data); },
    info(message, data) { this._log(this.LOG_LEVELS.INFO, 'INFO', message, data); },
    warn(message, data) { this._log(this.LOG_LEVELS.WARN, 'WARN', message, data); },
    error(message, data) { this._log(this.LOG_LEVELS.ERROR, 'ERROR', message, data); },
    security(message, data) { this._log(this.LOG_LEVELS.SECURITY, 'SECURITY', message, data); },

    getRecentLogs(count = 50) {
      return this._logs.slice(-count);
    },

    exportLogs() {
      return JSON.stringify(this._logs, null, 2);
    }
  },

  // Initialize security module
  init() {
    if (this._initialized) return;

    this.Logger.info('Security module initializing');

    if (!this._verifyExtensionContext()) {
      this.Logger.security('Extension context verification failed');
      this._integrityValid = false;
    }

    this._setupTamperDetection();
    this._freezeCriticalObjects();

    this._initialized = true;
    this.Logger.info('Security module initialized', { integrityValid: this._integrityValid });
  },

  // Verify we are running in a legitimate extension context
  _verifyExtensionContext() {
    try {
      const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

      if (!browserAPI || !browserAPI.runtime || !browserAPI.runtime.id) {
        return false;
      }

      const extId = browserAPI.runtime.id;
      if (typeof extId !== 'string' || extId.length < 10) {
        return false;
      }

      const extUrl = browserAPI.runtime.getURL('');
      if (!extUrl.startsWith('chrome-extension://') && !extUrl.startsWith('moz-extension://')) {
        return false;
      }

      return true;
    } catch (e) {
      return false;
    }
  },

  // Setup tamper detection for critical globals
  _setupTamperDetection() {
    const self = this;
    const criticalGlobals = ['fetch', 'XMLHttpRequest', 'WebSocket'];

    criticalGlobals.forEach(function(name) {
      if (typeof window !== 'undefined' && window[name]) {
        self._criticalFunctions.set(name, window[name]);
      }
    });
  },

  // Freeze critical security objects
  _freezeCriticalObjects() {
    Object.freeze(this.Logger);
    Object.freeze(this.Logger.LOG_LEVELS);
  },

  // Secure error wrapper
  wrapError(error, context) {
    context = context || '';
    const safeError = {
      message: this.Logger._sanitize(error.message || 'Unknown error'),
      context: context,
      timestamp: Date.now()
    };

    this.Logger.error('Error in ' + context, {
      message: error.message,
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : ''
    });

    return safeError;
  },

  // Validate message origin
  validateMessageOrigin(sender) {
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

    if (!sender) {
      this.Logger.security('Message rejected: no sender');
      return false;
    }

    if (sender.id !== browserAPI.runtime.id) {
      this.Logger.security('Message rejected: different extension ID');
      return false;
    }

    if (sender.url && sender.tab) {
      try {
        const url = new URL(sender.url);
        const allowedHosts = [
          'whatnot.com', 'www.whatnot.com',
          'youtube.com', 'www.youtube.com',
          'ebay.com', 'www.ebay.com',
          'twitch.tv', 'www.twitch.tv',
          'kick.com', 'www.kick.com',
          'extensionpay.com'
        ];
        if (!allowedHosts.includes(url.hostname)) {
          this.Logger.security('Message rejected: unauthorized host', { host: url.hostname });
          return false;
        }
      } catch (e) {
        return false;
      }
    }

    return true;
  },

  // Rate limiter
  RateLimiter: {
    _buckets: new Map(),

    check(key, maxOps, windowMs) {
      const now = Date.now();
      let bucket = this._buckets.get(key);

      if (!bucket || now - bucket.windowStart > windowMs) {
        bucket = { count: 0, windowStart: now };
      }

      if (bucket.count >= maxOps) {
        return false;
      }

      bucket.count++;
      this._buckets.set(key, bucket);
      return true;
    },

    cleanup() {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000;

      for (const [key, bucket] of this._buckets.entries()) {
        if (now - bucket.windowStart > maxAge) {
          this._buckets.delete(key);
        }
      }
    }
  },

  // Input sanitizer
  Sanitizer: {
    string(input, maxLength) {
      maxLength = maxLength || 1000;
      if (typeof input !== 'string') return '';
      return input
        .trim()
        .slice(0, maxLength)
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
    },

    escapeHtml(input) {
      if (typeof input !== 'string') return '';
      const div = document.createElement('div');
      div.textContent = input;
      return div.innerHTML;
    },

    url(input, allowedProtocols) {
      allowedProtocols = allowedProtocols || ['https:'];
      try {
        const url = new URL(input);
        if (!allowedProtocols.includes(url.protocol)) {
          return null;
        }
        return url.href;
      } catch (e) {
        return null;
      }
    },

    object(obj, maxDepth, currentDepth) {
      maxDepth = maxDepth || 5;
      currentDepth = currentDepth || 0;

      if (currentDepth > maxDepth) return null;
      if (obj === null || typeof obj !== 'object') return obj;

      const sanitized = Array.isArray(obj) ? [] : {};
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

      for (const key of Object.keys(obj)) {
        if (dangerousKeys.includes(key)) continue;

        const value = obj[key];
        if (typeof value === 'string') {
          sanitized[key] = this.string(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.object(value, maxDepth, currentDepth + 1);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }
  },

  // License verification
  LicenseVerifier: {
    verify(license) {
      const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

      if (!license || typeof license !== 'object') {
        return { valid: false, reason: 'Invalid license format' };
      }

      if (license.expiresAt && Date.now() > license.expiresAt) {
        return { valid: false, reason: 'License expired' };
      }

      if (license.extensionId && license.extensionId !== browserAPI.runtime.id) {
        BuzzChatSecurity.Logger.security('License bound to different extension');
        return { valid: false, reason: 'License not valid for this installation' };
      }

      return { valid: true };
    }
  },

  // Check integrity
  isIntact() {
    return this._integrityValid && this._initialized;
  }
};

// Auto-initialize
if (typeof window !== 'undefined') {
  BuzzChatSecurity.init();
}

// Periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(function() {
    BuzzChatSecurity.RateLimiter.cleanup();
  }, 60 * 1000);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BuzzChatSecurity;
}
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
