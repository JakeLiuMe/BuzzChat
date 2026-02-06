// BuzzChat - Live Seller Dashboard
// Real-time stream intelligence and metrics

import { browserAPI } from '../core/config.js';
import { elements } from '../ui/elements.js';
import { Toast } from '../ui/toast.js';
import { getProducts, getSalesSummary } from './inventory.js';

// Storage keys
const STORAGE_KEYS = {
  DASHBOARD: 'buzzchatDashboard',
  ALERTS: 'buzzchatAlerts',
  MENTIONS: 'buzzchatMentions'
};

// Default dashboard state
const DEFAULT_DASHBOARD = {
  streamStart: null,
  isLive: false,
  platform: null,
  viewers: 0,
  messages: [],
  chatRate: 0, // messages per minute
  engagement: 'low',
  itemMentions: {},
  estimatedSales: 0,
  itemsSold: 0,
  lastUpdate: null
};

// Alert types
const ALERT_TYPES = {
  LOW_STOCK: 'low_stock',
  UPSET_BUYER: 'upset_buyer',
  HOT_ITEM: 'hot_item',
  PURCHASE_INTENT: 'purchase_intent',
  SUGGESTED_ACTION: 'suggested_action',
  VIP_ARRIVED: 'vip_arrived'
};

/**
 * Get dashboard state from storage
 */
export async function getDashboard() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.DASHBOARD], (result) => {
      resolve(result[STORAGE_KEYS.DASHBOARD] || { ...DEFAULT_DASHBOARD });
    });
  });
}

/**
 * Save dashboard state
 */
async function saveDashboard(dashboard) {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [STORAGE_KEYS.DASHBOARD]: dashboard }, resolve);
  });
}

/**
 * Get alerts from storage
 */
export async function getAlerts() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.ALERTS], (result) => {
      resolve(result[STORAGE_KEYS.ALERTS] || []);
    });
  });
}

/**
 * Save alerts
 */
async function saveAlerts(alerts) {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [STORAGE_KEYS.ALERTS]: alerts }, resolve);
  });
}

/**
 * Start a new stream session
 */
export async function startStream(platform = null) {
  const dashboard = {
    ...DEFAULT_DASHBOARD,
    streamStart: Date.now(),
    isLive: true,
    platform,
    lastUpdate: Date.now()
  };
  
  await saveDashboard(dashboard);
  await saveAlerts([]);
  
  return dashboard;
}

/**
 * End stream session
 */
export async function endStream() {
  const dashboard = await getDashboard();
  dashboard.isLive = false;
  dashboard.lastUpdate = Date.now();
  await saveDashboard(dashboard);
  return dashboard;
}

/**
 * Record a chat message for analytics
 */
export async function recordMessage(message, username, timestamp = Date.now()) {
  const dashboard = await getDashboard();
  
  // Keep last 100 messages for rate calculation
  dashboard.messages.push({ message, username, timestamp });
  if (dashboard.messages.length > 100) {
    dashboard.messages.shift();
  }
  
  // Calculate chat rate (messages per minute over last 5 minutes)
  const fiveMinAgo = Date.now() - (5 * 60 * 1000);
  const recentMessages = dashboard.messages.filter(m => m.timestamp > fiveMinAgo);
  dashboard.chatRate = Math.round((recentMessages.length / 5) * 10) / 10; // messages per minute
  
  // Update engagement level
  if (dashboard.chatRate > 10) {
    dashboard.engagement = 'high';
  } else if (dashboard.chatRate > 3) {
    dashboard.engagement = 'medium';
  } else {
    dashboard.engagement = 'low';
  }
  
  dashboard.lastUpdate = Date.now();
  await saveDashboard(dashboard);
  
  return dashboard;
}

/**
 * Track a product mention in chat
 */
export async function trackMention(itemName) {
  if (!itemName) return;
  
  const dashboard = await getDashboard();
  const key = itemName.toLowerCase().trim();
  
  dashboard.itemMentions[key] = (dashboard.itemMentions[key] || 0) + 1;
  dashboard.lastUpdate = Date.now();
  
  await saveDashboard(dashboard);
  
  // Check if this is now a "hot item" (10+ mentions)
  if (dashboard.itemMentions[key] === 10) {
    await addAlert(ALERT_TYPES.HOT_ITEM, `🔥 "${itemName}" is trending! (10+ mentions)`, { itemName });
  }
  
  return dashboard.itemMentions[key];
}

/**
 * Get hot items (most mentioned)
 */
export async function getHotItems(limit = 5) {
  const dashboard = await getDashboard();
  
  return Object.entries(dashboard.itemMentions)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get stream summary stats
 */
export async function getStreamSummary() {
  const dashboard = await getDashboard();
  
  const duration = dashboard.streamStart 
    ? Date.now() - dashboard.streamStart 
    : 0;
  
  const durationMinutes = Math.floor(duration / 60000);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationStr = hours > 0 
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;
  
  return {
    isLive: dashboard.isLive,
    platform: dashboard.platform,
    duration,
    durationStr,
    viewers: dashboard.viewers,
    chatRate: dashboard.chatRate,
    engagement: dashboard.engagement,
    totalMessages: dashboard.messages.length,
    estimatedSales: dashboard.estimatedSales,
    itemsSold: dashboard.itemsSold,
    hotItems: await getHotItems(3)
  };
}

/**
 * Update viewer count
 */
export async function updateViewers(count) {
  const dashboard = await getDashboard();
  dashboard.viewers = parseInt(count, 10) || 0;
  dashboard.lastUpdate = Date.now();
  await saveDashboard(dashboard);
  return dashboard;
}

/**
 * Record a sale
 */
export async function recordSale(amount, itemName = null) {
  const dashboard = await getDashboard();
  dashboard.estimatedSales += parseFloat(amount) || 0;
  dashboard.itemsSold += 1;
  dashboard.lastUpdate = Date.now();
  await saveDashboard(dashboard);
  return dashboard;
}

/**
 * Add an alert
 */
export async function addAlert(type, message, data = {}) {
  const alerts = await getAlerts();
  
  // Avoid duplicate alerts (same type + message within 5 minutes)
  const fiveMinAgo = Date.now() - (5 * 60 * 1000);
  const duplicate = alerts.find(a => 
    a.type === type && 
    a.message === message && 
    a.timestamp > fiveMinAgo
  );
  
  if (duplicate) return alerts;
  
  alerts.push({
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    message,
    data,
    timestamp: Date.now(),
    read: false
  });
  
  // Keep last 50 alerts
  if (alerts.length > 50) {
    alerts.shift();
  }
  
  await saveAlerts(alerts);
  return alerts;
}

/**
 * Mark an alert as read
 */
export async function markAlertRead(alertId) {
  const alerts = await getAlerts();
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.read = true;
    await saveAlerts(alerts);
  }
  return alerts;
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(alertId) {
  const alerts = await getAlerts();
  const filtered = alerts.filter(a => a.id !== alertId);
  await saveAlerts(filtered);
  return filtered;
}

/**
 * Get unread alerts
 */
export async function getUnreadAlerts() {
  const alerts = await getAlerts();
  return alerts.filter(a => !a.read);
}

/**
 * Clear all alerts
 */
export async function clearAlerts() {
  await saveAlerts([]);
}

/**
 * Get dashboard stats for UI display
 */
export async function getDashboardStats() {
  const dashboard = await getDashboard();
  const alerts = await getAlerts();
  const unreadAlerts = alerts.filter(a => !a.read);
  const hotItems = await getHotItems(5);
  
  return {
    isLive: dashboard.isLive,
    platform: dashboard.platform,
    viewers: dashboard.viewers,
    chatRate: dashboard.chatRate,
    engagement: dashboard.engagement,
    streamDuration: dashboard.streamStart ? Date.now() - dashboard.streamStart : 0,
    estimatedSales: dashboard.estimatedSales,
    itemsSold: dashboard.itemsSold,
    hotItems,
    alerts: unreadAlerts.slice(0, 5),
    alertCount: unreadAlerts.length
  };
}

/**
 * Reset dashboard for new stream
 */
export async function resetDashboard() {
  await saveDashboard({ ...DEFAULT_DASHBOARD });
  await saveAlerts([]);
}

/**
 * Get engagement emoji
 */
export function getEngagementEmoji(level) {
  switch (level) {
    case 'high': return '🔥';
    case 'medium': return '⚡';
    case 'low': return '😴';
    default: return '📊';
  }
}

/**
 * Format chat rate for display
 */
export function formatChatRate(rate) {
  if (rate >= 10) return `${rate}/min 🔥`;
  if (rate >= 3) return `${rate}/min`;
  return `${rate}/min`;
}

// Alert type helpers
export { ALERT_TYPES };

// ============================================
// UI Initialization & Message Listener
// ============================================

let updateIntervalId = null;

/**
 * Render dashboard stats to UI
 */
async function renderDashboardStats() {
  const stats = await getDashboardStats();
  
  // Update viewers
  if (elements.dashboardViewers) {
    elements.dashboardViewers.textContent = stats.viewers.toLocaleString();
  }
  
  // Update chat rate
  if (elements.dashboardChatRate) {
    elements.dashboardChatRate.textContent = stats.chatRate.toFixed(1);
  }
  
  // Update engagement
  if (elements.dashboardEngagement) {
    elements.dashboardEngagement.textContent = getEngagementEmoji(stats.engagement);
    elements.dashboardEngagement.className = `engagement-indicator engagement-${stats.engagement}`;
    elements.dashboardEngagement.title = `Engagement: ${stats.engagement}`;
  }
  
  // Update revenue
  if (elements.dashboardRevenue) {
    elements.dashboardRevenue.textContent = `$${stats.estimatedSales.toFixed(2)}`;
  }
  
  // Update uptime
  if (elements.dashboardUptime && stats.isLive) {
    const mins = Math.floor(stats.streamDuration / 60000);
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    elements.dashboardUptime.textContent = hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  }
  
  // Update alert badge
  if (elements.dashboardAlertBadge) {
    elements.dashboardAlertBadge.textContent = stats.alertCount.toString();
    elements.dashboardAlertBadge.style.display = stats.alertCount > 0 ? 'inline-flex' : 'none';
  }
}

/**
 * Render hot items section
 */
async function renderHotItems() {
  const container = elements.dashboardHotItems;
  if (!container) return;
  
  // Clear container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  const hotItems = await getHotItems(5);
  
  if (hotItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state-inline';
    empty.innerHTML = `
      <span class="empty-icon">🔥</span>
      <p class="empty-entries">No trending items yet</p>
    `;
    container.appendChild(empty);
    return;
  }
  
  hotItems.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'hot-item';
    
    const rank = document.createElement('span');
    rank.className = 'hot-item-rank';
    rank.textContent = `#${index + 1}`;
    
    const name = document.createElement('span');
    name.className = 'hot-item-name';
    name.textContent = item.name;
    
    const count = document.createElement('span');
    count.className = 'hot-item-count';
    count.textContent = `${item.count} mentions`;
    
    itemEl.appendChild(rank);
    itemEl.appendChild(name);
    itemEl.appendChild(count);
    container.appendChild(itemEl);
  });
}

/**
 * Render alerts section
 */
async function renderAlerts() {
  const container = elements.dashboardAlerts;
  if (!container) return;
  
  // Clear container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  const alerts = await getAlerts();
  const unreadAlerts = alerts.filter(a => !a.read);
  
  if (alerts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state-inline';
    empty.innerHTML = `
      <span class="empty-icon">🔔</span>
      <p class="empty-entries">No alerts</p>
    `;
    container.appendChild(empty);
    return;
  }
  
  // Show last 5 alerts
  alerts.slice(0, 5).forEach(alert => {
    const alertEl = document.createElement('div');
    alertEl.className = `dashboard-alert alert-${alert.type} ${alert.read ? 'read' : 'unread'}`;
    alertEl.dataset.alertId = alert.id;
    
    const message = document.createElement('span');
    message.className = 'alert-message';
    message.textContent = alert.message;
    
    const time = document.createElement('span');
    time.className = 'alert-time';
    const ago = Math.floor((Date.now() - alert.timestamp) / 1000 / 60);
    time.textContent = ago < 1 ? 'now' : `${ago}m ago`;
    
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn btn-sm btn-ghost alert-dismiss';
    dismissBtn.textContent = '×';
    dismissBtn.title = 'Dismiss';
    dismissBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await dismissAlert(alert.id);
      renderAlerts();
      renderDashboardStats();
    });
    
    alertEl.appendChild(message);
    alertEl.appendChild(time);
    alertEl.appendChild(dismissBtn);
    
    // Click to mark as read
    alertEl.addEventListener('click', async () => {
      await markAlertRead(alert.id);
      renderAlerts();
      renderDashboardStats();
    });
    
    container.appendChild(alertEl);
  });
  
  // Add clear all button
  if (alerts.length > 0) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-sm btn-secondary dashboard-clear-alerts';
    clearBtn.textContent = 'Clear All';
    clearBtn.addEventListener('click', async () => {
      await clearAlerts();
      renderAlerts();
      renderDashboardStats();
    });
    container.appendChild(clearBtn);
  }
}

/**
 * Render full dashboard
 */
export async function renderDashboard() {
  await renderDashboardStats();
  await renderHotItems();
  await renderAlerts();
}

/**
 * Check if products are mentioned in a message
 */
async function checkProductMentions(message) {
  const products = await getProducts();
  const lowerMessage = message.toLowerCase();
  
  for (const product of products) {
    const productName = product.name.toLowerCase();
    if (lowerMessage.includes(productName)) {
      await trackMention(product.name);
    }
  }
}

/**
 * Keywords that indicate upset buyers
 */
const UPSET_KEYWORDS = [
  'scam', 'fake', 'rip off', 'ripoff', 'disappointed',
  'refund', 'return', 'broken', 'damaged', 'wrong item',
  'never received', 'still waiting', 'where is my', 'bad quality'
];

/**
 * Check for upset buyer keywords
 */
function checkUpsetBuyer(message, username) {
  const lowerMessage = message.toLowerCase();
  
  for (const keyword of UPSET_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      addAlert(ALERT_TYPES.UPSET_BUYER, `⚠️ @${username} might be upset: "${message.slice(0, 50)}..."`, {
        username,
        message,
        keyword
      });
      break;
    }
  }
}

/**
 * Initialize dashboard
 */
export async function initDashboard() {
  // Initial render
  await renderDashboard();
  
  // Start update loop
  updateIntervalId = setInterval(async () => {
    await renderDashboard();
  }, 5000);
  
  // Start stream button
  if (elements.dashboardStartBtn) {
    elements.dashboardStartBtn.addEventListener('click', async () => {
      await startStream();
      Toast.success('Stream session started!');
      await renderDashboard();
    });
  }
  
  // End stream button
  if (elements.dashboardEndBtn) {
    elements.dashboardEndBtn.addEventListener('click', async () => {
      await endStream();
      Toast.info('Stream session ended');
      await renderDashboard();
    });
  }
  
  // Listen for messages from content script
  browserAPI.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'DASHBOARD_CHAT_MESSAGE') {
      const { username, message: text, timestamp } = message.data;
      await recordMessage(text, username, timestamp);
      await checkProductMentions(text);
      checkUpsetBuyer(text, username);
      await renderDashboard();
      sendResponse({ success: true });
    }
    
    if (message.type === 'DASHBOARD_VIEWER_COUNT') {
      await updateViewers(message.data.viewers);
      await renderDashboard();
      sendResponse({ success: true });
    }
    
    if (message.type === 'DASHBOARD_LOW_STOCK') {
      await addAlert(ALERT_TYPES.LOW_STOCK, `📦 Low stock: "${message.data.productName}" (${message.data.quantity} left)`, message.data);
      await renderDashboard();
      sendResponse({ success: true });
    }
    
    if (message.type === 'DASHBOARD_SOLD') {
      const { productName, price, remainingQty } = message.data;
      await recordSale(price, productName);
      await renderDashboard();
      sendResponse({ success: true });
    }
  });
}

// Cleanup on unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
    }
  });
}

// Export for use in other modules
export default {
  getDashboard,
  startStream,
  endStream,
  recordMessage,
  trackMention,
  getHotItems,
  getStreamSummary,
  updateViewers,
  recordSale,
  addAlert,
  markAlertRead,
  dismissAlert,
  getAlerts,
  getUnreadAlerts,
  clearAlerts,
  getDashboardStats,
  resetDashboard,
  getEngagementEmoji,
  formatChatRate,
  initDashboard,
  renderDashboard,
  ALERT_TYPES
};
