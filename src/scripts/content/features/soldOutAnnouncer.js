// BuzzChat - Sold Out Announcer (Content Script)
// Inject sold-out announcements into the chat

import { browserAPI } from '../config.js';
import { state } from '../state.js';
import { sendChatMessage } from '../sender.js';

// Track announcement history to prevent duplicates
const announcementHistory = new Map();
const HISTORY_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up old announcement history entries
 */
function cleanupHistory() {
  const now = Date.now();
  for (const [key, timestamp] of announcementHistory.entries()) {
    if (now - timestamp > HISTORY_EXPIRY_MS) {
      announcementHistory.delete(key);
    }
  }
}

/**
 * Check if we recently announced this product
 */
function wasRecentlyAnnounced(productId) {
  cleanupHistory();
  return announcementHistory.has(productId);
}

/**
 * Mark product as announced
 */
function markAnnounced(productId) {
  announcementHistory.set(productId, Date.now());
}

/**
 * Handle sold-out announcement from popup/background
 */
export function handleSoldOutAnnouncement(data) {
  if (!data || !data.announcement) {
    console.warn('[BuzzChat] Invalid announcement data');
    return false;
  }
  
  // Check if announcements are enabled (unless it's a test)
  if (!data.isTest && !state.settings?.inventory?.fomoAnnouncements) {
    console.log('[BuzzChat] FOMO announcements disabled, skipping');
    return false;
  }
  
  // Check for duplicate announcement
  if (data.product?.id && wasRecentlyAnnounced(data.product.id)) {
    console.log('[BuzzChat] Already announced this product recently, skipping');
    return false;
  }
  
  const delay = data.delay || 0;
  
  // Schedule the announcement
  setTimeout(() => {
    sendChatMessage(data.announcement);
    
    // Mark as announced
    if (data.product?.id) {
      markAnnounced(data.product.id);
    }
    
    console.log(`[BuzzChat] 🔥 Posted sold-out announcement: ${data.announcement}`);
  }, delay);
  
  return true;
}

/**
 * Generate a quick FOMO announcement (for immediate use)
 * Fallback if popup doesn't have templates configured
 */
export function generateQuickAnnouncement(productName, waitlistCount = 0) {
  const templates = [
    `🔥 SOLD OUT! ${productName} is GONE! ${waitlistCount > 0 ? `${waitlistCount} people missed it!` : ''} Don't sleep on the next one!`,
    `⚡ ${productName} SOLD in seconds! ${waitlistCount > 0 ? `${waitlistCount} on the waitlist!` : ''} Follow for restocks!`,
    `🚀 ${productName} = SOLD! ${waitlistCount > 0 ? `${waitlistCount} waiting for more!` : ''} That was FAST!`,
    `💥 BOOM! ${productName} is officially SOLD OUT! ${waitlistCount > 0 ? `${waitlistCount} too slow!` : ''} More heat coming!`,
    `🚨 SOLD OUT ALERT! ${productName} just flew! ${waitlistCount > 0 ? `${waitlistCount} in line!` : ''} Stay tuned!`
  ];
  
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Announce sold-out status for a product (local trigger)
 */
export async function announceSoldOut(product, options = {}) {
  if (!product || !product.name) return false;
  
  // Check if already announced
  if (product.id && wasRecentlyAnnounced(product.id)) {
    return false;
  }
  
  // Check if enabled
  if (!state.settings?.inventory?.fomoAnnouncements) {
    return false;
  }
  
  // Try to get announcement from popup (has templates)
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: 'GET_SOLD_OUT_ANNOUNCEMENT',
      data: { product, options }
    });
    
    if (response?.announcement) {
      handleSoldOutAnnouncement({
        announcement: response.announcement,
        product,
        delay: options.delay || 2000
      });
      return true;
    }
  } catch (err) {
    // Popup not available, use local fallback
    console.log('[BuzzChat] Using fallback announcement');
  }
  
  // Fallback to local generation
  const waitlistCount = options.waitlistCount || 0;
  const announcement = generateQuickAnnouncement(product.name, waitlistCount);
  
  handleSoldOutAnnouncement({
    announcement,
    product,
    delay: options.delay || 2000
  });
  
  return true;
}

/**
 * Initialize message listener for announcements
 */
export function initAnnouncerListener() {
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SOLD_OUT_ANNOUNCE') {
      const success = handleSoldOutAnnouncement(message.data);
      sendResponse({ success });
      return false;
    }
    
    // Handle request for announcement generation (if we had local templates)
    if (message.type === 'TRIGGER_SOLD_OUT_ANNOUNCEMENT') {
      announceSoldOut(message.data?.product, message.data?.options)
        .then(success => sendResponse({ success }))
        .catch(() => sendResponse({ success: false }));
      return true; // Keep channel open for async
    }
    
    return false;
  });
}

// Auto-initialize listener
initAnnouncerListener();

export default {
  handleSoldOutAnnouncement,
  generateQuickAnnouncement,
  announceSoldOut,
  initAnnouncerListener
};
