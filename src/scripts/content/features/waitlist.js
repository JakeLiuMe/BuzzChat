// BuzzChat - Waitlist Auto-Capture
// Detect availability queries and offer waitlist signup

import { browserAPI } from '../config.js';
import { state } from '../state.js';
import { sendChatMessage } from '../sender.js';

// Patterns that indicate someone asking about availability
const AVAILABILITY_PATTERNS = [
  /\b(?:is|are)\s+(?:the\s+)?(.+?)\s+(?:still\s+)?(?:available|in\s*stock|for\s+sale)\b/i,
  /\b(?:do\s+you\s+(?:still\s+)?have|got\s+any)\s+(?:the\s+)?(.+?)\s*(?:\?|left|available)?\b/i,
  /\b(?:any\s+)?(.+?)\s+(?:left|remaining|available)\s*\??\b/i,
  /\b(?:still\s+)?(?:selling|have)\s+(?:the\s+)?(.+?)\s*\??\b/i,
  /\blooking\s+for\s+(?:the\s+)?(.+?)\b/i
];

// Patterns for waitlist confirmation
const WAITLIST_CONFIRM_PATTERNS = [
  /\b(yes|yeah|yep|yea|yup|sure|ok|okay|please|pls)\b/i,
  /\bwaitlist\b/i,
  /\badd\s*me\b/i,
  /\bput\s*me\b/i,
  /\bsign\s*(?:me\s+)?up\b/i,
  /\binterested\b/i,
  /\bi['']?m\s+(?:in|down)\b/i
];

// Track pending waitlist offers (user -> product info)
const pendingOffers = new Map();

// Clean up old pending offers (5 minute timeout)
function cleanupPendingOffers() {
  const now = Date.now();
  for (const [username, offer] of pendingOffers.entries()) {
    if (now - offer.timestamp > 5 * 60 * 1000) {
      pendingOffers.delete(username);
    }
  }
}

/**
 * Check if a message is asking about product availability
 */
export function detectAvailabilityQuery(message) {
  if (!message || typeof message !== 'string') return null;
  
  for (const pattern of AVAILABILITY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const productHint = match[1]?.trim();
      // Filter out common non-product words
      if (productHint && productHint.length > 2 && productHint.length < 60) {
        if (!/^(it|this|that|one|any|some|them|those)$/i.test(productHint)) {
          return { isAsking: true, productHint };
        }
      }
      return { isAsking: true, productHint: null };
    }
  }
  
  return null;
}

/**
 * Check if user is confirming waitlist signup
 */
export function detectWaitlistConfirmation(message) {
  if (!message || typeof message !== 'string') return false;
  return WAITLIST_CONFIRM_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Check message for availability query on sold-out item
 */
export async function checkWaitlistTrigger(messageText, username) {
  // Check if inventory/waitlist feature is enabled
  if (!state.settings?.inventory?.enabled) return;
  
  cleanupPendingOffers();
  const userKey = username.toLowerCase();
  
  // Check if this user has a pending waitlist offer
  if (pendingOffers.has(userKey)) {
    if (detectWaitlistConfirmation(messageText)) {
      const offer = pendingOffers.get(userKey);
      pendingOffers.delete(userKey);
      
      // Add to waitlist via background
      browserAPI.runtime.sendMessage({
        type: 'WAITLIST_ADD',
        data: {
          productId: offer.productId,
          username: username
        }
      }).catch(() => {});
      
      // Send confirmation
      const confirmMsg = `✅ Got you ${username}! You're on the waitlist for ${offer.productName}. I'll let you know when it's back! 🔔`;
      sendChatMessage(confirmMsg);
      
      console.log(`[BuzzChat] Added ${username} to waitlist for ${offer.productName}`);
      return;
    }
  }
  
  // Check for new availability query
  const query = detectAvailabilityQuery(messageText);
  if (!query?.isAsking) return;
  
  // Ask background to check inventory
  try {
    const response = await browserAPI.runtime.sendMessage({
      type: 'CHECK_AVAILABILITY',
      data: {
        productHint: query.productHint,
        username: username
      }
    });
    
    if (response?.soldOut && response.product) {
      // Product is sold out - offer waitlist
      pendingOffers.set(userKey, {
        productId: response.product.id,
        productName: response.product.name,
        timestamp: Date.now()
      });
      
      // Generate offer message
      const waitlistCount = response.waitlistCount || 0;
      let offerMsg = `Sorry ${username}! ${response.product.name} is sold out 😢 Want me to add you to the waitlist? Just say "yes"! 📝`;
      
      if (waitlistCount > 0) {
        offerMsg = `Sorry ${username}! ${response.product.name} is sold out 😢 (${waitlistCount} people waiting!) Want on the list? Say "yes"! 📝`;
      }
      
      sendChatMessage(offerMsg);
      console.log(`[BuzzChat] Offered waitlist to ${username} for ${response.product.name}`);
    }
  } catch (err) {
    console.warn('[BuzzChat] Availability check failed:', err.message);
  }
}

/**
 * Handle waitlist notifications (send messages to users)
 */
export function handleWaitlistNotifications(notifications) {
  if (!notifications || !Array.isArray(notifications)) return;
  
  // Send notifications with delay to avoid spam
  notifications.forEach((notification, index) => {
    setTimeout(() => {
      sendChatMessage(notification.message);
    }, index * 2000); // 2 second delay between each
  });
}

/**
 * Handle FOMO sold-out announcement
 */
export function handleSoldOutAnnouncement(announcement) {
  if (!announcement || !state.settings?.inventory?.fomoAnnouncements) return;
  
  sendChatMessage(announcement);
  console.log('[BuzzChat] Posted FOMO sold-out announcement');
}

// Initialize message listener for waitlist notifications
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WAITLIST_NOTIFY') {
    handleWaitlistNotifications(message.data?.notifications);
    sendResponse({ success: true });
  }
  
  if (message.type === 'INVENTORY_SOLD_OUT_ANNOUNCE') {
    handleSoldOutAnnouncement(message.data?.announcement);
    sendResponse({ success: true });
  }
  
  return false;
});

export default {
  detectAvailabilityQuery,
  detectWaitlistConfirmation,
  checkWaitlistTrigger,
  handleWaitlistNotifications,
  handleSoldOutAnnouncement
};
