// BuzzChat - Waitlist Management
// Capture demand for sold-out items

import { browserAPI } from '../core/config.js';
import { Toast } from '../ui/toast.js';
import { getProducts, getStatusBadge } from './inventory.js';

// Storage key
const STORAGE_KEY = 'buzzchatWaitlists';

// Waitlist entry schema
// {
//   productId: string,
//   entries: [{ username, addedAt, notified? }],
//   createdAt: timestamp,
//   updatedAt: timestamp
// }

/**
 * Get all waitlists from storage
 */
export async function getWaitlists() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

/**
 * Save waitlists to storage
 */
async function saveWaitlists(waitlists) {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [STORAGE_KEY]: waitlists }, resolve);
  });
}

/**
 * Add a buyer to the waitlist for a product
 * @param {string} productId - Product ID
 * @param {string} username - Buyer's username
 * @returns {object|null} - Updated waitlist entry or null if already on list
 */
export async function addToWaitlist(productId, username) {
  if (!productId || !username) return null;
  
  const waitlists = await getWaitlists();
  const normalizedUsername = username.toLowerCase().trim();
  
  // Initialize waitlist for product if doesn't exist
  if (!waitlists[productId]) {
    waitlists[productId] = {
      productId,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
  
  // Check if user is already on the waitlist
  const existingEntry = waitlists[productId].entries.find(
    e => e.username.toLowerCase() === normalizedUsername
  );
  
  if (existingEntry) {
    return null; // Already on list
  }
  
  // Add to waitlist
  waitlists[productId].entries.push({
    username: username.trim(),
    addedAt: Date.now(),
    notified: false
  });
  waitlists[productId].updatedAt = Date.now();
  
  await saveWaitlists(waitlists);
  
  // Notify popup of waitlist update
  browserAPI.runtime.sendMessage({
    type: 'WAITLIST_UPDATED',
    data: {
      productId,
      count: waitlists[productId].entries.length
    }
  }).catch(() => {}); // Popup may not be open
  
  return waitlists[productId];
}

/**
 * Get waitlist for a specific product
 * @param {string} productId - Product ID
 * @returns {array} - Array of waitlist entries
 */
export async function getWaitlist(productId) {
  if (!productId) return [];
  
  const waitlists = await getWaitlists();
  return waitlists[productId]?.entries || [];
}

/**
 * Get waitlist count for a product
 * @param {string} productId - Product ID
 * @returns {number} - Number of people waiting
 */
export async function getWaitlistCount(productId) {
  const entries = await getWaitlist(productId);
  return entries.length;
}

/**
 * Prepare notification messages for waitlist
 * @param {string} productId - Product ID
 * @param {string} message - Custom message to send (use {username} for personalization)
 * @returns {array} - Array of { username, message } to send
 */
export async function notifyWaitlist(productId, message) {
  if (!productId) return [];
  
  const waitlists = await getWaitlists();
  const waitlist = waitlists[productId];
  
  if (!waitlist || waitlist.entries.length === 0) {
    return [];
  }
  
  // Get product info for context
  const products = await getProducts();
  const product = products.find(p => p.id === productId);
  const productName = product?.name || 'the item';
  
  // Prepare messages for each user
  const notifications = waitlist.entries.map(entry => ({
    username: entry.username,
    message: message
      .replace(/{username}/gi, entry.username)
      .replace(/{product}/gi, productName)
      .replace(/{item}/gi, productName)
  }));
  
  // Mark all as notified
  waitlist.entries.forEach(e => e.notified = true);
  waitlist.updatedAt = Date.now();
  
  await saveWaitlists(waitlists);
  
  return notifications;
}

/**
 * Clear waitlist for a product (e.g., when restocked)
 * @param {string} productId - Product ID
 */
export async function clearWaitlist(productId) {
  if (!productId) return;
  
  const waitlists = await getWaitlists();
  delete waitlists[productId];
  await saveWaitlists(waitlists);
  
  // Notify popup
  browserAPI.runtime.sendMessage({
    type: 'WAITLIST_CLEARED',
    data: { productId }
  }).catch(() => {});
}

/**
 * Remove a specific user from waitlist
 * @param {string} productId - Product ID
 * @param {string} username - Username to remove
 */
export async function removeFromWaitlist(productId, username) {
  if (!productId || !username) return;
  
  const waitlists = await getWaitlists();
  if (!waitlists[productId]) return;
  
  const normalizedUsername = username.toLowerCase();
  waitlists[productId].entries = waitlists[productId].entries.filter(
    e => e.username.toLowerCase() !== normalizedUsername
  );
  waitlists[productId].updatedAt = Date.now();
  
  await saveWaitlists(waitlists);
}

/**
 * Get overall waitlist statistics
 * @returns {object} - Stats about all waitlists
 */
export async function getWaitlistStats() {
  const waitlists = await getWaitlists();
  const products = await getProducts();
  
  let totalWaiting = 0;
  let productsWithWaitlist = 0;
  const productStats = [];
  
  for (const [productId, waitlist] of Object.entries(waitlists)) {
    const count = waitlist.entries.length;
    if (count > 0) {
      totalWaiting += count;
      productsWithWaitlist++;
      
      // Get product name
      const product = products.find(p => p.id === productId);
      productStats.push({
        productId,
        productName: product?.name || 'Unknown Product',
        waitingCount: count,
        oldestEntry: Math.min(...waitlist.entries.map(e => e.addedAt)),
        notifiedCount: waitlist.entries.filter(e => e.notified).length
      });
    }
  }
  
  return {
    totalWaiting,
    productsWithWaitlist,
    productStats: productStats.sort((a, b) => b.waitingCount - a.waitingCount),
    hottest: productStats[0] || null
  };
}

// === Auto-capture patterns ===

// Patterns that indicate someone asking about availability
const AVAILABILITY_PATTERNS = [
  /\b(?:is|are)\s+(?:the\s+)?(.+?)\s+(?:still\s+)?(?:available|in\s*stock|for\s+sale)\b/i,
  /\b(?:do\s+you\s+(?:still\s+)?have|got\s+any)\s+(?:the\s+)?(.+?)\s*(?:\?|left|available)?\b/i,
  /\b(?:any\s+)?(.+?)\s+(?:left|remaining|available)\s*\??\b/i,
  /\bwant(?:ed)?\s+(?:the\s+)?(.+?)\s*(?:so\s+bad|badly)?\b/i,
  /\b(?:still\s+)?(?:selling|have)\s+(?:the\s+)?(.+?)\s*\??\b/i,
  /\blooking\s+for\s+(?:the\s+)?(.+?)\b/i,
  /\bneed\s+(?:the\s+)?(.+?)\b/i
];

/**
 * Check if a message is asking about product availability
 * @param {string} message - Chat message
 * @returns {object|null} - { isAsking: boolean, productHint?: string }
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
 * Find matching sold-out product from availability query
 * @param {string} productHint - Partial product name from message
 * @returns {object|null} - Matching product or null
 */
export async function findSoldOutMatch(productHint) {
  if (!productHint) return null;
  
  const products = await getProducts();
  const soldOut = products.filter(p => p.quantity === 0);
  
  if (soldOut.length === 0) return null;
  
  const hintLower = productHint.toLowerCase();
  const hintWords = hintLower.split(/\s+/);
  
  // Score each sold-out product
  let bestMatch = null;
  let bestScore = 0;
  
  for (const product of soldOut) {
    const nameLower = product.name.toLowerCase();
    const nameWords = nameLower.split(/\s+/);
    
    // Count matching words
    let score = 0;
    for (const hWord of hintWords) {
      if (hWord.length < 2) continue;
      for (const nWord of nameWords) {
        if (nWord.includes(hWord) || hWord.includes(nWord)) {
          score += hWord.length;
        }
      }
    }
    
    // Bonus for exact substring match
    if (nameLower.includes(hintLower) || hintLower.includes(nameLower)) {
      score += 10;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = product;
    }
  }
  
  // Only return if we have a reasonable match
  return bestScore >= 3 ? bestMatch : null;
}

/**
 * Generate waitlist offer response for sold-out item
 * @param {object} product - The sold-out product
 * @param {string} username - Who asked
 * @returns {string} - Response message
 */
export function generateWaitlistOffer(product, username) {
  const waitlistCount = product._waitlistCount || 0;
  
  const responses = [
    `Sorry ${username}, the ${product.name} just sold out! 😢 Want me to add you to the waitlist? 📝`,
    `Aw no ${username}! ${product.name} is gone! 💨 I can put you on the waitlist - type "yes" to join!`,
    `${username} - ${product.name} sold out fast! 🔥 Reply "waitlist" and I'll notify you when it's back!`,
    `Sorry fam! ${product.name} = SOLD OUT! 😭 Say "add me" to get on the waitlist, ${username}!`
  ];
  
  // If others are waiting, add FOMO
  if (waitlistCount > 0) {
    return `${responses[Math.floor(Math.random() * responses.length)]} (${waitlistCount} already waiting!)`;
  }
  
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Generate FOMO announcement when item sells out
 * @param {object} product - The product that just sold out
 * @returns {string} - Announcement message
 */
export async function generateSoldOutAnnouncement(product) {
  const waitlistCount = await getWaitlistCount(product.id);
  
  const messages = [
    `🔥 SOLD OUT! ${product.name} is GONE! ${waitlistCount > 0 ? `${waitlistCount} people missed out!` : ''} Follow for restocks! 📦`,
    `💨 ${product.name} just FLEW off the shelf! ${waitlistCount > 0 ? `${waitlistCount} in line waiting!` : ''} Don't miss the next drop! 🚀`,
    `❌ ${product.name} = SOLD! ${waitlistCount > 0 ? `${waitlistCount} on the waitlist!` : ''} Stay tuned for more heat! 🔥`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

// === UI Rendering ===

/**
 * Get waitlist badge HTML for inventory item
 * @param {object} product - Product object
 * @returns {string} - Badge HTML or empty string
 */
export async function getWaitlistBadge(product) {
  if (product.quantity > 0) return '';
  
  const count = await getWaitlistCount(product.id);
  if (count === 0) return '';
  
  return `<span class="waitlist-badge" title="${count} people waiting">📝 ${count} waiting</span>`;
}

/**
 * Render waitlist modal for a product
 * @param {string} productId - Product ID
 */
export async function showWaitlistModal(productId) {
  const products = await getProducts();
  const product = products.find(p => p.id === productId);
  const entries = await getWaitlist(productId);
  
  if (!product) {
    Toast.error('Product not found');
    return;
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'waitlistModal';
  
  const content = document.createElement('div');
  content.className = 'modal-content';
  
  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <h3>📝 Waitlist: ${product.name}</h3>
    <button class="modal-close" id="closeWaitlistModal">&times;</button>
  `;
  
  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';
  
  if (entries.length === 0) {
    body.innerHTML = `
      <div class="empty-state-inline">
        <span class="empty-icon">📭</span>
        <p>No one on the waitlist yet</p>
      </div>
    `;
  } else {
    const list = document.createElement('ul');
    list.className = 'waitlist-entries';
    
    entries.forEach((entry, i) => {
      const li = document.createElement('li');
      li.className = 'waitlist-entry';
      const addedDate = new Date(entry.addedAt).toLocaleDateString();
      li.innerHTML = `
        <span class="entry-number">${i + 1}.</span>
        <span class="entry-username">${entry.username}</span>
        <span class="entry-date">${addedDate}</span>
        ${entry.notified ? '<span class="entry-notified">✓ notified</span>' : ''}
        <button class="btn btn-sm btn-danger remove-entry" data-username="${entry.username}">×</button>
      `;
      list.appendChild(li);
    });
    
    body.appendChild(list);
    
    // Notify section
    const notifySection = document.createElement('div');
    notifySection.className = 'notify-section';
    notifySection.innerHTML = `
      <textarea id="waitlistNotifyMsg" placeholder="Message to send (use {username} and {product})"
        rows="2">Hey {username}! Good news - {product} is back in stock! 🎉 Grab it now!</textarea>
      <button class="btn btn-primary" id="notifyAllBtn">📢 Notify All (${entries.length})</button>
    `;
    body.appendChild(notifySection);
  }
  
  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  footer.innerHTML = `
    <button class="btn btn-secondary" id="clearWaitlistBtn">🗑️ Clear Waitlist</button>
  `;
  
  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  document.getElementById('closeWaitlistModal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  // Remove individual entry
  body.querySelectorAll('.remove-entry').forEach(btn => {
    btn.onclick = async () => {
      const username = btn.dataset.username;
      await removeFromWaitlist(productId, username);
      modal.remove();
      showWaitlistModal(productId); // Refresh
      Toast.success(`Removed ${username} from waitlist`);
    };
  });
  
  // Notify all
  const notifyBtn = document.getElementById('notifyAllBtn');
  if (notifyBtn) {
    notifyBtn.onclick = async () => {
      const msg = document.getElementById('waitlistNotifyMsg').value.trim();
      if (!msg) {
        Toast.warning('Please enter a message');
        return;
      }
      
      const notifications = await notifyWaitlist(productId, msg);
      
      if (notifications.length > 0) {
        // Send to content script to post messages
        browserAPI.runtime.sendMessage({
          type: 'WAITLIST_NOTIFY',
          data: { notifications }
        }).catch(() => {});
        
        Toast.success(`📢 Notifying ${notifications.length} people!`);
        modal.remove();
      }
    };
  }
  
  // Clear waitlist
  document.getElementById('clearWaitlistBtn').onclick = async () => {
    if (confirm('Clear entire waitlist? This cannot be undone.')) {
      await clearWaitlist(productId);
      modal.remove();
      Toast.success('Waitlist cleared');
    }
  };
}

/**
 * Render waitlist stats section
 */
export async function renderWaitlistStats() {
  const container = document.getElementById('waitlistStats');
  if (!container) return;
  
  const stats = await getWaitlistStats();
  
  if (stats.totalWaiting === 0) {
    container.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">📝 Waitlist</span>
        <span class="stat-value">No one waiting</span>
      </div>
    `;
    return;
  }
  
  let html = `
    <div class="stat-item">
      <span class="stat-label">📝 Total Waiting</span>
      <span class="stat-value">${stats.totalWaiting} people</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">📦 Products with Waitlist</span>
      <span class="stat-value">${stats.productsWithWaitlist}</span>
    </div>
  `;
  
  if (stats.hottest) {
    html += `
      <div class="stat-item stat-hot">
        <span class="stat-label">🔥 Most Wanted</span>
        <span class="stat-value">${stats.hottest.productName} (${stats.hottest.waitingCount})</span>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Export for use in other modules
export default {
  addToWaitlist,
  getWaitlist,
  getWaitlistCount,
  notifyWaitlist,
  clearWaitlist,
  removeFromWaitlist,
  getWaitlistStats,
  detectAvailabilityQuery,
  findSoldOutMatch,
  generateWaitlistOffer,
  generateSoldOutAnnouncement,
  getWaitlistBadge,
  showWaitlistModal,
  renderWaitlistStats
};
