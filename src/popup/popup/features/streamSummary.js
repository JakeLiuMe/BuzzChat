// BuzzChat - Stream Summary Report
// Generate Instagram-worthy end-of-stream reports that sellers LOVE sharing

import { browserAPI } from '../core/config.js';
import { getSalesSummary, getProducts } from './inventory.js';
import { getDashboardStats, getStreamSummary as getDashboardSummary, getDashboard } from './dashboard.js';
import { getBuyerStats, getTopBuyers, getVIPBuyers } from './buyers.js';
import { getAchievementStats } from './achievements.js';
import { Toast } from '../ui/toast.js';
import { showConfetti } from '../ui/celebrations.js';

const STORAGE_KEY = 'buzzchatStreamHistory';
const SESSION_KEY = 'buzzchatCurrentSession';

// Session tracking for comprehensive metrics
let sessionData = {
  startTime: null,
  endTime: null,
  messagesProcessed: 0,
  uniqueUsers: new Set(),
  questionsAsked: [],
  aiResponsesSent: 0,
  peakActivity: { time: null, rate: 0 },
  activityTimeline: [], // { timestamp, messageCount }
  vipInteractions: 0,
  itemsSoldDetails: [], // { name, quantity, price, buyer, timestamp }
};

/**
 * Start a new session for tracking
 */
export function startSession() {
  sessionData = {
    startTime: Date.now(),
    endTime: null,
    messagesProcessed: 0,
    uniqueUsers: new Set(),
    questionsAsked: [],
    aiResponsesSent: 0,
    peakActivity: { time: null, rate: 0 },
    activityTimeline: [],
    vipInteractions: 0,
    itemsSoldDetails: [],
  };
  saveSessionData();
}

/**
 * Record a message for session tracking
 */
export function recordSessionMessage(username, message, isQuestion = false, isVIP = false) {
  if (!sessionData.startTime) startSession();
  
  sessionData.messagesProcessed++;
  sessionData.uniqueUsers.add(username.toLowerCase());
  
  if (isQuestion) {
    sessionData.questionsAsked.push({
      question: message.slice(0, 100),
      user: username,
      timestamp: Date.now()
    });
  }
  
  if (isVIP) {
    sessionData.vipInteractions++;
  }
  
  // Track activity timeline (bucket by minute)
  const minuteBucket = Math.floor(Date.now() / 60000) * 60000;
  const existing = sessionData.activityTimeline.find(a => a.timestamp === minuteBucket);
  if (existing) {
    existing.messageCount++;
    // Check for peak
    if (existing.messageCount > sessionData.peakActivity.rate) {
      sessionData.peakActivity = { time: minuteBucket, rate: existing.messageCount };
    }
  } else {
    sessionData.activityTimeline.push({ timestamp: minuteBucket, messageCount: 1 });
  }
  
  saveSessionData();
}

/**
 * Record an AI response
 */
export function recordAIResponse() {
  if (!sessionData.startTime) startSession();
  sessionData.aiResponsesSent++;
  saveSessionData();
}

/**
 * Record a sale for detailed tracking
 */
export function recordSessionSale(itemName, quantity, price, buyer) {
  if (!sessionData.startTime) startSession();
  sessionData.itemsSoldDetails.push({
    name: itemName,
    quantity: quantity || 1,
    price: parseFloat(price) || 0,
    buyer: buyer || 'Unknown',
    timestamp: Date.now()
  });
  saveSessionData();
}

/**
 * Save session data to storage
 */
function saveSessionData() {
  const toSave = {
    ...sessionData,
    uniqueUsers: Array.from(sessionData.uniqueUsers)
  };
  browserAPI.storage.local.set({ [SESSION_KEY]: toSave });
}

/**
 * Load session data from storage
 */
export async function loadSessionData() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([SESSION_KEY], (result) => {
      if (result[SESSION_KEY]) {
        sessionData = {
          ...result[SESSION_KEY],
          uniqueUsers: new Set(result[SESSION_KEY].uniqueUsers || [])
        };
      }
      resolve(sessionData);
    });
  });
}

/**
 * Generate comprehensive stream summary
 */
export async function generateStreamSummary() {
  await loadSessionData();
  
  const dashboard = await getDashboardSummary();
  const dashboardFull = await getDashboard();
  const sales = await getSalesSummary();
  const products = await getProducts();
  const buyers = await getBuyerStats();
  const topBuyers = await getTopBuyers(5);
  const vipBuyers = await getVIPBuyers();
  const achievements = await getAchievementStats();
  
  // Calculate stream duration
  const streamStart = sessionData.startTime || dashboardFull.streamStart || Date.now() - 3600000;
  const streamEnd = Date.now();
  const durationMs = streamEnd - streamStart;
  const durationStr = formatDuration(durationMs);
  
  // Calculate engagement rate
  const totalMessages = sessionData.messagesProcessed || dashboard.totalMessages || 0;
  const uniqueViewers = sessionData.uniqueUsers?.size || dashboard.viewers || 1;
  const engagementRate = uniqueViewers > 0 ? Math.min(100, Math.round((totalMessages / uniqueViewers) * 10)) : 0;
  
  // Get peak activity time
  const peakTime = sessionData.peakActivity?.time 
    ? new Date(sessionData.peakActivity.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'N/A';
  
  // Top questions (dedupe and count)
  const questionCounts = {};
  (sessionData.questionsAsked || []).forEach(q => {
    const key = q.question.toLowerCase().trim();
    questionCounts[key] = (questionCounts[key] || 0) + 1;
  });
  const topQuestions = Object.entries(questionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([q, count]) => ({ question: q, count }));
  
  // Items sold with quantities
  const itemsSoldMap = {};
  (sessionData.itemsSoldDetails || []).forEach(item => {
    const key = item.name.toLowerCase();
    if (!itemsSoldMap[key]) {
      itemsSoldMap[key] = { name: item.name, quantity: 0, revenue: 0 };
    }
    itemsSoldMap[key].quantity += item.quantity;
    itemsSoldMap[key].revenue += item.price * item.quantity;
  });
  const itemsSoldList = Object.values(itemsSoldMap).sort((a, b) => b.quantity - a.quantity);
  
  // Calculate total revenue from session
  const sessionRevenue = itemsSoldList.reduce((sum, item) => sum + item.revenue, 0);
  const totalRevenue = sessionRevenue || sales.totalRevenue || 0;
  const totalItemsSold = itemsSoldList.reduce((sum, item) => sum + item.quantity, 0) || sales.totalSold || 0;
  
  const summary = {
    // Metadata
    id: `stream_${Date.now()}`,
    generatedAt: Date.now(),
    streamDate: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    streamTime: new Date(streamStart).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    streamDuration: durationStr,
    durationMs: durationMs,
    platform: dashboard.platform || 'Live Stream',
    
    // Core Stats (the big numbers)
    coreStats: {
      revenue: totalRevenue,
      itemsSold: totalItemsSold,
      uniqueBuyers: buyers.buyersWithPurchases || topBuyers.length,
      viewers: uniqueViewers
    },
    
    // Performance Metrics
    performance: {
      totalMessages: totalMessages,
      chatRate: dashboard.chatRate || (totalMessages / Math.max(1, durationMs / 60000)).toFixed(1),
      engagement: dashboard.engagement || 'medium',
      engagementRate: engagementRate,
      peakActivityTime: peakTime,
      peakActivityRate: sessionData.peakActivity?.rate || 0
    },
    
    // Sales Details
    sales: {
      totalSold: totalItemsSold,
      totalRevenue: totalRevenue,
      avgItemPrice: totalItemsSold > 0 ? totalRevenue / totalItemsSold : 0,
      itemsSold: itemsSoldList.slice(0, 10), // Top 10 items
      topItems: getTopSellingItems(sales.items || []),
      conversionRate: calculateConversionRate(uniqueViewers, totalItemsSold)
    },
    
    // Inventory Status
    inventory: {
      itemsListed: products.length,
      soldOut: products.filter(p => p.quantity === 0).length,
      lowStock: products.filter(p => p.quantity > 0 && p.quantity <= 2).length,
      remainingValue: products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    },
    
    // Customer Insights
    customers: {
      uniqueBuyers: buyers.buyersWithPurchases || 0,
      vipCount: vipBuyers.length,
      vipInteractions: sessionData.vipInteractions || 0,
      topBuyers: topBuyers.map(b => ({
        username: b.username,
        spent: b.totalSpent,
        purchases: b.totalPurchases,
        isVIP: b.tags?.includes('vip')
      }))
    },
    
    // AI & Automation
    automation: {
      aiResponsesSent: sessionData.aiResponsesSent || 0,
      topQuestions: topQuestions,
      questionsAnswered: topQuestions.reduce((sum, q) => sum + q.count, 0)
    },
    
    // Achievements
    achievements: {
      unlocked: achievements.unlocked || 0,
      total: achievements.total || 0,
      recent: achievements.recent || []
    },
    
    // Insights (AI-generated tips)
    insights: generateInsights({
      revenue: totalRevenue,
      itemsSold: totalItemsSold,
      viewers: uniqueViewers,
      engagement: dashboard.engagement,
      chatRate: dashboard.chatRate,
      vipCount: vipBuyers.length,
      products: products,
      durationMs: durationMs
    })
  };
  
  // Save to history
  await saveToHistory(summary);
  
  // End session
  sessionData.endTime = Date.now();
  saveSessionData();
  
  return summary;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get top selling items from sales
 */
function getTopSellingItems(items) {
  const counts = {};
  items.forEach(item => {
    counts[item.name] = (counts[item.name] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Calculate conversion rate
 */
function calculateConversionRate(viewers, sales) {
  if (!viewers || viewers === 0) return 0;
  return Math.min(100, Math.round((sales / viewers) * 100));
}

/**
 * Generate AI-like insights based on stream data
 */
function generateInsights(data) {
  const insights = [];
  const { revenue, itemsSold, viewers, engagement, chatRate, vipCount, products, durationMs } = data;
  
  // Revenue insights
  if (revenue >= 1000) {
    insights.push({
      type: 'celebration',
      icon: '🎉',
      title: 'Big Day!',
      text: `$${revenue.toFixed(0)}+ in revenue! You crushed it!`
    });
  } else if (revenue >= 500) {
    insights.push({
      type: 'positive',
      icon: '💰',
      title: 'Great Stream!',
      text: `$${revenue.toFixed(0)} earned - solid performance!`
    });
  } else if (revenue >= 100) {
    insights.push({
      type: 'positive',
      icon: '✨',
      title: 'Nice Work!',
      text: `$${revenue.toFixed(0)} in sales this stream`
    });
  }
  
  // Sales velocity
  const hoursLive = Math.max(0.5, durationMs / 3600000);
  const salesPerHour = itemsSold / hoursLive;
  if (salesPerHour >= 10) {
    insights.push({
      type: 'positive',
      icon: '🚀',
      title: 'Sales Machine!',
      text: `${salesPerHour.toFixed(0)} items/hour - incredible pace!`
    });
  }
  
  // Engagement insights
  if (engagement === 'high' || chatRate > 10) {
    insights.push({
      type: 'positive',
      icon: '🔥',
      title: 'Chat on Fire!',
      text: `High engagement with ${chatRate}/min messages!`
    });
  } else if (engagement === 'low' && viewers > 5) {
    insights.push({
      type: 'tip',
      icon: '💡',
      title: 'Engagement Tip',
      text: 'Try asking questions or running flash sales to boost chat!'
    });
  }
  
  // VIP insights
  if (vipCount >= 3) {
    insights.push({
      type: 'positive',
      icon: '👑',
      title: 'VIP Love!',
      text: `${vipCount} VIPs showed up - your regulars love you!`
    });
  }
  
  // Inventory insights
  const soldOut = products.filter(p => p.quantity === 0).length;
  if (soldOut > 0) {
    insights.push({
      type: 'info',
      icon: '📦',
      title: 'Sold Out!',
      text: `${soldOut} item${soldOut > 1 ? 's' : ''} completely sold out!`
    });
  }
  
  // Conversion insight
  if (viewers > 0 && itemsSold > 0) {
    const conversion = (itemsSold / viewers * 100).toFixed(0);
    if (conversion >= 20) {
      insights.push({
        type: 'positive',
        icon: '🎯',
        title: 'Great Conversion!',
        text: `${conversion}% of viewers made a purchase!`
      });
    }
  }
  
  // No sales encouragement
  if (itemsSold === 0 && viewers > 0) {
    insights.push({
      type: 'tip',
      icon: '💪',
      title: 'Keep Going!',
      text: 'Every stream builds your audience. Try showcasing bestsellers next time!'
    });
  }
  
  return insights.slice(0, 4); // Max 4 insights
}

/**
 * Save summary to history
 */
async function saveToHistory(summary) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEY], (result) => {
      const history = result[STORAGE_KEY] || [];
      history.unshift(summary);
      
      // Keep last 30 streams
      const trimmed = history.slice(0, 30);
      
      browserAPI.storage.local.set({ [STORAGE_KEY]: trimmed }, resolve);
    });
  });
}

/**
 * Get stream history
 */
export async function getStreamHistory(limit = 10) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEY], (result) => {
      const history = result[STORAGE_KEY] || [];
      resolve(history.slice(0, limit));
    });
  });
}

/**
 * Format summary as shareable text
 */
export function formatSummaryAsText(summary) {
  const stats = summary.coreStats;
  const sales = summary.sales;
  
  let text = `🐝 STREAM RECAP 🐝\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📅 ${summary.streamDate}\n`;
  text += `⏱️ ${summary.streamDuration}\n\n`;
  
  text += `💰 RESULTS\n`;
  text += `• Revenue: $${stats.revenue.toFixed(2)}\n`;
  text += `• Items Sold: ${stats.itemsSold}\n`;
  text += `• Unique Buyers: ${stats.uniqueBuyers}\n`;
  text += `• Viewers: ${stats.viewers}\n\n`;
  
  if (sales.itemsSold?.length > 0) {
    text += `🏆 TOP SELLERS\n`;
    sales.itemsSold.slice(0, 3).forEach((item, i) => {
      text += `${i + 1}. ${item.name} (${item.quantity} sold)\n`;
    });
    text += `\n`;
  }
  
  text += `📊 ENGAGEMENT\n`;
  text += `• Chat Rate: ${summary.performance.chatRate}/min\n`;
  text += `• Peak Time: ${summary.performance.peakActivityTime}\n`;
  text += `• Conversion: ${sales.conversionRate}%\n\n`;
  
  if (summary.insights?.length > 0) {
    text += `✨ HIGHLIGHTS\n`;
    summary.insights.forEach(i => {
      text += `${i.icon} ${i.text}\n`;
    });
  }
  
  text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Powered by BuzzChat 🐝`;
  
  return text;
}

/**
 * Generate Instagram-story-worthy HTML summary
 */
export function formatSummaryAsHTML(summary) {
  const stats = summary.coreStats;
  const sales = summary.sales;
  const perf = summary.performance;
  
  // Determine gradient based on performance
  let gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  if (stats.revenue >= 500) {
    gradient = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'; // Pink fire
  } else if (stats.revenue >= 200) {
    gradient = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'; // Cool blue
  }
  
  return `
    <div class="stream-summary-modal" style="background: ${gradient};">
      <div class="summary-inner">
        <!-- Header -->
        <div class="summary-header">
          <div class="summary-logo">🐝 BuzzChat</div>
          <div class="summary-date">${summary.streamDate} • ${summary.streamDuration}</div>
        </div>
        
        <!-- Big Number -->
        <div class="summary-hero">
          <div class="hero-label">TOTAL REVENUE</div>
          <div class="hero-value">$${stats.revenue.toFixed(2)}</div>
          ${stats.revenue >= 100 ? '<div class="hero-badge">🔥</div>' : ''}
        </div>
        
        <!-- Core Stats Grid -->
        <div class="summary-stats-grid">
          <div class="summary-stat">
            <div class="stat-emoji">🛒</div>
            <div class="stat-value">${stats.itemsSold}</div>
            <div class="stat-label">Items Sold</div>
          </div>
          <div class="summary-stat">
            <div class="stat-emoji">👥</div>
            <div class="stat-value">${stats.uniqueBuyers}</div>
            <div class="stat-label">Buyers</div>
          </div>
          <div class="summary-stat">
            <div class="stat-emoji">👀</div>
            <div class="stat-value">${stats.viewers}</div>
            <div class="stat-label">Viewers</div>
          </div>
          <div class="summary-stat">
            <div class="stat-emoji">💬</div>
            <div class="stat-value">${perf.totalMessages}</div>
            <div class="stat-label">Messages</div>
          </div>
        </div>
        
        <!-- Top Items -->
        ${sales.itemsSold?.length > 0 ? `
          <div class="summary-section">
            <div class="section-title">🏆 Top Sellers</div>
            <div class="top-items-list">
              ${sales.itemsSold.slice(0, 3).map((item, i) => `
                <div class="top-item">
                  <span class="item-rank">${['🥇', '🥈', '🥉'][i]}</span>
                  <span class="item-name">${escapeHtml(item.name)}</span>
                  <span class="item-qty">${item.quantity}x</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <!-- Engagement Stats -->
        <div class="summary-section">
          <div class="section-title">📊 Engagement</div>
          <div class="engagement-row">
            <div class="engagement-stat">
              <span class="eng-label">Chat Rate</span>
              <span class="eng-value">${perf.chatRate}/min</span>
            </div>
            <div class="engagement-stat">
              <span class="eng-label">Conversion</span>
              <span class="eng-value">${sales.conversionRate}%</span>
            </div>
            <div class="engagement-stat">
              <span class="eng-label">Peak</span>
              <span class="eng-value">${perf.peakActivityTime}</span>
            </div>
          </div>
        </div>
        
        <!-- VIP & AI Stats -->
        <div class="summary-mini-stats">
          ${summary.customers.vipCount > 0 ? `
            <div class="mini-stat">
              <span class="mini-icon">👑</span>
              <span>${summary.customers.vipCount} VIPs</span>
            </div>
          ` : ''}
          ${summary.automation.aiResponsesSent > 0 ? `
            <div class="mini-stat">
              <span class="mini-icon">🤖</span>
              <span>${summary.automation.aiResponsesSent} AI Replies</span>
            </div>
          ` : ''}
        </div>
        
        <!-- Insights -->
        ${summary.insights?.length > 0 ? `
          <div class="summary-insights">
            ${summary.insights.map(insight => `
              <div class="insight insight-${insight.type}">
                <span class="insight-icon">${insight.icon}</span>
                <span class="insight-text">${escapeHtml(insight.text)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="summary-footer">
          Powered by BuzzChat 🐝
        </div>
      </div>
    </div>
  `;
}

/**
 * Escape HTML for safe rendering
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show the stream summary modal
 */
export async function showStreamSummaryModal(autoTriggered = false) {
  const summary = await generateStreamSummary();
  
  // Show confetti if good performance
  if (summary.coreStats.revenue >= 100 || summary.coreStats.itemsSold >= 5) {
    showConfetti(3000);
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'summary-modal-overlay';
  modal.innerHTML = `
    <div class="summary-modal-backdrop"></div>
    <div class="summary-modal-container">
      ${formatSummaryAsHTML(summary)}
      <div class="summary-actions">
        <button class="summary-btn summary-btn-copy" title="Copy to clipboard">
          <span class="btn-icon">📋</span>
          <span class="btn-text">Copy</span>
        </button>
        <button class="summary-btn summary-btn-image" title="Save as image">
          <span class="btn-icon">📸</span>
          <span class="btn-text">Save Image</span>
        </button>
        <button class="summary-btn summary-btn-export" title="Export data">
          <span class="btn-icon">📊</span>
          <span class="btn-text">Export</span>
        </button>
        <button class="summary-btn summary-btn-close primary">
          <span class="btn-text">Done</span>
        </button>
      </div>
    </div>
  `;
  
  // Add styles
  addSummaryStyles();
  
  document.body.appendChild(modal);
  
  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
  
  // Event handlers
  modal.querySelector('.summary-modal-backdrop').addEventListener('click', () => closeSummaryModal(modal));
  modal.querySelector('.summary-btn-close').addEventListener('click', () => closeSummaryModal(modal));
  
  modal.querySelector('.summary-btn-copy').addEventListener('click', () => {
    const text = formatSummaryAsText(summary);
    navigator.clipboard.writeText(text);
    Toast.success('Summary copied to clipboard! 📋');
  });
  
  modal.querySelector('.summary-btn-image').addEventListener('click', async () => {
    await exportAsImage(modal.querySelector('.summary-modal-container'), summary);
  });
  
  modal.querySelector('.summary-btn-export').addEventListener('click', () => {
    exportSummaryCSV(summary);
  });
  
  // Auto-dismiss notification for auto-triggered
  if (autoTriggered) {
    Toast.info('Stream ended! Here\'s your summary 📊');
  }
}

/**
 * Close the summary modal with animation
 */
function closeSummaryModal(modal) {
  modal.classList.remove('active');
  setTimeout(() => modal.remove(), 300);
}

/**
 * Export summary as image for social sharing
 */
async function exportAsImage(container, summary) {
  try {
    // Use html2canvas if available, otherwise fallback to screenshot approach
    if (typeof html2canvas !== 'undefined') {
      const canvas = await html2canvas(container.querySelector('.stream-summary-modal'), {
        scale: 2,
        useCORS: true,
        backgroundColor: null
      });
      
      const link = document.createElement('a');
      link.download = `stream-summary-${summary.streamDate.replace(/[^a-z0-9]/gi, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      Toast.success('Image saved! Share your wins! 🎉');
    } else {
      // Fallback: Create a stylized text image using canvas
      await createSummaryImage(summary);
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to export image:', error);
    Toast.error('Could not save image. Try copying text instead.');
  }
}

/**
 * Create a summary image using canvas (fallback)
 */
async function createSummaryImage(summary) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Instagram story size (9:16 aspect ratio)
  canvas.width = 1080;
  canvas.height = 1920;
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (summary.coreStats.revenue >= 500) {
    gradient.addColorStop(0, '#f093fb');
    gradient.addColorStop(1, '#f5576c');
  } else {
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Text settings
  ctx.textAlign = 'center';
  ctx.fillStyle = 'white';
  
  // Logo
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('🐝 BuzzChat', canvas.width / 2, 120);
  
  // Date
  ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.globalAlpha = 0.9;
  ctx.fillText(`${summary.streamDate} • ${summary.streamDuration}`, canvas.width / 2, 180);
  ctx.globalAlpha = 1;
  
  // Big revenue number
  ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`$${summary.coreStats.revenue.toFixed(0)}`, canvas.width / 2, 450);
  
  ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.globalAlpha = 0.8;
  ctx.fillText('REVENUE', canvas.width / 2, 510);
  ctx.globalAlpha = 1;
  
  // Stats grid
  const stats = [
    { emoji: '🛒', value: summary.coreStats.itemsSold, label: 'Sold' },
    { emoji: '👥', value: summary.coreStats.uniqueBuyers, label: 'Buyers' },
    { emoji: '👀', value: summary.coreStats.viewers, label: 'Viewers' },
    { emoji: '💬', value: summary.performance.totalMessages, label: 'Messages' }
  ];
  
  const statWidth = canvas.width / 4;
  stats.forEach((stat, i) => {
    const x = statWidth / 2 + i * statWidth;
    const y = 700;
    
    ctx.font = '48px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(stat.emoji, x, y);
    
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(String(stat.value), x, y + 70);
    
    ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.globalAlpha = 0.8;
    ctx.fillText(stat.label, x, y + 110);
    ctx.globalAlpha = 1;
  });
  
  // Top items
  if (summary.sales.itemsSold?.length > 0) {
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('🏆 TOP SELLERS', canvas.width / 2, 950);
    
    const medals = ['🥇', '🥈', '🥉'];
    summary.sales.itemsSold.slice(0, 3).forEach((item, i) => {
      ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${medals[i]} ${item.name} (${item.quantity}x)`, canvas.width / 2, 1020 + i * 60);
    });
  }
  
  // Insights
  if (summary.insights?.length > 0) {
    let y = 1300;
    summary.insights.slice(0, 3).forEach(insight => {
      ctx.font = '30px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${insight.icon} ${insight.text}`, canvas.width / 2, y);
      y += 55;
    });
  }
  
  // Footer
  ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.globalAlpha = 0.7;
  ctx.fillText('Powered by BuzzChat 🐝', canvas.width / 2, canvas.height - 80);
  
  // Download
  const link = document.createElement('a');
  link.download = `stream-summary-${summary.streamDate.replace(/[^a-z0-9]/gi, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  
  Toast.success('Image saved! Share your wins! 🎉');
}

/**
 * Export summary as CSV
 */
export function exportSummaryCSV(summary) {
  let csv = 'BuzzChat Stream Summary Report\n';
  csv += `Date,${summary.streamDate}\n`;
  csv += `Duration,${summary.streamDuration}\n`;
  csv += `Platform,${summary.platform}\n\n`;
  
  csv += 'Core Stats\n';
  csv += `Total Revenue,$${summary.coreStats.revenue.toFixed(2)}\n`;
  csv += `Items Sold,${summary.coreStats.itemsSold}\n`;
  csv += `Unique Buyers,${summary.coreStats.uniqueBuyers}\n`;
  csv += `Viewers,${summary.coreStats.viewers}\n\n`;
  
  csv += 'Performance\n';
  csv += `Total Messages,${summary.performance.totalMessages}\n`;
  csv += `Chat Rate,${summary.performance.chatRate}/min\n`;
  csv += `Engagement,${summary.performance.engagement}\n`;
  csv += `Engagement Rate,${summary.performance.engagementRate}%\n`;
  csv += `Peak Activity Time,${summary.performance.peakActivityTime}\n`;
  csv += `Peak Activity Rate,${summary.performance.peakActivityRate}/min\n\n`;
  
  csv += 'Sales\n';
  csv += `Conversion Rate,${summary.sales.conversionRate}%\n`;
  csv += `Average Item Price,$${summary.sales.avgItemPrice.toFixed(2)}\n\n`;
  
  if (summary.sales.itemsSold?.length > 0) {
    csv += 'Items Sold\n';
    csv += 'Item Name,Quantity,Revenue\n';
    summary.sales.itemsSold.forEach(item => {
      csv += `"${item.name}",${item.quantity},$${item.revenue.toFixed(2)}\n`;
    });
    csv += '\n';
  }
  
  if (summary.customers.topBuyers?.length > 0) {
    csv += 'Top Buyers\n';
    csv += 'Username,Total Spent,Purchases,VIP\n';
    summary.customers.topBuyers.forEach(buyer => {
      csv += `"${buyer.username}",$${buyer.spent.toFixed(2)},${buyer.purchases},${buyer.isVIP ? 'Yes' : 'No'}\n`;
    });
    csv += '\n';
  }
  
  if (summary.automation.topQuestions?.length > 0) {
    csv += 'Top Questions Asked\n';
    csv += 'Question,Times Asked\n';
    summary.automation.topQuestions.forEach(q => {
      csv += `"${q.question}",${q.count}\n`;
    });
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stream-summary-${summary.streamDate.replace(/[^a-z0-9]/gi, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  Toast.success('Report exported! 📊');
}

/**
 * Add CSS styles for the summary modal
 */
function addSummaryStyles() {
  if (document.getElementById('buzzchat-summary-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'buzzchat-summary-styles';
  style.textContent = `
    .summary-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .summary-modal-overlay.active {
      opacity: 1;
    }
    
    .summary-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
    }
    
    .summary-modal-container {
      position: relative;
      max-width: 420px;
      max-height: 90vh;
      overflow: auto;
      border-radius: 24px;
      box-shadow: 0 25px 100px rgba(0, 0, 0, 0.5);
      transform: scale(0.9) translateY(20px);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .summary-modal-overlay.active .summary-modal-container {
      transform: scale(1) translateY(0);
    }
    
    .stream-summary-modal {
      padding: 32px 24px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .summary-header {
      text-align: center;
      margin-bottom: 24px;
    }
    
    .summary-logo {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .summary-date {
      font-size: 14px;
      opacity: 0.85;
    }
    
    .summary-hero {
      text-align: center;
      margin: 32px 0;
      position: relative;
    }
    
    .hero-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 2px;
      opacity: 0.8;
      margin-bottom: 8px;
    }
    
    .hero-value {
      font-size: 64px;
      font-weight: 800;
      line-height: 1;
      text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    
    .hero-badge {
      position: absolute;
      top: -10px;
      right: 20%;
      font-size: 32px;
      animation: bounce 1s ease infinite;
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    .summary-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 24px 0;
    }
    
    .summary-stat {
      text-align: center;
      padding: 16px 8px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    
    .stat-emoji {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .summary-stat .stat-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }
    
    .summary-stat .stat-label {
      font-size: 11px;
      opacity: 0.75;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-section {
      margin: 20px 0;
      padding: 16px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      opacity: 0.9;
    }
    
    .top-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .top-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }
    
    .item-rank {
      font-size: 18px;
    }
    
    .item-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .item-qty {
      font-size: 14px;
      font-weight: 600;
      opacity: 0.9;
    }
    
    .engagement-row {
      display: flex;
      justify-content: space-around;
    }
    
    .engagement-stat {
      text-align: center;
    }
    
    .eng-label {
      display: block;
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 4px;
    }
    
    .eng-value {
      font-size: 18px;
      font-weight: 700;
    }
    
    .summary-mini-stats {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin: 16px 0;
    }
    
    .mini-stat {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      font-size: 13px;
    }
    
    .summary-insights {
      margin: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .insight {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      font-size: 14px;
    }
    
    .insight-icon {
      font-size: 20px;
    }
    
    .insight-celebration {
      background: rgba(255, 215, 0, 0.25);
    }
    
    .summary-footer {
      text-align: center;
      font-size: 12px;
      opacity: 0.6;
      margin-top: 24px;
    }
    
    .summary-actions {
      display: flex;
      gap: 8px;
      padding: 16px 24px 24px;
      background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.3));
      border-radius: 0 0 24px 24px;
    }
    
    .summary-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 16px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      transition: all 0.2s ease;
    }
    
    .summary-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }
    
    .summary-btn.primary {
      background: white;
      color: #764ba2;
    }
    
    .summary-btn.primary:hover {
      background: #f0f0f0;
    }
    
    .btn-icon {
      font-size: 16px;
    }
    
    @media (max-width: 480px) {
      .summary-modal-container {
        max-width: 100%;
        max-height: 100%;
        border-radius: 0;
      }
      
      .summary-stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .hero-value {
        font-size: 48px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Compare current stream to historical average
 */
export async function compareToAverage() {
  const history = await getStreamHistory(10);
  if (history.length < 2) return null;
  
  const currentStream = history[0];
  const pastStreams = history.slice(1);
  
  const avgRevenue = pastStreams.reduce((sum, s) => sum + (s.coreStats?.revenue || s.sales?.totalRevenue || 0), 0) / pastStreams.length;
  const avgSales = pastStreams.reduce((sum, s) => sum + (s.coreStats?.itemsSold || s.sales?.totalSold || 0), 0) / pastStreams.length;
  const avgViewers = pastStreams.reduce((sum, s) => sum + (s.coreStats?.viewers || s.performance?.totalViewers || 0), 0) / pastStreams.length;
  
  const currentRevenue = currentStream.coreStats?.revenue || currentStream.sales?.totalRevenue || 0;
  const currentSales = currentStream.coreStats?.itemsSold || currentStream.sales?.totalSold || 0;
  const currentViewers = currentStream.coreStats?.viewers || currentStream.performance?.totalViewers || 0;
  
  return {
    revenue: {
      current: currentRevenue,
      average: avgRevenue,
      percentChange: avgRevenue > 0 ? ((currentRevenue - avgRevenue) / avgRevenue * 100).toFixed(0) : 0
    },
    sales: {
      current: currentSales,
      average: avgSales,
      percentChange: avgSales > 0 ? ((currentSales - avgSales) / avgSales * 100).toFixed(0) : 0
    },
    viewers: {
      current: currentViewers,
      average: avgViewers,
      percentChange: avgViewers > 0 ? ((currentViewers - avgViewers) / avgViewers * 100).toFixed(0) : 0
    }
  };
}

/**
 * Reset current session (for new stream)
 */
export function resetSession() {
  startSession();
  Toast.success('Session reset for new stream!');
}

// Auto-init styles
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSummaryStyles);
  } else {
    addSummaryStyles();
  }
}

export default {
  startSession,
  recordSessionMessage,
  recordAIResponse,
  recordSessionSale,
  loadSessionData,
  generateStreamSummary,
  getStreamHistory,
  formatSummaryAsText,
  formatSummaryAsHTML,
  showStreamSummaryModal,
  exportSummaryCSV,
  compareToAverage,
  resetSession
};
