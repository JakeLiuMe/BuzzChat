// BuzzChat - UI Components
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { StorageWriter } from './config.js';
import { state } from './state.js';
import { canSendMessage } from './rateLimit.js';
import { sendChatMessage } from './sender.js';
import { safeTrackAnalytics } from './analytics.js';

// Show status indicator on page (safe DOM construction - no innerHTML)
export function showStatusIndicator(isActive) {
  let indicator = document.getElementById('buzzchat-indicator');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'buzzchat-indicator';
    document.body.appendChild(indicator);
  }

  // Clear existing content safely
  while (indicator.firstChild) {
    indicator.removeChild(indicator.firstChild);
  }

  // Create inner container using safe DOM methods
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 8px 16px;
    background: ${isActive ? '#7c3aed' : '#6b7280'};
    color: white;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: all 0.2s;
  `;

  // Add pulse animation for active state
  if (!document.getElementById('buzzchat-pulse-animation')) {
    const pulseStyle = document.createElement('style');
    pulseStyle.id = 'buzzchat-pulse-animation';
    pulseStyle.textContent = `
      @keyframes buzzchat-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.2); }
      }
      .buzzchat-pulse {
        animation: buzzchat-pulse 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(pulseStyle);
  }

  // Create status dot
  const statusDot = document.createElement('span');
  statusDot.style.cssText = `
    width: 8px;
    height: 8px;
    background: ${state.settings?.masterEnabled ? '#10b981' : '#ef4444'};
    border-radius: 50%;
  `;
  // Add pulse animation when active
  if (state.settings?.masterEnabled) {
    statusDot.classList.add('buzzchat-pulse');
  }

  // Create text node (safe - no HTML parsing)
  const statusText = document.createTextNode(
    'BuzzChat ' + (state.settings?.masterEnabled ? 'Active' : 'Inactive')
  );

  container.appendChild(statusDot);
  container.appendChild(statusText);
  indicator.appendChild(container);

  container.addEventListener('click', () => {
    console.log('[BuzzChat] Click the extension icon to open settings');
  });
}

// Show notification
export function showNotification(message) {
  if (!state.settings?.settings?.soundNotifications) return;

  // Create toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: #1f2937;
    color: white;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    z-index: 10001;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  // Add animation keyframes
  if (!document.getElementById('buzzchat-animations')) {
    const style = document.createElement('style');
    style.id = 'buzzchat-animations';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Quick Reply Floating Bar
export function showQuickReplyBar() {
  if (!state.isLiveStream) return;

  const quickReply = state.settings?.quickReply;
  if (!quickReply?.enabled) {
    removeQuickReplyBar();
    return;
  }

  let bar = document.getElementById('buzzchat-quick-reply');

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'buzzchat-quick-reply';
    document.body.appendChild(bar);

    // Add styles
    if (!document.getElementById('buzzchat-quickreply-styles')) {
      const style = document.createElement('style');
      style.id = 'buzzchat-quickreply-styles';
      style.textContent = `
        #buzzchat-quick-reply {
          position: fixed;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 9999;
          transition: all 0.3s ease;
        }
        #buzzchat-quick-reply[data-position="bottom-right"] {
          bottom: 80px;
          right: 20px;
        }
        #buzzchat-quick-reply[data-position="bottom-left"] {
          bottom: 80px;
          left: 20px;
        }
        #buzzchat-quick-reply[data-position="top-right"] {
          top: 80px;
          right: 20px;
        }
        #buzzchat-quick-reply[data-position="top-left"] {
          top: 80px;
          left: 20px;
        }
        #buzzchat-quick-reply.minimized .quick-reply-buttons {
          display: none;
        }
        #buzzchat-quick-reply .quick-reply-toggle {
          align-self: flex-end;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #7c3aed;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          transition: all 0.2s;
        }
        #buzzchat-quick-reply .quick-reply-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
        }
        #buzzchat-quick-reply .quick-reply-buttons {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        #buzzchat-quick-reply .quick-reply-btn {
          padding: 10px 16px;
          background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
          transition: all 0.2s;
          white-space: nowrap;
        }
        #buzzchat-quick-reply .quick-reply-btn:hover {
          transform: translateX(-5px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        }
        #buzzchat-quick-reply .quick-reply-btn:active {
          transform: scale(0.95);
        }
        #buzzchat-quick-reply .quick-reply-btn.sending {
          opacity: 0.7;
          pointer-events: none;
        }
        #buzzchat-quick-reply .quick-reply-emoji {
          font-size: 16px;
        }
        #buzzchat-quick-reply .quick-reply-shortcut {
          font-size: 10px;
          background: rgba(255,255,255,0.2);
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: auto;
          font-weight: 600;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Set position from settings (default: bottom-right)
  const position = quickReply.position || 'bottom-right';
  bar.setAttribute('data-position', position);

  // Clear bar safely - remove all children to avoid memory leaks
  while (bar.firstChild) {
    bar.removeChild(bar.firstChild);
  }

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'quick-reply-toggle';
  toggleBtn.textContent = quickReply.minimized ? '💬' : '✕';
  toggleBtn.title = quickReply.minimized ? 'Show quick replies' : 'Hide quick replies';
  toggleBtn.dataset.action = 'toggle';
  bar.appendChild(toggleBtn);

  // Buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'quick-reply-buttons';

  const buttons = quickReply.buttons || [];
  buttons.forEach((btn, index) => {
    const button = document.createElement('button');
    button.className = 'quick-reply-btn';
    button.dataset.action = 'send';
    button.dataset.index = index;
    button.dataset.text = btn.text || '';

    if (btn.emoji) {
      const emoji = document.createElement('span');
      emoji.className = 'quick-reply-emoji';
      emoji.textContent = btn.emoji;
      button.appendChild(emoji);
    }

    const text = document.createTextNode(btn.text || '');
    button.appendChild(text);

    // Add keyboard shortcut hint (1-9)
    if (index < 9) {
      const shortcut = document.createElement('span');
      shortcut.className = 'quick-reply-shortcut';
      shortcut.textContent = String(index + 1);
      shortcut.title = `Press ${index + 1} to send`;
      button.appendChild(shortcut);
    }

    buttonsContainer.appendChild(button);
  });

  bar.appendChild(buttonsContainer);

  // Use event delegation to prevent memory leaks from individual event listeners
  if (!bar.dataset.delegated) {
    bar.dataset.delegated = 'true';
    bar.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      const action = target.dataset.action;

      if (action === 'toggle') {
        state.settings.quickReply.minimized = !state.settings.quickReply.minimized;
        bar.classList.toggle('minimized');
        target.textContent = state.settings.quickReply.minimized ? '💬' : '✕';
        target.title = state.settings.quickReply.minimized ? 'Show quick replies' : 'Hide quick replies';
        StorageWriter.queue('buzzchatSettings', state.settings);
      } else if (action === 'send') {
        if (target.classList.contains('sending')) return;
        target.classList.add('sending');

        const msgText = target.dataset.text;
        if (msgText && canSendMessage()) {
          const sent = sendChatMessage(msgText);
          if (sent) {
            safeTrackAnalytics('quickReply');
            showQuickReplyToast(msgText);
          }
        }

        setTimeout(() => {
          target.classList.remove('sending');
        }, 1000);
      }
    });

    // Keyboard shortcuts: Press 1-9 to trigger quick reply buttons
    document.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input/textarea or if quick reply is minimized
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (isTyping) return;

      // Check if quick reply is minimized
      if (state.settings?.quickReply?.minimized) return;

      // Check for number keys 1-9
      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= 9) {
        const buttons = state.settings?.quickReply?.buttons || [];
        const index = keyNum - 1;
        if (index < buttons.length) {
          e.preventDefault();
          const btn = bar.querySelector(`[data-index="${index}"]`);
          if (btn && !btn.classList.contains('sending')) {
            btn.click();
          }
        }
      }
    });
  }

  // Apply minimized state
  if (quickReply.minimized) {
    bar.classList.add('minimized');
  }
}

// Remove quick reply bar
export function removeQuickReplyBar() {
  const bar = document.getElementById('buzzchat-quick-reply');
  if (bar) {
    bar.remove();
  }
}

// Show mini toast for quick reply feedback
function showQuickReplyToast(message) {
  // Create compact toast for sent confirmation
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 140px;
    right: 20px;
    padding: 8px 14px;
    background: #10b981;
    color: white;
    border-radius: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    display: flex;
    align-items: center;
    gap: 6px;
    animation: slideIn 0.2s ease;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  // Checkmark icon
  const check = document.createElement('span');
  check.textContent = '✓';
  check.style.fontWeight = 'bold';

  // Truncated message preview
  const text = document.createElement('span');
  const truncated = message.length > 20 ? message.slice(0, 20) + '...' : message;
  text.textContent = truncated;

  toast.appendChild(check);
  toast.appendChild(text);
  document.body.appendChild(toast);

  // Remove after 1.5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 1500);
}
