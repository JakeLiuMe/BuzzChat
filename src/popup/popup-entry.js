// BuzzChat - Popup Entry Point
// Main entry file that imports all modules and initializes the popup

import { browserAPI, VALIDATION } from './popup/core/config.js';
import { settings, setSettings as _setSettings } from './popup/core/state.js';
import { loadSettings, saveSettings, sendMessageToContent } from './popup/core/storage.js';
import { debounce, validateText, validateNumber } from './popup/core/utils.js';
import { Toast, SaveIndicator as _SaveIndicator, Loading } from './popup/ui/toast.js';
import { FocusTrap as _FocusTrap, openModal, closeModal, setupModalBackdropClose } from './popup/ui/modals.js';
import { initTabNavigation } from './popup/ui/tabs.js';
import { applyDarkMode, updateStatusBadge, updateTierBanner } from './popup/ui/theme.js';
import { elements, initElements } from './popup/ui/elements.js';
import { initUI, updateTranslationOptionsVisibility } from './popup/ui/init.js';
import { renderTimerMessages as _renderTimerMessages, addTimerMessage } from './popup/features/timers.js';
import { renderFaqRules as _renderFaqRules, addFaqRule } from './popup/features/faq.js';
import { renderTemplates as _renderTemplates, addTemplate } from './popup/features/templates.js';
import { renderCommands, addCommand, exportCommands, importCommands } from './popup/features/commands.js';
import { renderQuickReplyButtons as _renderQuickReplyButtons, addQuickReplyButton } from './popup/features/quickReply.js';
import { canAddFeature } from './popup/features/featureAccess.js';
import {
  spinGiveawayWheel, hideWinnerDisplay, announceWinners, triggerConfetti as _triggerConfetti,
  loadGiveawayData, loadChatMetrics, updateMetricsDisplay
} from './popup/features/giveaway.js';
import { Analytics, initAnalytics as _initAnalytics, loadAnalyticsData as _loadAnalyticsData, checkMilestones } from './popup/features/analytics.js';
import { Referral as _Referral, initReferral } from './popup/features/referral.js';
import { AccountManager as _AccountManager } from './popup/business/accounts.js';
import { ApiKeyManager as _ApiKeyManager } from './popup/business/apiKeys.js';
import {
  ExtensionPay as _ExtensionPay, subscribe, startTrial, manageSubscription as _manageSubscription,
  checkTrialAvailability, togglePricingDisplay
} from './popup/business/subscription.js';
import { exportSettings, importSettings, validateSettingsSchema as _validateSettingsSchema } from './popup/settings/importExport.js';
import { Onboarding as _Onboarding, checkOnboarding, initOnboardingListeners } from './popup/onboarding.js';
import { initInventory } from './popup/features/inventory.js';
import { initDashboard } from './popup/features/dashboard.js';
import { initExportBuyersButton } from './popup/features/exportBuyers.js';

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize element references
  initElements();

  // Load settings
  await loadSettings();

  // Initialize UI
  initUI();

  // Initialize event listeners
  initEventListeners();

  // Initialize message listeners
  initMessageListeners();

  // Initialize referral
  initReferral();

  // Initialize inventory
  initInventory();

  // Initialize live dashboard
  initDashboard();

  // Initialize buyer export button
  initExportBuyersButton();

  // Check onboarding
  checkOnboarding();

  // Signal that popup is fully initialized (for testing)
  window.__POPUP_INITIALIZED__ = true;

  // Check for milestone celebrations after a short delay (let UI settle)
  setTimeout(() => {
    checkMilestones();
  }, 1000);
});

// Initialize all event listeners
function initEventListeners() {
  initTabNavigation();
  initOnboardingListeners();

  // Master toggle
  elements.masterToggle.addEventListener('change', async () => {
    settings.masterEnabled = elements.masterToggle.checked;
    updateStatusBadge();
    await saveSettings();
    Toast.success(settings.masterEnabled ? 'Bot activated' : 'Bot deactivated');
  });

  // Welcome settings
  elements.welcomeToggle.addEventListener('change', async () => {
    settings.welcome.enabled = elements.welcomeToggle.checked;
    await saveSettings();
  });

  elements.welcomeMessage.addEventListener('input', debounce(async () => {
    settings.welcome.message = validateText(elements.welcomeMessage.value);
    await saveSettings();
  }, 500));

  elements.welcomeDelay.addEventListener('change', async () => {
    const validated = validateNumber(
      elements.welcomeDelay.value,
      VALIDATION.MIN_WELCOME_DELAY,
      VALIDATION.MAX_WELCOME_DELAY,
      5
    );
    settings.welcome.delay = validated;
    elements.welcomeDelay.value = validated;
    await saveSettings();
  });

  // Timer settings
  elements.timerToggle.addEventListener('change', async () => {
    settings.timer.enabled = elements.timerToggle.checked;
    await saveSettings();
  });

  elements.addTimerBtn.addEventListener('click', () => {
    if (!canAddFeature()) return;
    addTimerMessage();
  });

  // FAQ settings
  elements.faqToggle.addEventListener('change', async () => {
    settings.faq.enabled = elements.faqToggle.checked;
    await saveSettings();
  });

  elements.addFaqBtn.addEventListener('click', () => {
    if (!canAddFeature()) return;
    addFaqRule();
  });

  // Moderation settings
  if (elements.moderationToggle) {
    elements.moderationToggle.addEventListener('change', async () => {
      if (!settings.moderation) settings.moderation = {};
      settings.moderation.enabled = elements.moderationToggle.checked;
      await saveSettings();
    });
  }

  if (elements.blockedWords) {
    elements.blockedWords.addEventListener('input', debounce(async () => {
      if (!settings.moderation) settings.moderation = {};
      settings.moderation.blockedWords = elements.blockedWords.value
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
      await saveSettings();
    }, 500));
  }

  if (elements.blockRepeatedToggle) {
    elements.blockRepeatedToggle.addEventListener('change', async () => {
      if (!settings.moderation) settings.moderation = {};
      settings.moderation.blockRepeatedMessages = elements.blockRepeatedToggle.checked;
      await saveSettings();
    });
  }

  if (elements.maxRepeatCount) {
    elements.maxRepeatCount.addEventListener('change', async () => {
      if (!settings.moderation) settings.moderation = {};
      settings.moderation.maxRepeatCount = validateNumber(
        elements.maxRepeatCount.value, 2, 10, 3
      );
      elements.maxRepeatCount.value = settings.moderation.maxRepeatCount;
      await saveSettings();
    });
  }

  // Giveaway settings
  if (elements.giveawayToggle) {
    elements.giveawayToggle.addEventListener('change', async () => {
      if (!settings.giveaway) settings.giveaway = {};
      settings.giveaway.enabled = elements.giveawayToggle.checked;
      await saveSettings();
    });
  }

  if (elements.giveawayKeywords) {
    elements.giveawayKeywords.addEventListener('input', debounce(async () => {
      if (!settings.giveaway) settings.giveaway = {};
      settings.giveaway.keywords = elements.giveawayKeywords.value
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
      await saveSettings();
    }, 500));
  }

  if (elements.giveawayUniqueToggle) {
    elements.giveawayUniqueToggle.addEventListener('change', async () => {
      if (!settings.giveaway) settings.giveaway = {};
      settings.giveaway.uniqueOnly = elements.giveawayUniqueToggle.checked;
      await saveSettings();
    });
  }

  if (elements.refreshGiveawayBtn) {
    elements.refreshGiveawayBtn.addEventListener('click', loadGiveawayData);
  }

  if (elements.resetGiveawayBtn) {
    elements.resetGiveawayBtn.addEventListener('click', async () => {
      if (!confirm('Reset all giveaway entries? This cannot be undone.')) return;
      await sendMessageToContent('RESET_GIVEAWAY');
      loadGiveawayData();
      Toast.success('Giveaway entries reset');
    });
  }

  if (elements.refreshMetricsBtn) {
    elements.refreshMetricsBtn.addEventListener('click', loadChatMetrics);
  }

  // Giveaway Wheel
  if (elements.spinWheelBtn) {
    elements.spinWheelBtn.addEventListener('click', spinGiveawayWheel);
    elements.spinWheelBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        spinGiveawayWheel();
      }
    });
  }

  if (elements.announceWinnerBtn) {
    elements.announceWinnerBtn.addEventListener('click', announceWinners);
  }

  if (elements.rerollWinnerBtn) {
    elements.rerollWinnerBtn.addEventListener('click', () => {
      hideWinnerDisplay();
      spinGiveawayWheel();
    });
  }

  if (elements.closeWinnerBtn) {
    elements.closeWinnerBtn.addEventListener('click', hideWinnerDisplay);
  }

  // Inventory auto-detect toggle
  const inventoryAutoDetectToggle = document.getElementById('inventoryAutoDetectToggle');
  if (inventoryAutoDetectToggle) {
    inventoryAutoDetectToggle.addEventListener('change', async () => {
      if (!settings.inventory) settings.inventory = { enabled: true, autoDetectSold: true, lowStockThreshold: 2 };
      settings.inventory.autoDetectSold = inventoryAutoDetectToggle.checked;
      await saveSettings();
    });
  }

  // Templates
  elements.addTemplateBtn.addEventListener('click', () => {
    if (!canAddFeature()) return;
    addTemplate();
  });

  // Commands
  if (elements.commandsToggle) {
    elements.commandsToggle.addEventListener('change', async () => {
      if (!settings.commands) settings.commands = { enabled: false, list: [] };
      settings.commands.enabled = elements.commandsToggle.checked;
      await saveSettings();
    });
  }

  if (elements.addCommandBtn) {
    elements.addCommandBtn.addEventListener('click', () => {
      if (!canAddFeature()) return;
      addCommand();
    });
  }

  if (elements.exportCommandsBtn) {
    elements.exportCommandsBtn.addEventListener('click', exportCommands);
  }

  if (elements.importCommandsBtn) {
    elements.importCommandsBtn.addEventListener('click', () => {
      elements.importCommandsFile?.click();
    });
  }

  if (elements.importCommandsFile) {
    elements.importCommandsFile.addEventListener('change', importCommands);
  }

  // Quick Reply Settings
  if (elements.quickReplyToggle) {
    elements.quickReplyToggle.addEventListener('change', async () => {
      if (!settings.quickReply) settings.quickReply = { enabled: true, minimized: false, buttons: [] };
      settings.quickReply.enabled = elements.quickReplyToggle.checked;
      await saveSettings();
    });
  }

  if (elements.addQuickReplyBtn) {
    elements.addQuickReplyBtn.addEventListener('click', addQuickReplyButton);
  }

  // Settings modal with focus trap
  elements.settingsBtn.addEventListener('click', () => {
    openModal(elements.settingsModal);
  });

  elements.closeSettingsBtn.addEventListener('click', () => {
    closeModal(elements.settingsModal);
  });

  // Upgrade modal with focus trap
  elements.upgradeBtn.addEventListener('click', () => {
    openModal(elements.upgradeModal);
  });

  elements.closeUpgradeBtn.addEventListener('click', () => {
    closeModal(elements.upgradeModal);
  });

  // Help modal with focus trap
  if (elements.helpBtn) {
    elements.helpBtn.addEventListener('click', () => {
      openModal(elements.helpModal);
    });
  }

  if (elements.closeHelpBtn) {
    elements.closeHelpBtn.addEventListener('click', () => {
      closeModal(elements.helpModal);
    });
  }

  // Settings inputs
  elements.chatSelector.addEventListener('input', debounce(async () => {
    settings.settings.chatSelector = elements.chatSelector.value;
    await saveSettings();
  }, 500));

  elements.soundNotifications.addEventListener('change', async () => {
    settings.settings.soundNotifications = elements.soundNotifications.checked;
    await saveSettings();
  });

  elements.showMessageCount.addEventListener('change', async () => {
    settings.settings.showMessageCount = elements.showMessageCount.checked;
    await saveSettings();
  });

  // Dark mode toggle
  if (elements.darkModeToggle) {
    elements.darkModeToggle.addEventListener('change', async () => {
      settings.settings.darkMode = elements.darkModeToggle.checked;
      applyDarkMode(settings.settings.darkMode);
      await saveSettings();
    });
  }

  // Export/Import
  elements.exportSettingsBtn.addEventListener('click', exportSettings);
  elements.importSettingsBtn.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', importSettings);

  // Annual billing toggle
  if (elements.annualBillingToggle) {
    elements.annualBillingToggle.addEventListener('change', () => {
      const isAnnual = elements.annualBillingToggle.checked;
      togglePricingDisplay(isAnnual);
    });
  }

  // Watermark toggle
  if (elements.watermarkToggle) {
    elements.watermarkToggle.addEventListener('change', async () => {
      settings.settings.watermark = elements.watermarkToggle.checked;
      await saveSettings();
      Toast.success(settings.settings.watermark ?
        'Watermark enabled - help spread the word!' :
        'Watermark disabled.');
      updateTierBanner();
    });
  }

  // Translation toggles
  if (elements.translationToggle) {
    elements.translationToggle.addEventListener('change', async () => {
      if (!settings.translation) settings.translation = {};
      settings.translation.enabled = elements.translationToggle.checked;
      // Show/hide translation options
      updateTranslationOptionsUI(elements.translationToggle.checked);
      await saveSettings();
      Toast.success(settings.translation.enabled ?
        '🌍 Auto-translation enabled' :
        'Auto-translation disabled');
    });
  }

  if (elements.translationShowOriginal) {
    elements.translationShowOriginal.addEventListener('change', async () => {
      if (!settings.translation) settings.translation = {};
      settings.translation.showOriginal = elements.translationShowOriginal.checked;
      await saveSettings();
    });
  }

  if (elements.sellerLanguage) {
    elements.sellerLanguage.addEventListener('change', async () => {
      if (!settings.translation) settings.translation = {};
      settings.translation.sellerLanguage = elements.sellerLanguage.value;
      await saveSettings();
      Toast.success(`Your language set to ${elements.sellerLanguage.options[elements.sellerLanguage.selectedIndex].text}`);
    });
  }

  // Subscribe buttons
  elements.subscribePro.addEventListener('click', () => subscribe('pro', elements.annualBillingToggle?.checked));
  elements.subscribeBusiness.addEventListener('click', () => subscribe('business', elements.annualBillingToggle?.checked));

  // Trial button
  if (elements.startTrialBtn) {
    elements.startTrialBtn.addEventListener('click', startTrial);
  }

  // Check if trial is available and update UI
  checkTrialAvailability();

  // Analytics
  if (elements.unlockAnalyticsBtn) {
    elements.unlockAnalyticsBtn.addEventListener('click', () => {
      openModal(elements.upgradeModal);
    });
  }

  if (elements.exportAnalyticsBtn) {
    elements.exportAnalyticsBtn.addEventListener('click', async () => {
      Loading.show(elements.exportAnalyticsBtn);
      try {
        await Analytics.exportCSV();
        Toast.success('Analytics exported to CSV');
      } catch (error) {
        Toast.error('Failed to export analytics');
      }
      Loading.hide(elements.exportAnalyticsBtn);
    });
  }

  // Close modals on backdrop click
  setupModalBackdropClose(elements.settingsModal);
  setupModalBackdropClose(elements.upgradeModal);
}

// Helper to show/hide translation options in UI
function updateTranslationOptionsUI(enabled) {
  updateTranslationOptionsVisibility(enabled);
}

// Initialize runtime message listeners
function initMessageListeners() {
  // Listen for messages from content script (with security validation)
  browserAPI.runtime.onMessage.addListener((message, sender, _sendResponse) => {
    // SECURITY: Verify sender is from this extension
    if (!sender || sender.id !== browserAPI.runtime.id) {
      console.warn('[BuzzChat] Message from unknown sender rejected');
      return;
    }

    // SECURITY: Validate message has expected structure
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
      console.warn('[BuzzChat] Invalid message format rejected');
      return;
    }

    // Whitelist of allowed incoming message types
    const allowedTypes = ['MESSAGE_SENT', 'GIVEAWAY_ENTRY', 'CHAT_METRICS_UPDATE', 'COMMAND_USED', 'SOLD_DETECTION'];
    if (!allowedTypes.includes(message.type)) {
      console.warn('[BuzzChat] Unknown message type rejected:', message.type);
      return;
    }

    if (message.type === 'MESSAGE_SENT') {
      settings.messagesUsed++;
      updateTierBanner();
      saveSettings();
    } else if (message.type === 'COMMAND_USED') {
      if (settings.commands?.list && typeof message.trigger === 'string') {
        const cmd = settings.commands.list.find(c => c.trigger === message.trigger);
        if (cmd && typeof message.usageCount === 'number') {
          cmd.usageCount = message.usageCount;
          renderCommands();
        }
      }
    } else if (message.type === 'GIVEAWAY_ENTRY') {
      if (elements.giveawayEntryCount && typeof message.totalEntries === 'number') {
        elements.giveawayEntryCount.textContent = Math.max(0, Math.floor(message.totalEntries));
      }
      loadGiveawayData();
    } else if (message.type === 'CHAT_METRICS_UPDATE') {
      if (message.metrics && typeof message.metrics === 'object') {
        updateMetricsDisplay(message.metrics);
      }
    }
  });
}
