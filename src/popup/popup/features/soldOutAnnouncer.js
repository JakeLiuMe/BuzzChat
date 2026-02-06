// BuzzChat - Sold Out Auto-Announcer
// Generate exciting FOMO-driven announcements when items sell out

import { browserAPI, DEFAULT_SETTINGS } from '../core/config.js';
import { Toast } from '../ui/toast.js';
import { getWaitlistCount } from './waitlist.js';

// Storage key
const STORAGE_KEY = 'buzzchatSoldOutAnnouncer';

// Default announcement templates - FOMO-inducing messages
export const DEFAULT_TEMPLATES = [
  {
    id: 'fire',
    name: '🔥 Fire',
    template: '🔥 SOLD OUT! {product} is GONE! {missedCount} Don\'t sleep on the next drop!',
    emoji: '🔥'
  },
  {
    id: 'lightning',
    name: '⚡ Lightning',
    template: '⚡ INSTANT SELLOUT! {product} flew off the shelf! {waitlistInfo} Follow to not miss restocks!',
    emoji: '⚡'
  },
  {
    id: 'rocket',
    name: '🚀 Rocket',
    template: '🚀 {product} = SOLD! That was FAST! {missedCount} Stay tuned for more heat!',
    emoji: '🚀'
  },
  {
    id: 'siren',
    name: '🚨 Siren',
    template: '🚨 SOLD OUT ALERT! {product} just sold! {waitlistInfo} Be faster next time!',
    emoji: '🚨'
  },
  {
    id: 'explosion',
    name: '💥 Explosion',
    template: '💥 BOOM! {product} is GONE! {missedCount} This is why you gotta be quick!',
    emoji: '💥'
  },
  {
    id: 'heartbreak',
    name: '💔 Heartbreak',
    template: '💔 Too late! {product} just sold out! {waitlistInfo} Join the waitlist to not miss it!',
    emoji: '💔'
  },
  {
    id: 'celebration',
    name: '🎉 Celebration',
    template: '🎉 Another one GONE! {product} = SOLD! {missedCount} Thanks for the love!',
    emoji: '🎉'
  },
  {
    id: 'money',
    name: '💰 Money',
    template: '💸 SOLD! {product} found a new home! {waitlistInfo} Who\'s next?!',
    emoji: '💸'
  }
];

// Missed count message variations
const MISSED_COUNT_MESSAGES = [
  '{count} people missed out!',
  '{count} came too late!',
  '{count} were too slow!',
  '{count} missed their chance!',
  '{count} people wanted this!'
];

// Waitlist info variations
const WAITLIST_INFO_MESSAGES = [
  '{count} already on the waitlist!',
  '{count} people waiting for restock!',
  '{count} in line for this!',
  '{count} hoping for another drop!'
];

/**
 * Get announcer settings from storage
 */
export async function getAnnouncerSettings() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEY], (result) => {
      const defaults = {
        enabled: false,
        selectedTemplates: ['fire', 'lightning', 'rocket'], // Rotation
        rotateTemplates: true,
        customTemplates: [],
        showWaitlistCount: true,
        showMissedCount: true,
        announcementDelay: 2, // Seconds after sellout to announce
        cooldown: 10, // Minimum seconds between announcements
        lastAnnouncement: 0,
        lastTemplateIndex: 0
      };
      resolve({ ...defaults, ...result[STORAGE_KEY] });
    });
  });
}

/**
 * Save announcer settings
 */
export async function saveAnnouncerSettings(settings) {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [STORAGE_KEY]: settings }, resolve);
  });
}

/**
 * Get all available templates (default + custom)
 */
export async function getAllTemplates() {
  const settings = await getAnnouncerSettings();
  return [...DEFAULT_TEMPLATES, ...settings.customTemplates];
}

/**
 * Add a custom template
 */
export async function addCustomTemplate(name, template, emoji = '📢') {
  const settings = await getAnnouncerSettings();
  const id = `custom_${Date.now()}`;
  
  settings.customTemplates.push({
    id,
    name,
    template,
    emoji,
    isCustom: true
  });
  
  await saveAnnouncerSettings(settings);
  return id;
}

/**
 * Remove a custom template
 */
export async function removeCustomTemplate(id) {
  const settings = await getAnnouncerSettings();
  settings.customTemplates = settings.customTemplates.filter(t => t.id !== id);
  settings.selectedTemplates = settings.selectedTemplates.filter(t => t !== id);
  await saveAnnouncerSettings(settings);
}

/**
 * Get a random missed count message
 */
function getMissedCountMessage(count) {
  if (count <= 0) return '';
  const template = MISSED_COUNT_MESSAGES[Math.floor(Math.random() * MISSED_COUNT_MESSAGES.length)];
  return template.replace('{count}', count);
}

/**
 * Get a random waitlist info message
 */
function getWaitlistInfoMessage(count) {
  if (count <= 0) return '';
  const template = WAITLIST_INFO_MESSAGES[Math.floor(Math.random() * WAITLIST_INFO_MESSAGES.length)];
  return template.replace('{count}', count);
}

/**
 * Generate a sold-out announcement for a product
 * @param {object} product - The product that sold out
 * @param {object} options - Additional options (missedCount, etc.)
 * @returns {string|null} - Announcement message or null if disabled/cooldown
 */
export async function generateAnnouncement(product, options = {}) {
  const settings = await getAnnouncerSettings();
  
  if (!settings.enabled) {
    return null;
  }
  
  // Check cooldown
  const now = Date.now();
  if (now - settings.lastAnnouncement < settings.cooldown * 1000) {
    console.log('[BuzzChat] Announcement cooldown active, skipping');
    return null;
  }
  
  // Get all templates and filter to selected ones
  const allTemplates = await getAllTemplates();
  const selectedTemplates = allTemplates.filter(t => settings.selectedTemplates.includes(t.id));
  
  if (selectedTemplates.length === 0) {
    console.warn('[BuzzChat] No announcement templates selected');
    return null;
  }
  
  // Pick template (rotate or random)
  let template;
  if (settings.rotateTemplates) {
    const index = settings.lastTemplateIndex % selectedTemplates.length;
    template = selectedTemplates[index];
    settings.lastTemplateIndex = index + 1;
  } else {
    template = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];
  }
  
  // Get waitlist count
  const waitlistCount = await getWaitlistCount(product.id);
  
  // Build the announcement
  let announcement = template.template;
  
  // Replace placeholders
  announcement = announcement.replace(/{product}/gi, product.name);
  announcement = announcement.replace(/{item}/gi, product.name);
  announcement = announcement.replace(/{price}/gi, product.price ? `$${product.price}` : '');
  
  // Missed count (viewers who didn't buy - use provided count or estimate)
  const missedCount = options.missedCount || options.viewerCount || 0;
  const missedMessage = settings.showMissedCount ? getMissedCountMessage(missedCount) : '';
  announcement = announcement.replace(/{missedCount}/gi, missedMessage);
  
  // Waitlist info
  const waitlistMessage = settings.showWaitlistCount ? getWaitlistInfoMessage(waitlistCount) : '';
  announcement = announcement.replace(/{waitlistInfo}/gi, waitlistMessage);
  announcement = announcement.replace(/{waitlistCount}/gi, waitlistCount > 0 ? `${waitlistCount}` : '');
  
  // Clean up double spaces
  announcement = announcement.replace(/\s{2,}/g, ' ').trim();
  
  // Update last announcement time
  settings.lastAnnouncement = now;
  await saveAnnouncerSettings(settings);
  
  return announcement;
}

/**
 * Trigger a sold-out announcement (called when inventory hits 0)
 * @param {object} product - The product that just sold out
 * @param {object} options - Additional context (buyer, viewerCount, etc.)
 */
export async function triggerSoldOutAnnouncement(product, options = {}) {
  if (!product || !product.name) {
    console.warn('[BuzzChat] Cannot announce: invalid product');
    return null;
  }
  
  const settings = await getAnnouncerSettings();
  
  const announcement = await generateAnnouncement(product, options);
  
  if (!announcement) {
    return null;
  }
  
  // Send to content script to post
  try {
    await browserAPI.runtime.sendMessage({
      type: 'SOLD_OUT_ANNOUNCE',
      data: {
        announcement,
        product: {
          id: product.id,
          name: product.name
        },
        delay: settings.announcementDelay * 1000
      }
    });
    
    console.log(`[BuzzChat] Sold-out announcement triggered for ${product.name}`);
    return announcement;
  } catch (err) {
    // Content script might not be ready
    console.warn('[BuzzChat] Could not send announcement:', err.message);
    return announcement;
  }
}

/**
 * Preview an announcement template
 */
export async function previewTemplate(templateId, sampleProduct = null) {
  const allTemplates = await getAllTemplates();
  const template = allTemplates.find(t => t.id === templateId);
  
  if (!template) return 'Template not found';
  
  const product = sampleProduct || { id: 'preview', name: 'Sample Item', price: 50 };
  
  let preview = template.template;
  preview = preview.replace(/{product}/gi, product.name);
  preview = preview.replace(/{item}/gi, product.name);
  preview = preview.replace(/{price}/gi, `$${product.price || '??'}`);
  preview = preview.replace(/{missedCount}/gi, '23 people missed out!');
  preview = preview.replace(/{waitlistInfo}/gi, '8 already on the waitlist!');
  preview = preview.replace(/{waitlistCount}/gi, '8');
  
  return preview.replace(/\s{2,}/g, ' ').trim();
}

// === UI Rendering ===

/**
 * Render the announcer settings panel
 */
export async function renderAnnouncerSettings() {
  const container = document.getElementById('soldOutAnnouncerSettings');
  if (!container) return;
  
  const settings = await getAnnouncerSettings();
  const allTemplates = await getAllTemplates();
  
  container.innerHTML = `
    <div class="feature-section">
      <div class="feature-header">
        <h4>🔥 Sold Out Announcements</h4>
        <label class="switch">
          <input type="checkbox" id="announcerEnabled" ${settings.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      
      <p class="feature-description">
        Auto-announce when items sell out. Create FOMO and urgency to drive future sales!
      </p>
      
      <div class="announcer-options ${settings.enabled ? '' : 'disabled'}">
        <div class="form-group">
          <label>Templates (select multiple for rotation)</label>
          <div class="template-grid" id="templateGrid">
            ${allTemplates.map(t => `
              <div class="template-chip ${settings.selectedTemplates.includes(t.id) ? 'selected' : ''}" 
                   data-template-id="${t.id}" title="Click to preview">
                <span class="template-emoji">${t.emoji}</span>
                <span class="template-name">${t.name}</span>
                ${t.isCustom ? '<button class="template-delete" data-delete-id="' + t.id + '">×</button>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="form-group">
          <label>Preview</label>
          <div class="announcement-preview" id="announcementPreview">
            Select a template to preview...
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>
              <input type="checkbox" id="showWaitlistCount" ${settings.showWaitlistCount ? 'checked' : ''}>
              Show waitlist count
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="showMissedCount" ${settings.showMissedCount ? 'checked' : ''}>
              Show "X missed out"
            </label>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Announce delay (seconds)</label>
            <input type="number" id="announcementDelay" value="${settings.announcementDelay}" min="0" max="30">
          </div>
          <div class="form-group">
            <label>Cooldown (seconds)</label>
            <input type="number" id="announcementCooldown" value="${settings.cooldown}" min="5" max="120">
          </div>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="rotateTemplates" ${settings.rotateTemplates ? 'checked' : ''}>
            Rotate through templates (vs random)
          </label>
        </div>
        
        <div class="divider"></div>
        
        <div class="form-group">
          <label>Add Custom Template</label>
          <div class="custom-template-form">
            <input type="text" id="customTemplateName" placeholder="Template name" maxlength="30">
            <input type="text" id="customTemplateEmoji" placeholder="Emoji" maxlength="4" style="width: 60px;">
          </div>
          <textarea id="customTemplateText" placeholder="Your announcement. Use: {product}, {missedCount}, {waitlistInfo}, {waitlistCount}, {price}" rows="2"></textarea>
          <button class="btn btn-secondary btn-sm" id="addCustomTemplate">+ Add Template</button>
        </div>
        
        <div class="form-group">
          <button class="btn btn-primary" id="testAnnouncement">🔔 Test Announcement</button>
        </div>
      </div>
    </div>
  `;
  
  // Event handlers
  setupAnnouncerEventHandlers(settings, allTemplates);
}

/**
 * Setup event handlers for announcer settings
 */
function setupAnnouncerEventHandlers(settings, allTemplates) {
  // Enable/disable toggle
  const enabledToggle = document.getElementById('announcerEnabled');
  enabledToggle?.addEventListener('change', async (e) => {
    settings.enabled = e.target.checked;
    await saveAnnouncerSettings(settings);
    
    const options = document.querySelector('.announcer-options');
    if (options) {
      options.classList.toggle('disabled', !settings.enabled);
    }
    
    // Update main settings flag too
    browserAPI.storage.local.get(['settings'], (result) => {
      const mainSettings = result.settings || {};
      mainSettings.inventory = mainSettings.inventory || {};
      mainSettings.inventory.fomoAnnouncements = settings.enabled;
      browserAPI.storage.local.set({ settings: mainSettings });
    });
    
    Toast.success(settings.enabled ? 'Announcements enabled!' : 'Announcements disabled');
  });
  
  // Template selection
  const templateGrid = document.getElementById('templateGrid');
  templateGrid?.addEventListener('click', async (e) => {
    const chip = e.target.closest('.template-chip');
    const deleteBtn = e.target.closest('.template-delete');
    
    if (deleteBtn) {
      e.stopPropagation();
      const id = deleteBtn.dataset.deleteId;
      if (confirm('Delete this custom template?')) {
        await removeCustomTemplate(id);
        await renderAnnouncerSettings();
        Toast.success('Template deleted');
      }
      return;
    }
    
    if (chip) {
      const id = chip.dataset.templateId;
      chip.classList.toggle('selected');
      
      if (chip.classList.contains('selected')) {
        if (!settings.selectedTemplates.includes(id)) {
          settings.selectedTemplates.push(id);
        }
      } else {
        settings.selectedTemplates = settings.selectedTemplates.filter(t => t !== id);
      }
      
      await saveAnnouncerSettings(settings);
      
      // Show preview
      const preview = await previewTemplate(id);
      const previewEl = document.getElementById('announcementPreview');
      if (previewEl) previewEl.textContent = preview;
    }
  });
  
  // Checkbox options
  const setupCheckbox = (id, key) => {
    const el = document.getElementById(id);
    el?.addEventListener('change', async (e) => {
      settings[key] = e.target.checked;
      await saveAnnouncerSettings(settings);
    });
  };
  
  setupCheckbox('showWaitlistCount', 'showWaitlistCount');
  setupCheckbox('showMissedCount', 'showMissedCount');
  setupCheckbox('rotateTemplates', 'rotateTemplates');
  
  // Number inputs
  const setupNumber = (id, key, min, max) => {
    const el = document.getElementById(id);
    el?.addEventListener('change', async (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val));
      e.target.value = val;
      settings[key] = val;
      await saveAnnouncerSettings(settings);
    });
  };
  
  setupNumber('announcementDelay', 'announcementDelay', 0, 30);
  setupNumber('announcementCooldown', 'cooldown', 5, 120);
  
  // Add custom template
  document.getElementById('addCustomTemplate')?.addEventListener('click', async () => {
    const name = document.getElementById('customTemplateName')?.value.trim();
    const emoji = document.getElementById('customTemplateEmoji')?.value.trim() || '📢';
    const template = document.getElementById('customTemplateText')?.value.trim();
    
    if (!name || !template) {
      Toast.warning('Please enter a name and template text');
      return;
    }
    
    if (!template.includes('{product}')) {
      Toast.warning('Template should include {product} placeholder');
      return;
    }
    
    await addCustomTemplate(name, template, emoji);
    await renderAnnouncerSettings();
    Toast.success('Custom template added!');
  });
  
  // Test announcement
  document.getElementById('testAnnouncement')?.addEventListener('click', async () => {
    const testProduct = { id: 'test', name: 'Test Product', price: 99 };
    const announcement = await generateAnnouncement(testProduct, { missedCount: 15 });
    
    if (announcement) {
      Toast.success(`Preview: ${announcement}`);
      
      // Also try to send to content script
      browserAPI.runtime.sendMessage({
        type: 'SOLD_OUT_ANNOUNCE',
        data: {
          announcement,
          product: testProduct,
          delay: 0,
          isTest: true
        }
      }).catch(() => {});
    } else {
      Toast.warning('Enable announcements and select at least one template');
    }
  });
}

// Export
export default {
  getAnnouncerSettings,
  saveAnnouncerSettings,
  getAllTemplates,
  addCustomTemplate,
  removeCustomTemplate,
  generateAnnouncement,
  triggerSoldOutAnnouncement,
  previewTemplate,
  renderAnnouncerSettings,
  DEFAULT_TEMPLATES
};
