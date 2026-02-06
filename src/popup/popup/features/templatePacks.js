// BuzzChat - Template Packs Feature
// Pre-made FAQ sets for different seller types

import { settings } from '../core/state.js';
import { saveSettings } from '../core/storage.js';
import { Toast } from '../ui/toast.js';
import { openModal, closeModal, setupModalBackdropClose } from '../ui/modals.js';
import { renderFaqRules } from './faq.js';
import { renderQuickReplyButtons } from './quickReply.js';

// ============================================
// TEMPLATE PACK DEFINITIONS
// ============================================

const TEMPLATE_PACKS = {
  sneakers: {
    id: 'sneakers',
    name: '👟 Sneaker Seller Pack',
    description: 'Perfect for shoe resellers',
    icon: '👟',
    recommended: ['whatnot', 'tiktok'],
    faqRules: [
      { 
        triggers: ['authentic', 'legit', 'real', 'fake'], 
        reply: 'All shoes are 100% authentic! We source from verified retailers. ✅',
        caseSensitive: false
      },
      { 
        triggers: ['size', 'sizing', 'fit', 'tts'], 
        reply: 'Check the listing for size! Most Jordans run TTS, Yeezys run half size small 👟',
        caseSensitive: false
      },
      { 
        triggers: ['ship', 'shipping', 'deliver', 'delivery'], 
        reply: 'We ship within 1-2 business days! Free shipping on orders $150+ 📦',
        caseSensitive: false
      },
      { 
        triggers: ['price', 'cost', 'how much', 'deal'], 
        reply: 'Prices shown on screen! Drop a comment if you need a deal 💰',
        caseSensitive: false
      },
      { 
        triggers: ['condition', 'ds', 'deadstock', 'worn', 'used'], 
        reply: 'All conditions listed! DS = Deadstock (brand new), VNDS = Very Near DS 🏷️',
        caseSensitive: false
      }
    ],
    quickReplies: [
      { text: 'SOLD!', emoji: '🔥' },
      { text: 'Checking size...', emoji: '📏' },
      { text: 'DM sent!', emoji: '✉️' },
      { text: 'Next item!', emoji: '➡️' }
    ]
  },

  fashion: {
    id: 'fashion',
    name: '👗 Fashion & Clothing Pack',
    description: 'For clothing and apparel sellers',
    icon: '👗',
    recommended: ['poshmark', 'whatnot', 'tiktok'],
    faqRules: [
      { 
        triggers: ['size', 'sizing', 'fit', 'measurements'], 
        reply: 'All measurements are listed! DM me for specific fit questions 📐',
        caseSensitive: false
      },
      { 
        triggers: ['material', 'fabric', 'cotton', 'polyester'], 
        reply: 'Material/fabric info is in the listing! Most items are high-quality blends 🧵',
        caseSensitive: false
      },
      { 
        triggers: ['wash', 'care', 'clean', 'laundry'], 
        reply: 'Check the care label! Most items: machine wash cold, tumble dry low 🧺',
        caseSensitive: false
      },
      { 
        triggers: ['return', 'refund', 'exchange'], 
        reply: 'Returns accepted within 7 days if item doesn\'t match description! 🔄',
        caseSensitive: false
      },
      { 
        triggers: ['ship', 'shipping', 'deliver'], 
        reply: 'Ships within 1-2 business days! Carefully packaged to protect your items 📦',
        caseSensitive: false
      },
      { 
        triggers: ['brand', 'authentic', 'real', 'designer'], 
        reply: 'All items are authentic! We don\'t sell replicas ✅',
        caseSensitive: false
      }
    ],
    quickReplies: [
      { text: 'SOLD!', emoji: '🛍️' },
      { text: 'Checking measurements...', emoji: '📏' },
      { text: 'Great pick!', emoji: '✨' },
      { text: 'Bundle for discount!', emoji: '💝' }
    ]
  },

  electronics: {
    id: 'electronics',
    name: '📱 Electronics Pack',
    description: 'For tech and electronics sellers',
    icon: '📱',
    recommended: ['ebay', 'whatnot'],
    faqRules: [
      { 
        triggers: ['warranty', 'guarantee', 'covered'], 
        reply: 'Items come with a 30-day return policy. No manufacturer warranty unless stated! 🛡️',
        caseSensitive: false
      },
      { 
        triggers: ['condition', 'work', 'working', 'tested'], 
        reply: 'All electronics are tested before shipping! Condition is listed on each item 🔧',
        caseSensitive: false
      },
      { 
        triggers: ['spec', 'specs', 'specifications', 'storage', 'memory', 'ram'], 
        reply: 'Full specs are in the listing! Ask if you need specific details 💻',
        caseSensitive: false
      },
      { 
        triggers: ['battery', 'charge', 'charging'], 
        reply: 'Battery health is tested and noted in listing when applicable! 🔋',
        caseSensitive: false
      },
      { 
        triggers: ['accessories', 'charger', 'cable', 'box'], 
        reply: 'Check the listing for included accessories! Most items come with charging cable 📦',
        caseSensitive: false
      },
      { 
        triggers: ['ship', 'shipping', 'deliver'], 
        reply: 'Ships same or next day! Insured shipping on all electronics 📦',
        caseSensitive: false
      }
    ],
    quickReplies: [
      { text: 'SOLD!', emoji: '⚡' },
      { text: 'Fully tested!', emoji: '✅' },
      { text: 'DM for specs', emoji: '📋' },
      { text: 'Next item!', emoji: '➡️' }
    ]
  },

  collectibles: {
    id: 'collectibles',
    name: '🎴 Collectibles & Vintage Pack',
    description: 'For cards, toys, and vintage items',
    icon: '🎴',
    recommended: ['whatnot', 'ebay'],
    faqRules: [
      { 
        triggers: ['authentic', 'real', 'legit', 'fake', 'replica'], 
        reply: 'All items are authentic and verified! We guarantee authenticity 💯',
        caseSensitive: false
      },
      { 
        triggers: ['condition', 'grade', 'grading', 'mint', 'nm', 'psa', 'bgs'], 
        reply: 'Condition is shown/stated for each item! Raw cards can be graded - DM for estimates 📊',
        caseSensitive: false
      },
      { 
        triggers: ['ship', 'shipping', 'deliver', 'package'], 
        reply: 'Shipped with extreme care! Cards in toploaders/sleeves, fragile items bubble-wrapped 📦',
        caseSensitive: false
      },
      { 
        triggers: ['price', 'value', 'worth', 'comp'], 
        reply: 'Prices based on recent comps! We stay competitive with market value 💰',
        caseSensitive: false
      },
      { 
        triggers: ['return', 'refund'], 
        reply: 'Returns accepted if item doesn\'t match description! 7-day window 🔄',
        caseSensitive: false
      }
    ],
    quickReplies: [
      { text: 'SOLD!', emoji: '🎉' },
      { text: 'Great eye!', emoji: '👀' },
      { text: 'Rare find!', emoji: '💎' },
      { text: 'Next card!', emoji: '🃏' }
    ]
  },

  general: {
    id: 'general',
    name: '🛒 General Seller Pack',
    description: 'Works for any type of selling',
    icon: '🛒',
    recommended: ['all'],
    faqRules: [
      { 
        triggers: ['pay', 'payment', 'venmo', 'paypal', 'cash', 'zelle'], 
        reply: 'Payment through the platform only for buyer protection! 💳',
        caseSensitive: false
      },
      { 
        triggers: ['ship', 'shipping', 'deliver', 'delivery'], 
        reply: 'We ship within 1-2 business days! Tracking provided 📦',
        caseSensitive: false
      },
      { 
        triggers: ['return', 'refund', 'exchange'], 
        reply: 'Returns accepted within 7 days if item doesn\'t match description! 🔄',
        caseSensitive: false
      },
      { 
        triggers: ['bundle', 'discount', 'deal', 'multiple'], 
        reply: 'Yes! Bundle multiple items for a discount! DM me to work out a deal 🎁',
        caseSensitive: false
      },
      { 
        triggers: ['condition', 'quality', 'new', 'used'], 
        reply: 'All conditions listed clearly! Feel free to ask about specifics 📋',
        caseSensitive: false
      },
      { 
        triggers: ['available', 'still', 'sold'], 
        reply: 'If it\'s on screen, it\'s available! I\'ll say SOLD when it\'s gone 🔴',
        caseSensitive: false
      }
    ],
    quickReplies: [
      { text: 'SOLD!', emoji: '🔥' },
      { text: 'Still available!', emoji: '✅' },
      { text: 'DM sent!', emoji: '✉️' },
      { text: 'Thanks for watching!', emoji: '🙏' }
    ]
  },

  beauty: {
    id: 'beauty',
    name: '💄 Beauty & Cosmetics Pack',
    description: 'For makeup and skincare sellers',
    icon: '💄',
    recommended: ['tiktok', 'poshmark'],
    faqRules: [
      { 
        triggers: ['authentic', 'real', 'fake', 'genuine'], 
        reply: 'All products are 100% authentic! No dupes or counterfeits 💯',
        caseSensitive: false
      },
      { 
        triggers: ['expire', 'expiration', 'expired', 'date', 'fresh'], 
        reply: 'All products are fresh with valid dates! Check listing for expiration info 📅',
        caseSensitive: false
      },
      { 
        triggers: ['shade', 'color', 'match', 'skin'], 
        reply: 'Shades shown on screen! DM your skin tone for personalized recommendations 🎨',
        caseSensitive: false
      },
      { 
        triggers: ['ingredient', 'cruelty', 'vegan', 'paraben'], 
        reply: 'Product details in listing! Most brands are cruelty-free - ask about specifics 🐰',
        caseSensitive: false
      },
      { 
        triggers: ['ship', 'shipping', 'deliver'], 
        reply: 'Ships within 1-2 days! Heat-sensitive items shipped with care 📦',
        caseSensitive: false
      }
    ],
    quickReplies: [
      { text: 'SOLD!', emoji: '💖' },
      { text: 'Great shade!', emoji: '🎨' },
      { text: 'Bundle deal!', emoji: '🎁' },
      { text: 'Next item!', emoji: '✨' }
    ]
  },

  sports: {
    id: 'sports',
    name: '⚾ Sports Memorabilia Pack',
    description: 'For sports cards and memorabilia',
    icon: '⚾',
    recommended: ['whatnot', 'ebay'],
    faqRules: [
      { 
        triggers: ['authentic', 'auto', 'autograph', 'signed', 'real'], 
        reply: 'All autos are authenticated! COA/hologram included when applicable 🏆',
        caseSensitive: false
      },
      { 
        triggers: ['condition', 'grade', 'psa', 'bgs', 'sgc', 'raw'], 
        reply: 'Condition grades are stated! Raw cards - check photos for centering/corners 📊',
        caseSensitive: false
      },
      { 
        triggers: ['rookie', 'rc', 'first'], 
        reply: 'Yes, this is a legit RC! Rookie cards marked in listings 🌟',
        caseSensitive: false
      },
      { 
        triggers: ['ship', 'shipping', 'deliver'], 
        reply: 'Ships in toploader + team bag + bubble mailer! Safe delivery guaranteed 📦',
        caseSensitive: false
      },
      { 
        triggers: ['pc', 'trade', 'swap'], 
        reply: 'Cash sales only on stream! DM for trade discussions after 💬',
        caseSensitive: false
      }
    ],
    quickReplies: [
      { text: 'SOLD!', emoji: '🏆' },
      { text: 'Fire pull!', emoji: '🔥' },
      { text: 'PSA 10!', emoji: '💎' },
      { text: 'Next card!', emoji: '🃏' }
    ]
  }
};

// ============================================
// PACK MANAGEMENT FUNCTIONS
// ============================================

/**
 * Get all available template packs
 * @returns {Array} Array of pack objects with id, name, description
 */
export function getAvailablePacks() {
  return Object.values(TEMPLATE_PACKS).map(pack => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    icon: pack.icon,
    recommended: pack.recommended,
    faqCount: pack.faqRules.length,
    quickReplyCount: pack.quickReplies.length
  }));
}

/**
 * Get detailed preview of a pack
 * @param {string} packId - The pack ID
 * @returns {Object|null} Full pack data or null if not found
 */
export function previewPack(packId) {
  const pack = TEMPLATE_PACKS[packId];
  if (!pack) return null;

  return {
    ...pack,
    faqRules: pack.faqRules.map(rule => ({
      triggers: [...rule.triggers],
      reply: rule.reply
    })),
    quickReplies: pack.quickReplies.map(btn => ({
      text: btn.text,
      emoji: btn.emoji
    }))
  };
}

/**
 * Load a pack's templates into settings
 * @param {string} packId - The pack ID to load
 * @param {Object} options - Import options
 * @param {boolean} options.mergeFaq - Merge with existing FAQ rules (default: true)
 * @param {boolean} options.mergeQuickReplies - Merge with existing quick replies (default: true)
 * @returns {Object} Result with success status and counts
 */
export async function loadPack(packId, options = {}) {
  const pack = TEMPLATE_PACKS[packId];
  if (!pack) {
    return { success: false, error: 'Pack not found' };
  }

  const { 
    mergeFaq = true, 
    mergeQuickReplies = true 
  } = options;

  let faqAdded = 0;
  let faqSkipped = 0;
  let quickRepliesAdded = 0;
  let quickRepliesSkipped = 0;

  // Import FAQ rules
  if (pack.faqRules && pack.faqRules.length > 0) {
    if (!settings.faq) {
      settings.faq = { enabled: false, rules: [] };
    }

    if (mergeFaq) {
      // Merge: add only rules with triggers we don't already have
      const existingTriggers = new Set();
      settings.faq.rules.forEach(rule => {
        (rule.triggers || []).forEach(t => existingTriggers.add(t.toLowerCase()));
      });

      pack.faqRules.forEach(newRule => {
        // Check if any of the new rule's triggers already exist
        const hasOverlap = newRule.triggers.some(t => 
          existingTriggers.has(t.toLowerCase())
        );

        if (!hasOverlap) {
          settings.faq.rules.push({
            triggers: [...newRule.triggers],
            reply: newRule.reply,
            caseSensitive: newRule.caseSensitive || false
          });
          faqAdded++;
        } else {
          faqSkipped++;
        }
      });
    } else {
      // Replace: clear existing and add all
      settings.faq.rules = pack.faqRules.map(rule => ({
        triggers: [...rule.triggers],
        reply: rule.reply,
        caseSensitive: rule.caseSensitive || false
      }));
      faqAdded = pack.faqRules.length;
    }
  }

  // Import quick reply buttons
  if (pack.quickReplies && pack.quickReplies.length > 0) {
    if (!settings.quickReply) {
      settings.quickReply = { enabled: true, minimized: false, buttons: [] };
    }

    if (mergeQuickReplies) {
      // Merge: add only buttons with text we don't already have
      const existingTexts = new Set(
        settings.quickReply.buttons.map(btn => btn.text.toLowerCase())
      );

      pack.quickReplies.forEach(newBtn => {
        if (!existingTexts.has(newBtn.text.toLowerCase())) {
          // Respect the max of 10 buttons
          if (settings.quickReply.buttons.length < 10) {
            settings.quickReply.buttons.push({
              text: newBtn.text,
              emoji: newBtn.emoji
            });
            quickRepliesAdded++;
          } else {
            quickRepliesSkipped++;
          }
        } else {
          quickRepliesSkipped++;
        }
      });
    } else {
      // Replace: clear existing and add all (max 10)
      settings.quickReply.buttons = pack.quickReplies.slice(0, 10).map(btn => ({
        text: btn.text,
        emoji: btn.emoji
      }));
      quickRepliesAdded = Math.min(pack.quickReplies.length, 10);
    }
  }

  // Save changes
  await saveSettings();

  // Refresh UI
  if (typeof renderFaqRules === 'function') {
    renderFaqRules();
  }
  if (typeof renderQuickReplyButtons === 'function') {
    renderQuickReplyButtons();
  }

  return {
    success: true,
    packName: pack.name,
    faqAdded,
    faqSkipped,
    quickRepliesAdded,
    quickRepliesSkipped
  };
}

/**
 * Get recommended packs based on detected platform
 * @param {string} platform - Detected platform name
 * @returns {Array} Array of recommended pack objects
 */
export function getRecommendedPacks(platform) {
  const platformLower = (platform || '').toLowerCase();
  
  return Object.values(TEMPLATE_PACKS)
    .filter(pack => 
      pack.recommended.includes('all') || 
      pack.recommended.some(p => platformLower.includes(p))
    )
    .map(pack => ({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      icon: pack.icon
    }));
}

// ============================================
// UI COMPONENTS
// ============================================

let templatePacksModal = null;

/**
 * Create and return the template packs modal
 */
function createTemplatePacksModal() {
  if (templatePacksModal) return templatePacksModal;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'templatePacksModal';
  modal.innerHTML = `
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2>📦 Template Packs</h2>
        <button class="modal-close" id="closeTemplatePacksBtn" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        <p class="help-text" style="margin-bottom: var(--space-md);">
          Load pre-made FAQ rules and quick replies for your seller type. 
          Existing rules are preserved by default!
        </p>
        
        <div class="template-packs-recommended" id="packsRecommended" style="display: none;">
          <h4 style="margin-bottom: var(--space-sm);">✨ Recommended for You</h4>
          <div class="template-packs-grid" id="recommendedPacksGrid"></div>
          <hr class="section-divider">
        </div>
        
        <h4 style="margin-bottom: var(--space-sm);">All Template Packs</h4>
        <div class="template-packs-grid" id="allPacksGrid"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  templatePacksModal = modal;

  // Setup close handlers
  const closeBtn = modal.querySelector('#closeTemplatePacksBtn');
  closeBtn.addEventListener('click', () => closeModal(modal));
  setupModalBackdropClose(modal);

  return modal;
}

/**
 * Create a pack card element
 */
function createPackCard(pack, isRecommended = false) {
  const card = document.createElement('div');
  card.className = 'template-pack-card' + (isRecommended ? ' recommended' : '');
  card.innerHTML = `
    <div class="pack-header">
      <span class="pack-icon">${pack.icon}</span>
      <div class="pack-info">
        <h4 class="pack-name">${pack.name}</h4>
        <p class="pack-description">${pack.description}</p>
      </div>
    </div>
    <div class="pack-stats">
      <span class="pack-stat">❓ ${pack.faqCount} FAQ rules</span>
      <span class="pack-stat">⚡ ${pack.quickReplyCount} quick replies</span>
    </div>
    <div class="pack-actions">
      <button class="btn btn-secondary btn-sm preview-pack-btn" data-pack-id="${pack.id}">Preview</button>
      <button class="btn btn-primary btn-sm load-pack-btn" data-pack-id="${pack.id}">Load Pack</button>
    </div>
  `;

  // Preview button
  card.querySelector('.preview-pack-btn').addEventListener('click', () => {
    showPackPreview(pack.id);
  });

  // Load button
  card.querySelector('.load-pack-btn').addEventListener('click', async () => {
    await handleLoadPack(pack.id);
  });

  return card;
}

/**
 * Show pack preview in a nested modal or expanded view
 */
function showPackPreview(packId) {
  const pack = previewPack(packId);
  if (!pack) return;

  // Create preview content
  let previewHtml = `
    <div class="pack-preview-overlay" id="packPreviewOverlay">
      <div class="pack-preview-content">
        <div class="pack-preview-header">
          <h3>${pack.icon} ${pack.name}</h3>
          <button class="modal-close pack-preview-close">&times;</button>
        </div>
        <div class="pack-preview-body">
          <h4>FAQ Rules (${pack.faqRules.length})</h4>
          <div class="preview-list">
  `;

  pack.faqRules.forEach(rule => {
    previewHtml += `
      <div class="preview-item">
        <div class="preview-triggers">
          <strong>Triggers:</strong> ${rule.triggers.join(', ')}
        </div>
        <div class="preview-reply">${rule.reply}</div>
      </div>
    `;
  });

  previewHtml += `
          </div>
          <h4 style="margin-top: var(--space-md);">Quick Replies (${pack.quickReplies.length})</h4>
          <div class="preview-quick-replies">
  `;

  pack.quickReplies.forEach(btn => {
    previewHtml += `
      <span class="preview-quick-btn">${btn.emoji} ${btn.text}</span>
    `;
  });

  previewHtml += `
          </div>
        </div>
        <div class="pack-preview-footer">
          <button class="btn btn-secondary close-preview-btn">Close</button>
          <button class="btn btn-primary load-from-preview-btn" data-pack-id="${pack.id}">Load This Pack</button>
        </div>
      </div>
    </div>
  `;

  // Add to modal
  const existingPreview = document.getElementById('packPreviewOverlay');
  if (existingPreview) existingPreview.remove();

  const previewDiv = document.createElement('div');
  previewDiv.innerHTML = previewHtml;
  const overlay = previewDiv.firstElementChild;
  
  templatePacksModal.querySelector('.modal-content').appendChild(overlay);

  // Event handlers
  overlay.querySelector('.pack-preview-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.close-preview-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.load-from-preview-btn').addEventListener('click', async () => {
    overlay.remove();
    await handleLoadPack(packId);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

/**
 * Handle loading a pack with user confirmation
 */
async function handleLoadPack(packId) {
  const pack = TEMPLATE_PACKS[packId];
  if (!pack) return;

  // Show loading state
  const loadBtns = document.querySelectorAll(`.load-pack-btn[data-pack-id="${packId}"]`);
  loadBtns.forEach(btn => {
    btn.disabled = true;
    btn.textContent = 'Loading...';
  });

  try {
    const result = await loadPack(packId, { mergeFaq: true, mergeQuickReplies: true });

    if (result.success) {
      let message = `${pack.name} loaded!`;
      const details = [];
      
      if (result.faqAdded > 0) details.push(`${result.faqAdded} FAQ rules added`);
      if (result.quickRepliesAdded > 0) details.push(`${result.quickRepliesAdded} quick replies added`);
      if (result.faqSkipped > 0 || result.quickRepliesSkipped > 0) {
        details.push(`${result.faqSkipped + result.quickRepliesSkipped} duplicates skipped`);
      }
      
      if (details.length > 0) {
        message += ` ${details.join(', ')}.`;
      }

      Toast.success(message);
      closeModal(templatePacksModal);
    } else {
      Toast.error(result.error || 'Failed to load pack');
    }
  } catch (error) {
    console.error('[BuzzChat] Error loading pack:', error);
    Toast.error('Failed to load template pack');
  } finally {
    // Reset button state
    loadBtns.forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Load Pack';
    });
  }
}

/**
 * Open the template packs modal
 * @param {string} detectedPlatform - Optional detected platform for recommendations
 */
export function openTemplatePacksModal(detectedPlatform = '') {
  const modal = createTemplatePacksModal();
  
  // Get packs
  const allPacks = getAvailablePacks();
  const recommendedPacks = detectedPlatform ? getRecommendedPacks(detectedPlatform) : [];

  // Populate recommended section
  const recommendedSection = modal.querySelector('#packsRecommended');
  const recommendedGrid = modal.querySelector('#recommendedPacksGrid');
  
  if (recommendedPacks.length > 0 && detectedPlatform) {
    recommendedSection.style.display = 'block';
    recommendedGrid.innerHTML = '';
    recommendedPacks.forEach(pack => {
      const fullPack = allPacks.find(p => p.id === pack.id);
      if (fullPack) {
        recommendedGrid.appendChild(createPackCard(fullPack, true));
      }
    });
  } else {
    recommendedSection.style.display = 'none';
  }

  // Populate all packs
  const allGrid = modal.querySelector('#allPacksGrid');
  allGrid.innerHTML = '';
  allPacks.forEach(pack => {
    allGrid.appendChild(createPackCard(pack, false));
  });

  openModal(modal);
}

/**
 * Initialize template packs UI (add button to FAQ tab)
 */
export function initTemplatePacks() {
  // Find the FAQ panel and add button near the existing "Add FAQ Rule" button
  const faqPanel = document.getElementById('faq-panel');
  if (!faqPanel) return;

  // Look for the add FAQ button
  const addFaqBtn = faqPanel.querySelector('#addFaqBtn');
  if (!addFaqBtn) return;

  // Create template packs button
  const templatePacksBtn = document.createElement('button');
  templatePacksBtn.className = 'btn btn-secondary template-packs-btn';
  templatePacksBtn.id = 'loadTemplatePacksBtn';
  templatePacksBtn.innerHTML = '📦 Load Template Pack';
  templatePacksBtn.title = 'Import pre-made FAQ rules and quick replies for your seller type';
  templatePacksBtn.style.marginLeft = 'var(--space-sm)';

  // Insert after the add FAQ button
  addFaqBtn.parentNode.insertBefore(templatePacksBtn, addFaqBtn.nextSibling);

  // Add click handler
  templatePacksBtn.addEventListener('click', () => {
    // Try to detect platform from badge
    const platformName = document.getElementById('platformName');
    const platform = platformName ? platformName.textContent : '';
    openTemplatePacksModal(platform);
  });

  // Add styles for template packs
  addTemplatePackStyles();
}

/**
 * Add CSS styles for template packs UI
 */
function addTemplatePackStyles() {
  const styleId = 'templatePackStyles';
  if (document.getElementById(styleId)) return;

  const styles = document.createElement('style');
  styles.id = styleId;
  styles.textContent = `
    /* Template Packs Button */
    .template-packs-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    /* Template Packs Grid */
    .template-packs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-md);
      margin-bottom: var(--space-md);
    }

    /* Pack Card */
    .template-pack-card {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--space-md);
      transition: all 0.2s ease;
    }

    .template-pack-card:hover {
      border-color: var(--primary);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .template-pack-card.recommended {
      border-color: var(--primary);
      background: linear-gradient(135deg, var(--bg-tertiary), rgba(var(--primary-rgb), 0.05));
    }

    .pack-header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      margin-bottom: var(--space-sm);
    }

    .pack-icon {
      font-size: 2rem;
      line-height: 1;
    }

    .pack-info {
      flex: 1;
    }

    .pack-name {
      margin: 0 0 var(--space-xs) 0;
      font-size: var(--font-md);
      font-weight: 600;
    }

    .pack-description {
      margin: 0;
      font-size: var(--font-sm);
      color: var(--text-secondary);
    }

    .pack-stats {
      display: flex;
      gap: var(--space-md);
      margin-bottom: var(--space-md);
      font-size: var(--font-sm);
      color: var(--text-secondary);
    }

    .pack-stat {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .pack-actions {
      display: flex;
      gap: var(--space-sm);
    }

    .pack-actions .btn {
      flex: 1;
    }

    /* Pack Preview Overlay */
    .pack-preview-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
      padding: var(--space-md);
    }

    .pack-preview-content {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .pack-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-md);
      border-bottom: 1px solid var(--border-color);
    }

    .pack-preview-header h3 {
      margin: 0;
    }

    .pack-preview-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 0;
      line-height: 1;
    }

    .pack-preview-body {
      padding: var(--space-md);
      overflow-y: auto;
      flex: 1;
    }

    .pack-preview-body h4 {
      margin: 0 0 var(--space-sm) 0;
      font-size: var(--font-sm);
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .preview-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .preview-item {
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      padding: var(--space-sm);
    }

    .preview-triggers {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      margin-bottom: var(--space-xs);
    }

    .preview-reply {
      font-size: var(--font-sm);
    }

    .preview-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .preview-quick-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      background: var(--bg-secondary);
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-full);
      font-size: var(--font-sm);
    }

    .pack-preview-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
      padding: var(--space-md);
      border-top: 1px solid var(--border-color);
    }

    /* Larger modal for template packs */
    .modal-lg {
      max-width: 700px;
    }
  `;

  document.head.appendChild(styles);
}

// Export for initialization
export { TEMPLATE_PACKS };
