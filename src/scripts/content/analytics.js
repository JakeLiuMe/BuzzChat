// BuzzChat - Analytics Tracking
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

// SECURITY: Safe analytics tracking wrapper
// Only uses Analytics if it's from trusted extension context
export function safeTrackAnalytics(type, metadata = {}) {
  // Verify Analytics module is from extension (has verification marker)
  if (typeof Analytics !== 'undefined' &&
      typeof Analytics.trackMessage === 'function' &&
      Analytics.__BUZZCHAT_VERIFIED === true) {
    try {
      // Sanitize type and metadata before passing
      const safeType = String(type).slice(0, 50);
      const safeMetadata = {};
      if (metadata && typeof metadata === 'object') {
        for (const [key, value] of Object.entries(metadata)) {
          if (typeof key === 'string' && key.length < 50) {
            safeMetadata[key] = typeof value === 'string' ? value.slice(0, 200) : value;
          }
        }
      }
      Analytics.trackMessage(safeType, safeMetadata);
    } catch (e) {
      console.warn('[BuzzChat] Analytics tracking failed:', e);
    }
  }
}
