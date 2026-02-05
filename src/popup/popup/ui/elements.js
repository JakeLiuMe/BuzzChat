// BuzzChat - DOM Element References
// Centralized DOM element references for popup

// DOM Elements - populated after DOMContentLoaded
export const elements = {
  masterToggle: null,
  statusBadge: null,
  tierBanner: null,

  // Welcome
  welcomeToggle: null,
  welcomeMessage: null,
  welcomeDelay: null,

  // Timer
  timerToggle: null,
  timerMessages: null,
  addTimerBtn: null,
  timerMessageTemplate: null,

  // FAQ
  faqToggle: null,
  faqItems: null,
  addFaqBtn: null,
  faqTemplate: null,

  // Templates
  templatesList: null,
  addTemplateBtn: null,
  templateTemplate: null,

  // Modals
  settingsModal: null,
  settingsBtn: null,
  closeSettingsBtn: null,
  upgradeModal: null,
  upgradeBtn: null,
  closeUpgradeBtn: null,
  helpModal: null,
  helpBtn: null,
  closeHelpBtn: null,

  // Settings
  chatSelector: null,
  soundNotifications: null,
  showMessageCount: null,
  darkModeToggle: null,
  exportSettingsBtn: null,
  importSettingsBtn: null,
  importFile: null,

  // Upgrade
  subscribePro: null,
  subscribeBusiness: null,
  startTrialBtn: null,
  trialBanner: null,
  annualBillingToggle: null,
  proPrice: null,
  proPriceAnnual: null,
  proPriceNote: null,
  businessPrice: null,
  businessPriceAnnual: null,
  businessPriceNote: null,
  watermarkToggle: null,

  // Onboarding
  onboardingModal: null,
  acceptTerms: null,
  onboardingPrevBtn: null,
  onboardingNextBtn: null,
  onboardingMessage: null,
  messagePreview: null,
  setupWelcome: null,
  setupTimer: null,
  setupFaq: null,

  // Save Indicator
  saveIndicator: null,

  // Moderation
  moderationToggle: null,
  blockedWords: null,
  blockRepeatedToggle: null,
  maxRepeatCount: null,

  // Giveaway
  giveawayToggle: null,
  giveawayKeywords: null,
  giveawayUniqueToggle: null,
  giveawayEntryCount: null,
  giveawayEntriesList: null,
  refreshGiveawayBtn: null,
  resetGiveawayBtn: null,

  // Live Metrics
  metricMessagesPerMin: null,
  metricUniqueChatters: null,
  metricPeakMsgs: null,
  refreshMetricsBtn: null,

  // Analytics
  analyticsLocked: null,
  analyticsContent: null,
  unlockAnalyticsBtn: null,
  exportAnalyticsBtn: null,
  statTotalMessages: null,
  statTodayMessages: null,
  statPeakHour: null,
  weeklyChart: null,
  typePieChart: null,
  legendWelcome: null,
  legendFaq: null,
  legendTimer: null,
  legendTemplate: null,
  faqTriggersList: null,

  // Referral
  referralCode: null,
  copyReferralBtn: null,
  referralCount: null,
  referralBonus: null,
  redeemCode: null,
  redeemCodeBtn: null,
  referralRedeemedMsg: null,

  // Account Selector (Business tier)
  accountSelectorContainer: null,
  accountSelect: null,
  newAccountBtn: null,
  manageAccountsBtn: null,

  // Account Manager Modal
  accountManagerModal: null,
  closeAccountManagerBtn: null,
  accountsList: null,
  createAccountModalBtn: null,
  createAccountForm: null,
  newAccountName: null,
  confirmCreateAccountBtn: null,
  cancelCreateAccountBtn: null,

  // API Access (Business tier)
  apiSection: null,
  apiLocked: null,
  apiKeysList: null,
  emptyKeysMessage: null,
  createApiKeyBtn: null,
  apiKeyCreated: null,
  newApiKeyValue: null,
  copyNewApiKeyBtn: null,
  closeApiKeyCreatedBtn: null,
  unlockApiBtn: null,

  // Commands
  commandsToggle: null,
  commandsList: null,
  addCommandBtn: null,
  commandTemplate: null,
  exportCommandsBtn: null,
  importCommandsBtn: null,
  importCommandsFile: null,

  // Giveaway Wheel
  spinWheelBtn: null,
  winnerCount: null,
  winnerDisplay: null,
  winnerNames: null,
  announceWinnerBtn: null,
  rerollWinnerBtn: null,
  closeWinnerBtn: null,
  wheelOverlay: null,
  spinningWheel: null,
  wheelStatus: null,
  confettiCanvas: null,

  // Quick Reply Settings
  quickReplyToggle: null,
  quickReplyPosition: null,
  quickReplyButtonsList: null,
  addQuickReplyBtn: null,
  quickReplyTemplate: null
};

// Initialize all element references
export function initElements() {
  elements.masterToggle = document.getElementById('masterToggle');
  elements.statusBadge = document.getElementById('statusBadge');
  elements.tierBanner = document.getElementById('tierBanner');

  // Welcome
  elements.welcomeToggle = document.getElementById('welcomeToggle');
  elements.welcomeMessage = document.getElementById('welcomeMessage');
  elements.welcomeDelay = document.getElementById('welcomeDelay');

  // Timer
  elements.timerToggle = document.getElementById('timerToggle');
  elements.timerMessages = document.getElementById('timerMessages');
  elements.addTimerBtn = document.getElementById('addTimerBtn');
  elements.timerMessageTemplate = document.getElementById('timerMessageTemplate');

  // FAQ
  elements.faqToggle = document.getElementById('faqToggle');
  elements.faqItems = document.getElementById('faqItems');
  elements.addFaqBtn = document.getElementById('addFaqBtn');
  elements.faqTemplate = document.getElementById('faqTemplate');

  // Templates
  elements.templatesList = document.getElementById('templatesList');
  elements.addTemplateBtn = document.getElementById('addTemplateBtn');
  elements.templateTemplate = document.getElementById('templateTemplate');

  // Modals
  elements.settingsModal = document.getElementById('settingsModal');
  elements.settingsBtn = document.getElementById('settingsBtn');
  elements.closeSettingsBtn = document.getElementById('closeSettingsBtn');
  elements.upgradeModal = document.getElementById('upgradeModal');
  elements.upgradeBtn = document.getElementById('upgradeBtn');
  elements.closeUpgradeBtn = document.getElementById('closeUpgradeBtn');
  elements.helpModal = document.getElementById('helpModal');
  elements.helpBtn = document.getElementById('helpBtn');
  elements.closeHelpBtn = document.getElementById('closeHelpBtn');

  // Settings
  elements.chatSelector = document.getElementById('chatSelector');
  elements.soundNotifications = document.getElementById('soundNotifications');
  elements.showMessageCount = document.getElementById('showMessageCount');
  elements.darkModeToggle = document.getElementById('darkModeToggle');
  elements.exportSettingsBtn = document.getElementById('exportSettingsBtn');
  elements.importSettingsBtn = document.getElementById('importSettingsBtn');
  elements.importFile = document.getElementById('importFile');

  // Upgrade
  elements.subscribePro = document.getElementById('subscribePro');
  elements.subscribeBusiness = document.getElementById('subscribeBusiness');
  elements.startTrialBtn = document.getElementById('startTrialBtn');
  elements.trialBanner = document.getElementById('trialBanner');
  elements.annualBillingToggle = document.getElementById('annualBillingToggle');
  elements.proPrice = document.getElementById('proPrice');
  elements.proPriceAnnual = document.getElementById('proPriceAnnual');
  elements.proPriceNote = document.getElementById('proPriceNote');
  elements.businessPrice = document.getElementById('businessPrice');
  elements.businessPriceAnnual = document.getElementById('businessPriceAnnual');
  elements.businessPriceNote = document.getElementById('businessPriceNote');
  elements.watermarkToggle = document.getElementById('watermarkToggle');

  // Onboarding
  elements.onboardingModal = document.getElementById('onboardingModal');
  elements.acceptTerms = document.getElementById('acceptTerms');
  elements.onboardingPrevBtn = document.getElementById('onboardingPrevBtn');
  elements.onboardingNextBtn = document.getElementById('onboardingNextBtn');
  elements.onboardingMessage = document.getElementById('onboardingMessage');
  elements.messagePreview = document.getElementById('messagePreview');
  elements.setupWelcome = document.getElementById('setupWelcome');
  elements.setupTimer = document.getElementById('setupTimer');
  elements.setupFaq = document.getElementById('setupFaq');

  // Save Indicator
  elements.saveIndicator = document.getElementById('saveIndicator');

  // Moderation
  elements.moderationToggle = document.getElementById('moderationToggle');
  elements.blockedWords = document.getElementById('blockedWords');
  elements.blockRepeatedToggle = document.getElementById('blockRepeatedToggle');
  elements.maxRepeatCount = document.getElementById('maxRepeatCount');

  // Giveaway
  elements.giveawayToggle = document.getElementById('giveawayToggle');
  elements.giveawayKeywords = document.getElementById('giveawayKeywords');
  elements.giveawayUniqueToggle = document.getElementById('giveawayUniqueToggle');
  elements.giveawayEntryCount = document.getElementById('giveawayEntryCount');
  elements.giveawayEntriesList = document.getElementById('giveawayEntriesList');
  elements.refreshGiveawayBtn = document.getElementById('refreshGiveawayBtn');
  elements.resetGiveawayBtn = document.getElementById('resetGiveawayBtn');

  // Live Metrics
  elements.metricMessagesPerMin = document.getElementById('metricMessagesPerMin');
  elements.metricUniqueChatters = document.getElementById('metricUniqueChatters');
  elements.metricPeakMsgs = document.getElementById('metricPeakMsgs');
  elements.refreshMetricsBtn = document.getElementById('refreshMetricsBtn');

  // Analytics
  elements.analyticsLocked = document.getElementById('analyticsLocked');
  elements.analyticsContent = document.getElementById('analyticsContent');
  elements.unlockAnalyticsBtn = document.getElementById('unlockAnalyticsBtn');
  elements.exportAnalyticsBtn = document.getElementById('exportAnalyticsBtn');
  elements.statTotalMessages = document.getElementById('statTotalMessages');
  elements.statTodayMessages = document.getElementById('statTodayMessages');
  elements.statPeakHour = document.getElementById('statPeakHour');
  elements.weeklyChart = document.getElementById('weeklyChart');
  elements.typePieChart = document.getElementById('typePieChart');
  elements.legendWelcome = document.getElementById('legendWelcome');
  elements.legendFaq = document.getElementById('legendFaq');
  elements.legendTimer = document.getElementById('legendTimer');
  elements.legendTemplate = document.getElementById('legendTemplate');
  elements.faqTriggersList = document.getElementById('faqTriggersList');

  // Referral
  elements.referralCode = document.getElementById('referralCode');
  elements.copyReferralBtn = document.getElementById('copyReferralBtn');
  elements.referralCount = document.getElementById('referralCount');
  elements.referralBonus = document.getElementById('referralBonus');
  elements.redeemCode = document.getElementById('redeemCode');
  elements.redeemCodeBtn = document.getElementById('redeemCodeBtn');
  elements.referralRedeemedMsg = document.getElementById('referralRedeemedMsg');

  // Account Selector (Business tier)
  elements.accountSelectorContainer = document.getElementById('accountSelectorContainer');
  elements.accountSelect = document.getElementById('accountSelect');
  elements.newAccountBtn = document.getElementById('newAccountBtn');
  elements.manageAccountsBtn = document.getElementById('manageAccountsBtn');

  // Account Manager Modal
  elements.accountManagerModal = document.getElementById('accountManagerModal');
  elements.closeAccountManagerBtn = document.getElementById('closeAccountManagerBtn');
  elements.accountsList = document.getElementById('accountsList');
  elements.createAccountModalBtn = document.getElementById('createAccountModalBtn');
  elements.createAccountForm = document.getElementById('createAccountForm');
  elements.newAccountName = document.getElementById('newAccountName');
  elements.confirmCreateAccountBtn = document.getElementById('confirmCreateAccountBtn');
  elements.cancelCreateAccountBtn = document.getElementById('cancelCreateAccountBtn');

  // API Access (Business tier)
  elements.apiSection = document.getElementById('apiSection');
  elements.apiLocked = document.getElementById('apiLocked');
  elements.apiKeysList = document.getElementById('apiKeysList');
  elements.emptyKeysMessage = document.getElementById('emptyKeysMessage');
  elements.createApiKeyBtn = document.getElementById('createApiKeyBtn');
  elements.apiKeyCreated = document.getElementById('apiKeyCreated');
  elements.newApiKeyValue = document.getElementById('newApiKeyValue');
  elements.copyNewApiKeyBtn = document.getElementById('copyNewApiKeyBtn');
  elements.closeApiKeyCreatedBtn = document.getElementById('closeApiKeyCreatedBtn');
  elements.unlockApiBtn = document.getElementById('unlockApiBtn');

  // Commands
  elements.commandsToggle = document.getElementById('commandsToggle');
  elements.commandsList = document.getElementById('commandsList');
  elements.addCommandBtn = document.getElementById('addCommandBtn');
  elements.commandTemplate = document.getElementById('commandTemplate');
  elements.exportCommandsBtn = document.getElementById('exportCommandsBtn');
  elements.importCommandsBtn = document.getElementById('importCommandsBtn');
  elements.importCommandsFile = document.getElementById('importCommandsFile');

  // Giveaway Wheel
  elements.spinWheelBtn = document.getElementById('spinWheelBtn');
  elements.winnerCount = document.getElementById('winnerCount');
  elements.winnerDisplay = document.getElementById('winnerDisplay');
  elements.winnerNames = document.getElementById('winnerNames');
  elements.announceWinnerBtn = document.getElementById('announceWinnerBtn');
  elements.rerollWinnerBtn = document.getElementById('rerollWinnerBtn');
  elements.closeWinnerBtn = document.getElementById('closeWinnerBtn');
  elements.wheelOverlay = document.getElementById('wheelOverlay');
  elements.spinningWheel = document.getElementById('spinningWheel');
  elements.wheelStatus = document.getElementById('wheelStatus');
  elements.confettiCanvas = document.getElementById('confettiCanvas');

  // Quick Reply Settings
  elements.quickReplyToggle = document.getElementById('quickReplyToggle');
  elements.quickReplyPosition = document.getElementById('quickReplyPosition');
  elements.quickReplyButtonsList = document.getElementById('quickReplyButtonsList');
  elements.addQuickReplyBtn = document.getElementById('addQuickReplyBtn');
  elements.quickReplyTemplate = document.getElementById('quickReplyTemplate');
}
