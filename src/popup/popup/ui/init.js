// BuzzChat - UI Initialization
// Initialize UI with current settings

import { settings } from '../core/state.js';
import { elements, initElements } from './elements.js';
import { applyDarkMode, updateStatusBadge, updateTierBanner, initDarkModeListener } from './theme.js';
import { renderTimerMessages } from '../features/timers.js';
import { renderFaqRules } from '../features/faq.js';
import { renderTemplates } from '../features/templates.js';
import { renderCommands } from '../features/commands.js';
import { renderQuickReplyButtons, initQuickReplyPosition } from '../features/quickReply.js';
import { loadGiveawayData, loadChatMetrics } from '../features/giveaway.js';
import { initAnalytics } from '../features/analytics.js';
import { initBusinessFeatures } from './businessUI.js';

// Initialize UI with current settings
export function initUI() {
  // Master toggle
  elements.masterToggle.checked = settings.masterEnabled;
  updateStatusBadge();

  // Tier banner
  updateTierBanner();

  // Welcome
  elements.welcomeToggle.checked = settings.welcome.enabled;
  elements.welcomeMessage.value = settings.welcome.message;
  elements.welcomeDelay.value = settings.welcome.delay;

  // Timer
  elements.timerToggle.checked = settings.timer.enabled;
  renderTimerMessages();

  // FAQ
  elements.faqToggle.checked = settings.faq.enabled;
  renderFaqRules();

  // Templates
  renderTemplates();

  // Commands
  if (elements.commandsToggle) {
    elements.commandsToggle.checked = settings.commands?.enabled || false;
  }
  renderCommands();

  // Quick Reply
  if (elements.quickReplyToggle) {
    elements.quickReplyToggle.checked = settings.quickReply?.enabled !== false;
  }
  renderQuickReplyButtons();
  initQuickReplyPosition();

  // Moderation
  if (elements.moderationToggle) {
    elements.moderationToggle.checked = settings.moderation?.enabled || false;
  }
  if (elements.blockedWords) {
    elements.blockedWords.value = (settings.moderation?.blockedWords || []).join(', ');
  }
  if (elements.blockRepeatedToggle) {
    elements.blockRepeatedToggle.checked = settings.moderation?.blockRepeatedMessages || false;
  }
  if (elements.maxRepeatCount) {
    elements.maxRepeatCount.value = settings.moderation?.maxRepeatCount || 3;
  }

  // Giveaway
  if (elements.giveawayToggle) {
    elements.giveawayToggle.checked = settings.giveaway?.enabled || false;
  }
  if (elements.giveawayKeywords) {
    elements.giveawayKeywords.value = (settings.giveaway?.keywords || ['entered', 'entry', 'enter']).join(', ');
  }
  if (elements.giveawayUniqueToggle) {
    elements.giveawayUniqueToggle.checked = settings.giveaway?.uniqueOnly !== false;
  }

  // Load giveaway data and metrics
  loadGiveawayData();
  loadChatMetrics();

  // Settings
  elements.chatSelector.value = settings.settings.chatSelector;
  elements.soundNotifications.checked = settings.settings.soundNotifications;
  elements.showMessageCount.checked = settings.settings.showMessageCount;

  // Dark mode - supports 'auto' (system preference), true, or false
  if (elements.darkModeToggle) {
    elements.darkModeToggle.checked = settings.settings.darkMode === true ||
      (settings.settings.darkMode === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    applyDarkMode(settings.settings.darkMode);
  }
  // Listen for system dark mode changes
  initDarkModeListener();

  // Watermark toggle
  if (elements.watermarkToggle) {
    elements.watermarkToggle.checked = settings.settings.watermark || false;
  }

  // Initialize analytics (async, don't await)
  initAnalytics();

  // Initialize Business tier features (account selector & API access)
  initBusinessFeatures();
}

// Export initElements for use in main entry
export { initElements };
