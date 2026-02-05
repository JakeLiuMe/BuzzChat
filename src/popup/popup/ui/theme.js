// BuzzChat - Theme Management
// Dark mode, status badge, and tier banner

import { settings } from '../core/state.js';
import { VALIDATION } from '../core/config.js';
import { saveSettings } from '../core/storage.js';
import { elements } from './elements.js';

// Check if system prefers dark mode
export function getSystemDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Apply dark mode to the document
export function applyDarkMode(enabled) {
  // If 'auto' or undefined, use system preference
  const shouldBeDark = enabled === 'auto' || enabled === undefined
    ? getSystemDarkMode()
    : enabled;

  if (shouldBeDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// Listen for system dark mode changes and auto-apply
export function initDarkModeListener() {
  if (!window.matchMedia) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    // Only auto-apply if user hasn't set a manual preference
    // or if they've explicitly chosen 'auto'
    if (settings.settings?.darkMode === 'auto' || settings.settings?.darkMode === undefined) {
      applyDarkMode(e.matches);
    }
  });
}

// Update status badge
export function updateStatusBadge() {
  if (settings.masterEnabled) {
    elements.statusBadge.classList.add('active');
    elements.statusBadge.querySelector('.status-text').textContent = 'Active';
  } else {
    elements.statusBadge.classList.remove('active');
    elements.statusBadge.querySelector('.status-text').textContent = 'Inactive';
  }
}

// Update tier banner with VIP styling
export async function updateTierBanner() {
  const tierLabel = elements.tierBanner.querySelector('.tier-label');
  const tierUsage = elements.tierBanner.querySelector('.tier-usage');
  const vipBadge = document.getElementById('vipBadge');
  const vipTierText = vipBadge?.querySelector('.vip-tier-text');
  const memberSince = document.getElementById('memberSince');

  // Clear previous tier classes
  elements.tierBanner.classList.remove('pro', 'vip-pro', 'vip-business');

  if (settings.tier === 'pro' || settings.tier === 'business') {
    // Add VIP styling based on tier
    const vipClass = settings.tier === 'business' ? 'vip-business' : 'vip-pro';
    elements.tierBanner.classList.add(vipClass);

    // Show and configure VIP badge
    if (vipBadge) {
      vipBadge.style.display = 'inline-flex';
      if (vipTierText) {
        vipTierText.textContent = settings.tier === 'business' ? 'MAX' : 'PRO';
      }
      // Use diamond icon for business tier
      const vipIcon = vipBadge.querySelector('.vip-icon');
      if (vipIcon && settings.tier === 'business') {
        vipIcon.innerHTML = '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>';
      }
    }

    // Show membership date if available
    if (memberSince && settings.memberSince) {
      const date = new Date(settings.memberSince);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      memberSince.textContent = `Member since ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      memberSince.style.display = 'inline';
    } else if (memberSince) {
      if (!settings.memberSince) {
        settings.memberSince = new Date().toISOString();
        saveSettings();
      }
      memberSince.style.display = 'none';
    }

    tierLabel.textContent = settings.tier === 'business' ? 'Max' : 'Pro';
    tierUsage.textContent = 'Unlimited features + Analytics';
  } else {
    // Free tier
    if (vipBadge) vipBadge.style.display = 'none';
    if (memberSince) memberSince.style.display = 'none';

    tierLabel.textContent = 'Free Plan';

    // Free tier has 50 messages/show (limits managed by background.js)
    // Don't override - use what's set in storage from license verification

    // Show feature limits instead of message count
    const faqRulesUsed = settings.faq?.rules?.length || 0;
    const commandsUsed = settings.commands?.list?.length || 0;
    const faqLimit = VALIDATION.MAX_FAQ_RULES_FREE;
    const cmdLimit = VALIDATION.MAX_COMMANDS_FREE;

    if (faqRulesUsed >= faqLimit || commandsUsed >= cmdLimit) {
      tierUsage.textContent = 'Upgrade to Pro for unlimited rules & analytics';
    } else {
      tierUsage.textContent = `${faqLimit - faqRulesUsed} FAQ rules, ${cmdLimit - commandsUsed} commands left`;
    }
  }
}
