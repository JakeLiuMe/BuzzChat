// BuzzChat - Buyer Profile Management
// Track repeat customers and purchase history

import { browserAPI } from '../core/config.js';

// Storage key
const STORAGE_KEY = 'buzzchatBuyers';

// Buyer profile schema
// {
//   username: string,
//   firstSeen: timestamp,
//   lastSeen: timestamp,
//   totalPurchases: number,
//   totalSpent: number,
//   purchaseHistory: [{ date, item, price }],
//   interactions: number,
//   tags: ['vip', 'fast-payer', 'frequent'],
//   notes: string,
//   platform: string
// }

/**
 * Get all buyers from storage
 */
export async function getBuyers() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

/**
 * Save buyers to storage
 */
async function saveBuyers(buyers) {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [STORAGE_KEY]: buyers }, resolve);
  });
}

/**
 * Get a single buyer profile
 */
export async function getBuyerProfile(username) {
  if (!username) return null;
  const buyers = await getBuyers();
  return buyers[username.toLowerCase()] || null;
}

/**
 * Create or update a buyer profile
 */
async function upsertBuyer(username, updates) {
  if (!username) return null;
  
  const key = username.toLowerCase();
  const buyers = await getBuyers();
  
  const existing = buyers[key] || {
    username: username,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    totalPurchases: 0,
    totalSpent: 0,
    purchaseHistory: [],
    interactions: 0,
    tags: [],
    notes: '',
    platform: null
  };
  
  buyers[key] = {
    ...existing,
    ...updates,
    lastSeen: Date.now()
  };
  
  await saveBuyers(buyers);
  return buyers[key];
}

/**
 * Record a chat interaction (increments interaction count)
 */
export async function recordInteraction(username, platform = null) {
  if (!username) return null;
  
  const profile = await getBuyerProfile(username);
  const interactions = (profile?.interactions || 0) + 1;
  
  return upsertBuyer(username, {
    interactions,
    platform: platform || profile?.platform
  });
}

/**
 * Record a purchase
 */
export async function recordPurchase(username, itemName, price, platform = null) {
  if (!username) return null;
  
  const profile = await getBuyerProfile(username);
  const purchaseHistory = profile?.purchaseHistory || [];
  
  purchaseHistory.push({
    date: Date.now(),
    item: itemName,
    price: parseFloat(price) || 0
  });
  
  const totalPurchases = purchaseHistory.length;
  const totalSpent = purchaseHistory.reduce((sum, p) => sum + (p.price || 0), 0);
  
  // Auto-tag based on behavior
  const tags = profile?.tags || [];
  
  // VIP: 3+ purchases or $200+ spent
  if (totalPurchases >= 3 || totalSpent >= 200) {
    if (!tags.includes('vip')) tags.push('vip');
  }
  
  // Frequent: 5+ purchases
  if (totalPurchases >= 5 && !tags.includes('frequent')) {
    tags.push('frequent');
  }
  
  return upsertBuyer(username, {
    purchaseHistory,
    totalPurchases,
    totalSpent,
    tags,
    platform: platform || profile?.platform
  });
}

/**
 * Get repeat buyers (2+ purchases)
 */
export async function getRepeatBuyers() {
  const buyers = await getBuyers();
  return Object.values(buyers)
    .filter(b => b.totalPurchases >= 2)
    .sort((a, b) => b.totalPurchases - a.totalPurchases);
}

/**
 * Get VIP buyers (3+ purchases or $200+ spent)
 */
export async function getVIPBuyers() {
  const buyers = await getBuyers();
  return Object.values(buyers)
    .filter(b => b.tags?.includes('vip'))
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

/**
 * Get top buyers by spend
 */
export async function getTopBuyers(limit = 10) {
  const buyers = await getBuyers();
  return Object.values(buyers)
    .filter(b => b.totalPurchases > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

/**
 * Get recently active buyers
 */
export async function getRecentBuyers(limit = 10) {
  const buyers = await getBuyers();
  return Object.values(buyers)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, limit);
}

/**
 * Generate personalized welcome message for a buyer
 */
export async function generateWelcomeMessage(username, defaultMessage = 'Welcome!') {
  const profile = await getBuyerProfile(username);
  
  if (!profile) return defaultMessage;
  
  // VIP welcome
  if (profile.tags?.includes('vip')) {
    return `Welcome back, ${username}! 🌟 So glad to see one of our VIPs! (${profile.totalPurchases} purchases, $${profile.totalSpent.toFixed(0)} total)`;
  }
  
  // Repeat customer
  if (profile.totalPurchases >= 2) {
    return `Hey ${username}! 💛 Welcome back! You've grabbed ${profile.totalPurchases} items from us before!`;
  }
  
  // Returning viewer (interacted before)
  if (profile.interactions >= 3) {
    return `${username}! 👋 Good to see you again!`;
  }
  
  return defaultMessage;
}

/**
 * Check if a user is a VIP
 */
export async function isVIP(username) {
  const profile = await getBuyerProfile(username);
  return profile?.tags?.includes('vip') || false;
}

/**
 * Check if a user is a repeat buyer
 */
export async function isRepeatBuyer(username) {
  const profile = await getBuyerProfile(username);
  return (profile?.totalPurchases || 0) >= 2;
}

/**
 * Add a tag to a buyer
 */
export async function addTag(username, tag) {
  const profile = await getBuyerProfile(username);
  if (!profile) return null;
  
  const tags = profile.tags || [];
  if (!tags.includes(tag)) {
    tags.push(tag);
  }
  
  return upsertBuyer(username, { tags });
}

/**
 * Remove a tag from a buyer
 */
export async function removeTag(username, tag) {
  const profile = await getBuyerProfile(username);
  if (!profile) return null;
  
  const tags = (profile.tags || []).filter(t => t !== tag);
  return upsertBuyer(username, { tags });
}

/**
 * Add a note to a buyer
 */
export async function addNote(username, note) {
  return upsertBuyer(username, { notes: note });
}

/**
 * Get buyer stats summary
 */
export async function getBuyerStats() {
  const buyers = await getBuyers();
  const buyerList = Object.values(buyers);
  
  const totalBuyers = buyerList.length;
  const buyersWithPurchases = buyerList.filter(b => b.totalPurchases > 0).length;
  const vipCount = buyerList.filter(b => b.tags?.includes('vip')).length;
  const totalRevenue = buyerList.reduce((sum, b) => sum + (b.totalSpent || 0), 0);
  const totalPurchases = buyerList.reduce((sum, b) => sum + (b.totalPurchases || 0), 0);
  
  return {
    totalBuyers,
    buyersWithPurchases,
    vipCount,
    totalRevenue,
    totalPurchases,
    avgPurchaseValue: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
    avgPurchasesPerBuyer: buyersWithPurchases > 0 ? totalPurchases / buyersWithPurchases : 0
  };
}

/**
 * Delete a buyer profile
 */
export async function deleteBuyer(username) {
  if (!username) return;
  
  const key = username.toLowerCase();
  const buyers = await getBuyers();
  delete buyers[key];
  await saveBuyers(buyers);
}

/**
 * Clear all buyer data
 */
export async function clearAllBuyers() {
  await saveBuyers({});
}

/**
 * Export buyers to JSON
 */
export async function exportBuyers() {
  const buyers = await getBuyers();
  return JSON.stringify(buyers, null, 2);
}

/**
 * Import buyers from JSON
 */
export async function importBuyers(json, merge = true) {
  try {
    const imported = JSON.parse(json);
    
    if (merge) {
      const existing = await getBuyers();
      const merged = { ...existing, ...imported };
      await saveBuyers(merged);
    } else {
      await saveBuyers(imported);
    }
    
    return true;
  } catch (e) {
    console.error('[BuzzChat] Failed to import buyers:', e);
    return false;
  }
}

// Export for use in other modules
export default {
  getBuyers,
  getBuyerProfile,
  recordInteraction,
  recordPurchase,
  getRepeatBuyers,
  getVIPBuyers,
  getTopBuyers,
  getRecentBuyers,
  generateWelcomeMessage,
  isVIP,
  isRepeatBuyer,
  addTag,
  removeTag,
  addNote,
  getBuyerStats,
  deleteBuyer,
  clearAllBuyers,
  exportBuyers,
  importBuyers
};
