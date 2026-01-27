// BuzzChat - Content Script Entry Point
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// This software is protected by copyright law and international treaties.
// Handles all chat automation on live selling platforms

(function() {
  'use strict';

  // Use security module if available
  const Security = typeof BuzzChatSecurity !== 'undefined' ? BuzzChatSecurity : null;

  // Verify security module integrity on load
  if (Security && !Security.isIntact()) {
    console.error('[BuzzChat] Security integrity check failed');
  }

  // Global error handler for uncaught errors
  window.addEventListener('error', function(event) {
    if (Security) {
      Security.wrapError(event.error || new Error(event.message), 'global');
    }
  });

  // Promise rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    if (Security) {
      Security.wrapError(event.reason || new Error('Unhandled rejection'), 'promise');
    }
  });

  // Import and start initialization
  // Note: In bundled version, these imports are resolved at build time
  import('./content/init.js').then(({ InitManager }) => {
    InitManager.start();
  }).catch(err => {
    console.error('[BuzzChat] Failed to load modules:', err);
  });

})();
