// BuzzChat - UI Polish & Micro-interactions
// Making every interaction feel intentional and delightful

import { browserAPI } from '../core/config.js';

// =============================================================================
// LOADING STATES
// =============================================================================

/**
 * Show loading skeleton for an element
 */
export function showSkeleton(element, lines = 3) {
  if (!element) return;
  
  element.dataset.originalContent = element.innerHTML;
  element.classList.add('skeleton-loading');
  
  let skeletonHTML = '';
  for (let i = 0; i < lines; i++) {
    const width = 60 + Math.random() * 40; // 60-100%
    skeletonHTML += `<div class="skeleton-line" style="width: ${width}%"></div>`;
  }
  
  element.innerHTML = skeletonHTML;
}

/**
 * Hide loading skeleton and restore content
 */
export function hideSkeleton(element) {
  if (!element || !element.dataset.originalContent) return;
  
  element.classList.remove('skeleton-loading');
  element.innerHTML = element.dataset.originalContent;
  delete element.dataset.originalContent;
}

/**
 * Show button loading state
 */
export function setButtonLoading(button, loading = true) {
  if (!button) return;
  
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.classList.add('btn-loading');
    button.innerHTML = `<span class="spinner"></span> Loading...`;
  } else {
    button.disabled = false;
    button.classList.remove('btn-loading');
    button.textContent = button.dataset.originalText || 'Done';
    delete button.dataset.originalText;
  }
}

/**
 * Show inline loading indicator
 */
export function showInlineLoader(container, message = 'Loading...') {
  if (!container) return;
  
  const loader = document.createElement('div');
  loader.className = 'inline-loader';
  loader.innerHTML = `
    <span class="spinner-small"></span>
    <span class="loader-text">${message}</span>
  `;
  container.appendChild(loader);
  return loader;
}

// =============================================================================
// EMPTY STATES
// =============================================================================

const EMPTY_STATES = {
  inventory: {
    icon: '📦',
    title: 'No products yet!',
    subtitle: 'Add your first item to start tracking',
    tip: '💡 Quick add: "Jordan 4, $180, 3"',
    action: { text: '+ Add Product', id: 'inventoryQuickAddBtn' }
  },
  faq: {
    icon: '💬',
    title: 'No FAQ rules yet!',
    subtitle: 'Auto-reply to common questions',
    tip: '💡 Try: "shipping, ship" → "We ship worldwide!"',
    action: { text: '+ Add FAQ Rule', id: 'addFaqBtn' }
  },
  giveaway: {
    icon: '🎁',
    title: 'No entries yet!',
    subtitle: 'Viewers can enter by commenting',
    tip: '💡 Set a keyword like "enter" or "giveaway"',
    action: null
  },
  analytics: {
    icon: '📊',
    title: 'No data yet!',
    subtitle: 'Start streaming to see your stats',
    tip: '💡 Analytics update in real-time during streams',
    action: null
  },
  buyers: {
    icon: '👥',
    title: 'No buyer data yet!',
    subtitle: 'We\'ll track customers as they interact',
    tip: '💡 VIPs are auto-tagged after 3+ purchases',
    action: null
  },
  timers: {
    icon: '⏰',
    title: 'No timer messages!',
    subtitle: 'Send messages automatically during streams',
    tip: '💡 Great for reminders: "Follow for more drops!"',
    action: { text: '+ Add Timer', id: 'addTimerBtn' }
  },
  templates: {
    icon: '📝',
    title: 'No templates yet!',
    subtitle: 'Save messages for quick access',
    tip: '💡 Perfect for shipping info, payment details',
    action: { text: '+ Add Template', id: 'addTemplateBtn' }
  },
  alerts: {
    icon: '✨',
    title: 'All clear!',
    subtitle: 'No alerts right now',
    tip: '💡 We\'ll notify you of important events',
    action: null
  }
};

/**
 * Create a beautiful empty state
 */
export function createEmptyState(type, customOptions = {}) {
  const config = { ...EMPTY_STATES[type], ...customOptions };
  if (!config) return null;
  
  const element = document.createElement('div');
  element.className = 'empty-state';
  element.innerHTML = `
    <div class="empty-state-icon">${config.icon}</div>
    <h3 class="empty-state-title">${config.title}</h3>
    <p class="empty-state-subtitle">${config.subtitle}</p>
    ${config.tip ? `<p class="empty-state-tip">${config.tip}</p>` : ''}
    ${config.action ? `
      <button class="btn btn-primary empty-state-action" data-target="${config.action.id}">
        ${config.action.text}
      </button>
    ` : ''}
  `;
  
  // Wire up action button
  const actionBtn = element.querySelector('.empty-state-action');
  if (actionBtn) {
    actionBtn.addEventListener('click', () => {
      const target = document.getElementById(actionBtn.dataset.target);
      if (target) target.click();
    });
  }
  
  return element;
}

/**
 * Show empty state in a container
 */
export function showEmptyState(container, type, options = {}) {
  if (!container) return;
  
  container.innerHTML = '';
  const emptyState = createEmptyState(type, options);
  if (emptyState) {
    container.appendChild(emptyState);
  }
}

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

const SHORTCUTS = {
  '1-9': 'Quick reply buttons',
  'Alt+S': 'Save current session',
  'Alt+N': 'New product',
  'Alt+D': 'Toggle demo mode',
  'Esc': 'Close modal',
  '?': 'Show shortcuts'
};

/**
 * Show keyboard shortcuts modal
 */
export function showShortcutsModal() {
  const modal = document.createElement('div');
  modal.className = 'shortcuts-modal';
  modal.innerHTML = `
    <div class="shortcuts-backdrop"></div>
    <div class="shortcuts-content">
      <h2>⌨️ Keyboard Shortcuts</h2>
      <div class="shortcuts-list">
        ${Object.entries(SHORTCUTS).map(([key, desc]) => `
          <div class="shortcut-item">
            <kbd>${key}</kbd>
            <span>${desc}</span>
          </div>
        `).join('')}
      </div>
      <p class="shortcuts-tip">Press <kbd>?</kbd> anytime to see this</p>
      <button class="btn btn-primary shortcuts-close">Got it!</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const close = () => modal.remove();
  modal.querySelector('.shortcuts-backdrop').addEventListener('click', close);
  modal.querySelector('.shortcuts-close').addEventListener('click', close);
  
  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Add shortcut hint to an element
 */
export function addShortcutHint(element, shortcut) {
  if (!element) return;
  
  const hint = document.createElement('span');
  hint.className = 'shortcut-hint';
  hint.innerHTML = `<kbd>${shortcut}</kbd>`;
  element.appendChild(hint);
}

// =============================================================================
// ERROR MESSAGES (Human-Friendly)
// =============================================================================

const ERROR_MESSAGES = {
  'rate_limited': {
    title: 'Slow down! 🐢',
    message: 'Too many requests. Take a breath and try again in a moment.',
    action: 'Got it'
  },
  'daily_limit': {
    title: 'Daily limit reached 📊',
    message: 'You\'ve used all your AI responses for today. Resets at midnight!',
    action: 'Upgrade for more',
    upgrade: true
  },
  'network_error': {
    title: 'Connection issue 📡',
    message: 'Couldn\'t reach the server. Check your internet and try again.',
    action: 'Retry'
  },
  'api_error': {
    title: 'Something went wrong 😅',
    message: 'Our AI had a hiccup. Don\'t worry, your data is safe!',
    action: 'Try again'
  },
  'invalid_input': {
    title: 'Oops! Check your input 📝',
    message: 'Something doesn\'t look right. Double-check and try again.',
    action: 'Fix it'
  },
  'permission_denied': {
    title: 'Permission needed 🔐',
    message: 'BuzzChat needs access to work on this page.',
    action: 'Grant access'
  },
  'not_on_stream': {
    title: 'No stream detected 📺',
    message: 'Navigate to a supported streaming platform to use BuzzChat.',
    action: 'See supported sites'
  }
};

/**
 * Show friendly error message
 */
export function showFriendlyError(errorType, onAction = null) {
  const config = ERROR_MESSAGES[errorType] || ERROR_MESSAGES['api_error'];
  
  const modal = document.createElement('div');
  modal.className = 'error-modal';
  modal.innerHTML = `
    <div class="error-backdrop"></div>
    <div class="error-content">
      <div class="error-icon">😅</div>
      <h3 class="error-title">${config.title}</h3>
      <p class="error-message">${config.message}</p>
      <div class="error-actions">
        <button class="btn ${config.upgrade ? 'btn-primary' : 'btn-secondary'} error-action">
          ${config.action}
        </button>
        ${config.upgrade ? '' : '<button class="btn btn-ghost error-dismiss">Dismiss</button>'}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const close = () => modal.remove();
  
  modal.querySelector('.error-backdrop')?.addEventListener('click', close);
  modal.querySelector('.error-dismiss')?.addEventListener('click', close);
  modal.querySelector('.error-action')?.addEventListener('click', () => {
    close();
    if (onAction) onAction();
  });
}

/**
 * Convert technical error to friendly message
 */
export function humanizeError(error) {
  const errorString = String(error).toLowerCase();
  
  if (errorString.includes('429') || errorString.includes('rate')) {
    return 'rate_limited';
  }
  if (errorString.includes('network') || errorString.includes('fetch')) {
    return 'network_error';
  }
  if (errorString.includes('401') || errorString.includes('403')) {
    return 'permission_denied';
  }
  if (errorString.includes('daily') || errorString.includes('limit')) {
    return 'daily_limit';
  }
  
  return 'api_error';
}

// =============================================================================
// CONFIRMATION DIALOGS
// =============================================================================

/**
 * Show confirmation dialog with undo option
 */
export function confirmAction(options) {
  return new Promise((resolve) => {
    const {
      title = 'Are you sure?',
      message = 'This action cannot be undone.',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      danger = false,
      undoTime = 0 // seconds, 0 = no undo
    } = options;
    
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-backdrop"></div>
      <div class="confirm-content">
        <h3 class="confirm-title">${title}</h3>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary confirm-cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} confirm-ok">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const close = (result) => {
      modal.remove();
      resolve(result);
    };
    
    modal.querySelector('.confirm-backdrop').addEventListener('click', () => close(false));
    modal.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
    modal.querySelector('.confirm-ok').addEventListener('click', () => close(true));
  });
}

/**
 * Show undo toast after action
 */
export function showUndoToast(message, onUndo, duration = 5000) {
  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.innerHTML = `
    <span class="undo-message">${message}</span>
    <button class="undo-btn">Undo</button>
    <div class="undo-progress"></div>
  `;
  
  document.body.appendChild(toast);
  
  // Progress animation
  const progress = toast.querySelector('.undo-progress');
  progress.style.animation = `undo-countdown ${duration}ms linear forwards`;
  
  let undone = false;
  
  toast.querySelector('.undo-btn').addEventListener('click', () => {
    undone = true;
    toast.remove();
    if (onUndo) onUndo();
  });
  
  setTimeout(() => {
    if (!undone) toast.remove();
  }, duration);
}

// =============================================================================
// INIT STYLES
// =============================================================================

export function initPolishStyles() {
  if (document.getElementById('buzzchat-polish-css')) return;
  
  const style = document.createElement('style');
  style.id = 'buzzchat-polish-css';
  style.textContent = `
    /* Skeleton Loading */
    .skeleton-loading { opacity: 0.7; }
    .skeleton-line {
      height: 12px;
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    /* Spinner */
    .spinner, .spinner-small {
      display: inline-block;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner { width: 16px; height: 16px; }
    .spinner-small { width: 12px; height: 12px; border-width: 1.5px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Inline Loader */
    .inline-loader {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      color: #6b7280;
      font-size: 13px;
    }
    
    /* Empty States */
    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: #6b7280;
    }
    .empty-state-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-state-title { 
      font-size: 16px; 
      font-weight: 600; 
      color: #374151;
      margin-bottom: 4px;
    }
    .empty-state-subtitle { font-size: 13px; margin-bottom: 8px; }
    .empty-state-tip {
      font-size: 12px;
      background: #f3f4f6;
      padding: 8px 12px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 16px;
    }
    
    /* Shortcuts */
    .shortcuts-modal, .error-modal, .confirm-modal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .shortcuts-backdrop, .error-backdrop, .confirm-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(2px);
    }
    .shortcuts-content, .error-content, .confirm-content {
      position: relative;
      background: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 360px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2);
    }
    .shortcut-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .shortcut-item:last-child { border-bottom: none; }
    kbd {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .shortcut-hint {
      margin-left: 8px;
      opacity: 0.5;
    }
    
    /* Undo Toast */
    .undo-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 10000;
      overflow: hidden;
    }
    .undo-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
    .undo-btn:hover { background: rgba(255,255,255,0.3); }
    .undo-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: #4ade80;
      width: 100%;
    }
    @keyframes undo-countdown {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    /* Dark Mode */
    [data-theme="dark"] .empty-state-title { color: #f9fafb; }
    [data-theme="dark"] .empty-state-tip { background: #374151; }
    [data-theme="dark"] .shortcuts-content,
    [data-theme="dark"] .error-content,
    [data-theme="dark"] .confirm-content { background: #1f2937; color: #f9fafb; }
    [data-theme="dark"] kbd { background: #374151; }
    [data-theme="dark"] .skeleton-line {
      background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
      background-size: 200% 100%;
    }
  `;
  
  document.head.appendChild(style);
}

// Auto-init
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPolishStyles);
  } else {
    initPolishStyles();
  }
}

export default {
  showSkeleton,
  hideSkeleton,
  setButtonLoading,
  showInlineLoader,
  createEmptyState,
  showEmptyState,
  showShortcutsModal,
  addShortcutHint,
  showFriendlyError,
  humanizeError,
  confirmAction,
  showUndoToast,
  initPolishStyles,
  SHORTCUTS,
  EMPTY_STATES
};
