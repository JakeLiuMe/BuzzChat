// BuzzChat - Contextual Help System
// Smart tips that appear at the right time

import { browserAPI } from '../core/config.js';

const HELP_STORAGE_KEY = 'buzzchatHelpDismissed';

// Help tips with context
const HELP_TIPS = {
  // First-time tips
  first_faq: {
    id: 'first_faq',
    title: '💡 Pro Tip: FAQ Rules',
    content: 'Add keywords like "shipping, ship, deliver" and BuzzChat will auto-reply when viewers ask about shipping!',
    showOnce: true,
    trigger: 'faq_tab_first'
  },
  first_inventory: {
    id: 'first_inventory',
    title: '💡 Quick Add Products',
    content: 'Type "Jordan 4, $180, 3" to instantly add a product. Name, price, quantity - that\'s it!',
    showOnce: true,
    trigger: 'inventory_tab_first'
  },
  first_giveaway: {
    id: 'first_giveaway',
    title: '💡 Running Giveaways',
    content: 'Set a keyword (like "enter" or "giveaway"), viewers comment it, and you pick a random winner!',
    showOnce: true,
    trigger: 'giveaway_tab_first'
  },
  first_dashboard: {
    id: 'first_dashboard',
    title: '📊 Your Live Dashboard',
    content: 'This shows real-time stats during your stream. Hot items, engagement, alerts - all at a glance!',
    showOnce: true,
    trigger: 'dashboard_view'
  },
  
  // Contextual tips
  low_engagement: {
    id: 'low_engagement',
    title: '💬 Boost Engagement',
    content: 'Chat seems quiet. Try asking a question or announcing a giveaway to get viewers talking!',
    showOnce: false,
    trigger: 'engagement_low_5min'
  },
  no_faq_rules: {
    id: 'no_faq_rules',
    title: '🤖 Save Time with FAQ Rules',
    content: 'You\'ve answered the same question 3 times. Add it as an FAQ rule to auto-reply next time!',
    showOnce: false,
    trigger: 'repeated_question'
  },
  vip_arrived: {
    id: 'vip_arrived',
    title: '⭐ VIP Alert!',
    content: 'A repeat customer just joined! Consider giving them a shoutout.',
    showOnce: false,
    trigger: 'vip_join'
  },
  sold_out_fomo: {
    id: 'sold_out_fomo',
    title: '🔥 Create FOMO!',
    content: 'Item sold out! Post "SOLD OUT - 5 people missed this!" to create urgency for future items.',
    showOnce: false,
    trigger: 'item_sold_out'
  },
  streak_reminder: {
    id: 'streak_reminder',
    title: '🔥 Keep Your Streak!',
    content: 'You\'ve streamed 3 days in a row. Keep it going for the Week Warrior achievement!',
    showOnce: false,
    trigger: 'streak_active'
  },
  
  // Feature discovery
  discover_demo: {
    id: 'discover_demo',
    title: '🎮 Try Demo Mode',
    content: 'Not on a live stream? Try Demo Mode to see all features in action with simulated chat!',
    showOnce: true,
    trigger: 'not_on_stream'
  },
  discover_shortcuts: {
    id: 'discover_shortcuts',
    title: '⌨️ Keyboard Shortcuts',
    content: 'Press 1-9 during streams for instant quick replies. Press ? to see all shortcuts!',
    showOnce: true,
    trigger: 'used_mouse_for_quick_reply'
  },
  discover_achievements: {
    id: 'discover_achievements',
    title: '🏆 Achievements Unlocked!',
    content: 'You\'ve earned achievements! Check them out and see what milestones are next.',
    showOnce: true,
    trigger: 'first_achievement'
  },
  discover_export: {
    id: 'discover_export',
    title: '📊 Export Your Data',
    content: 'You can export sales, buyers, and invoices as CSV for your records!',
    showOnce: true,
    trigger: '10_sales'
  }
};

// Track dismissed tips
let dismissedTips = new Set();

/**
 * Load dismissed tips from storage
 */
export async function loadDismissedTips() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([HELP_STORAGE_KEY], (result) => {
      dismissedTips = new Set(result[HELP_STORAGE_KEY] || []);
      resolve(dismissedTips);
    });
  });
}

/**
 * Save dismissed tips to storage
 */
async function saveDismissedTips() {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({
      [HELP_STORAGE_KEY]: Array.from(dismissedTips)
    }, resolve);
  });
}

/**
 * Dismiss a tip
 */
export async function dismissTip(tipId) {
  dismissedTips.add(tipId);
  await saveDismissedTips();
}

/**
 * Check if tip should be shown
 */
export function shouldShowTip(tipId) {
  const tip = HELP_TIPS[tipId];
  if (!tip) return false;
  if (tip.showOnce && dismissedTips.has(tipId)) return false;
  return true;
}

/**
 * Show a contextual help tip
 */
export function showTip(tipId, options = {}) {
  const tip = HELP_TIPS[tipId];
  if (!tip || !shouldShowTip(tipId)) return null;
  
  const { position = 'bottom', targetElement = null, autoDismiss = 5000 } = options;
  
  const tipElement = document.createElement('div');
  tipElement.className = `contextual-tip tip-${position}`;
  tipElement.innerHTML = `
    <div class="tip-header">
      <span class="tip-title">${tip.title}</span>
      <button class="tip-dismiss" aria-label="Dismiss">×</button>
    </div>
    <div class="tip-content">${tip.content}</div>
    ${tip.showOnce ? '<div class="tip-footer">Won\'t show again</div>' : ''}
  `;
  
  // Position near target element if provided
  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();
    tipElement.style.position = 'fixed';
    
    switch (position) {
      case 'top':
        tipElement.style.bottom = `${window.innerHeight - rect.top + 8}px`;
        tipElement.style.left = `${rect.left}px`;
        break;
      case 'bottom':
        tipElement.style.top = `${rect.bottom + 8}px`;
        tipElement.style.left = `${rect.left}px`;
        break;
      case 'left':
        tipElement.style.top = `${rect.top}px`;
        tipElement.style.right = `${window.innerWidth - rect.left + 8}px`;
        break;
      case 'right':
        tipElement.style.top = `${rect.top}px`;
        tipElement.style.left = `${rect.right + 8}px`;
        break;
    }
  }
  
  document.body.appendChild(tipElement);
  
  // Animate in
  requestAnimationFrame(() => {
    tipElement.classList.add('tip-visible');
  });
  
  // Dismiss handlers
  const dismiss = () => {
    tipElement.classList.remove('tip-visible');
    setTimeout(() => tipElement.remove(), 200);
    if (tip.showOnce) {
      dismissTip(tipId);
    }
  };
  
  tipElement.querySelector('.tip-dismiss').addEventListener('click', dismiss);
  
  if (autoDismiss > 0) {
    setTimeout(dismiss, autoDismiss);
  }
  
  return { element: tipElement, dismiss };
}

/**
 * Show tip for a specific trigger event
 */
export function triggerTip(triggerName, options = {}) {
  const tip = Object.values(HELP_TIPS).find(t => t.trigger === triggerName);
  if (tip) {
    return showTip(tip.id, options);
  }
  return null;
}

/**
 * Add help icon with tooltip to an element
 */
export function addHelpIcon(element, helpText) {
  const icon = document.createElement('span');
  icon.className = 'help-icon';
  icon.innerHTML = '?';
  icon.title = helpText;
  icon.setAttribute('role', 'tooltip');
  icon.setAttribute('aria-label', helpText);
  
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    showQuickHelp(helpText, e.target);
  });
  
  element.appendChild(icon);
  return icon;
}

/**
 * Show quick help popup
 */
export function showQuickHelp(text, nearElement) {
  const existing = document.querySelector('.quick-help');
  if (existing) existing.remove();
  
  const help = document.createElement('div');
  help.className = 'quick-help';
  help.textContent = text;
  
  document.body.appendChild(help);
  
  if (nearElement) {
    const rect = nearElement.getBoundingClientRect();
    help.style.top = `${rect.bottom + 8}px`;
    help.style.left = `${Math.min(rect.left, window.innerWidth - 250)}px`;
  }
  
  setTimeout(() => help.classList.add('quick-help-visible'), 10);
  
  const dismiss = () => {
    help.classList.remove('quick-help-visible');
    setTimeout(() => help.remove(), 200);
  };
  
  document.addEventListener('click', dismiss, { once: true });
  setTimeout(dismiss, 5000);
}

/**
 * Initialize help styles
 */
export function initHelpStyles() {
  if (document.getElementById('contextual-help-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'contextual-help-styles';
  style.textContent = `
    .contextual-tip {
      position: fixed;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 12px;
      max-width: 280px;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
      z-index: 10000;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s ease-out;
      font-size: 13px;
    }
    .contextual-tip.tip-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .tip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .tip-title {
      font-weight: 600;
    }
    .tip-dismiss {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      opacity: 0.7;
      padding: 0;
      line-height: 1;
    }
    .tip-dismiss:hover { opacity: 1; }
    .tip-content {
      line-height: 1.4;
    }
    .tip-footer {
      margin-top: 8px;
      font-size: 11px;
      opacity: 0.7;
    }
    
    .help-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      background: #e0e0e0;
      color: #666;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 600;
      cursor: help;
      margin-left: 6px;
      vertical-align: middle;
    }
    .help-icon:hover {
      background: #667eea;
      color: white;
    }
    
    .quick-help {
      position: fixed;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      max-width: 220px;
      z-index: 10001;
      opacity: 0;
      transform: translateY(5px);
      transition: all 0.15s ease-out;
    }
    .quick-help-visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    [data-theme="dark"] .help-icon {
      background: #374151;
      color: #9ca3af;
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize
loadDismissedTips();
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHelpStyles);
  } else {
    initHelpStyles();
  }
}

export default {
  HELP_TIPS,
  loadDismissedTips,
  dismissTip,
  shouldShowTip,
  showTip,
  triggerTip,
  addHelpIcon,
  showQuickHelp,
  initHelpStyles
};
