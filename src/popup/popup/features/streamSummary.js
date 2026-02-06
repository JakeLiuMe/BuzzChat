// BuzzChat - Stream Summary Report
// Generate after-action report when stream ends

import { browserAPI } from '../core/config.js';
import { getSalesSummary, getProducts } from './inventory.js';
import { getDashboardStats, getStreamSummary as getDashboardSummary } from './dashboard.js';
import { getBuyerStats, getTopBuyers } from './buyers.js';
import { getAchievementStats } from './achievements.js';
import { Toast } from '../ui/toast.js';

const STORAGE_KEY = 'buzzchatStreamHistory';

/**
 * Generate comprehensive stream summary
 */
export async function generateStreamSummary() {
  const dashboard = await getDashboardSummary();
  const sales = await getSalesSummary();
  const products = await getProducts();
  const buyers = await getBuyerStats();
  const topBuyers = await getTopBuyers(5);
  const achievements = await getAchievementStats();
  
  const summary = {
    // Metadata
    generatedAt: Date.now(),
    streamDate: new Date().toLocaleDateString(),
    streamDuration: dashboard.durationStr || 'Unknown',
    platform: dashboard.platform || 'Unknown',
    
    // Performance
    performance: {
      totalViewers: dashboard.viewers || 0,
      peakViewers: dashboard.viewers || 0, // TODO: track peak
      avgChatRate: dashboard.chatRate || 0,
      engagement: dashboard.engagement || 'low'
    },
    
    // Sales
    sales: {
      totalSold: sales.totalSold || 0,
      totalRevenue: sales.totalRevenue || 0,
      avgItemPrice: sales.avgItemPrice || 0,
      topItems: getTopSellingItems(sales.items || []),
      conversionRate: calculateConversionRate(dashboard.viewers, sales.totalSold)
    },
    
    // Inventory
    inventory: {
      itemsListed: products.length,
      soldOut: products.filter(p => p.quantity === 0).length,
      lowStock: products.filter(p => p.quantity > 0 && p.quantity <= 2).length,
      remainingValue: products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    },
    
    // Customers
    customers: {
      newBuyers: 0, // TODO: track new vs returning
      returningBuyers: 0,
      vipPurchases: 0,
      topBuyers: topBuyers.map(b => ({
        username: b.username,
        spent: b.totalSpent,
        purchases: b.totalPurchases
      }))
    },
    
    // Achievements
    achievements: {
      unlocked: achievements.unlocked,
      total: achievements.total,
      recent: achievements.recent
    },
    
    // Insights
    insights: generateInsights(dashboard, sales, products)
  };
  
  // Save to history
  await saveToHistory(summary);
  
  return summary;
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
  return Math.round((sales / viewers) * 100);
}

/**
 * Generate AI-like insights
 */
function generateInsights(dashboard, sales, products) {
  const insights = [];
  
  // Sales performance
  if (sales.totalSold >= 10) {
    insights.push({
      type: 'positive',
      icon: '🔥',
      text: `Great stream! ${sales.totalSold} items sold.`
    });
  } else if (sales.totalSold === 0) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: 'No sales this stream. Try engaging more with chat or featuring hot items.'
    });
  }
  
  // Revenue
  if (sales.totalRevenue >= 500) {
    insights.push({
      type: 'positive',
      icon: '💰',
      text: `$${sales.totalRevenue.toFixed(0)} in revenue! Keep it up!`
    });
  }
  
  // Engagement
  if (dashboard.engagement === 'high') {
    insights.push({
      type: 'positive',
      icon: '⚡',
      text: 'Chat engagement was HIGH. Your audience loved it!'
    });
  } else if (dashboard.engagement === 'low') {
    insights.push({
      type: 'tip',
      icon: '💬',
      text: 'Chat was quiet. Try asking questions or running giveaways.'
    });
  }
  
  // Inventory
  const soldOut = products.filter(p => p.quantity === 0).length;
  if (soldOut > 0) {
    insights.push({
      type: 'info',
      icon: '📦',
      text: `${soldOut} items sold out! Consider restocking popular items.`
    });
  }
  
  // Timing
  const hour = new Date().getHours();
  if (hour >= 20 || hour <= 2) {
    insights.push({
      type: 'info',
      icon: '🌙',
      text: 'Evening streams often have higher engagement. Good timing!'
    });
  }
  
  return insights;
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
 * Format summary as text for sharing
 */
export function formatSummaryAsText(summary) {
  return `
🐝 BuzzChat Stream Summary
📅 ${summary.streamDate} | ⏱️ ${summary.streamDuration}

📊 PERFORMANCE
• Viewers: ${summary.performance.totalViewers}
• Chat Rate: ${summary.performance.avgChatRate}/min
• Engagement: ${summary.performance.engagement.toUpperCase()}

💰 SALES
• Items Sold: ${summary.sales.totalSold}
• Revenue: $${summary.sales.totalRevenue.toFixed(2)}
• Avg Price: $${summary.sales.avgItemPrice.toFixed(2)}
• Conversion: ${summary.sales.conversionRate}%

📦 INVENTORY
• Listed: ${summary.inventory.itemsListed}
• Sold Out: ${summary.inventory.soldOut}
• Low Stock: ${summary.inventory.lowStock}

${summary.insights.map(i => `${i.icon} ${i.text}`).join('\n')}

Powered by BuzzChat 🐝
  `.trim();
}

/**
 * Format summary as HTML for display
 */
export function formatSummaryAsHTML(summary) {
  return `
    <div class="stream-summary">
      <div class="summary-header">
        <h2>🐝 Stream Summary</h2>
        <p class="summary-meta">${summary.streamDate} • ${summary.streamDuration}</p>
      </div>
      
      <div class="summary-grid">
        <div class="summary-card">
          <div class="card-icon">👥</div>
          <div class="card-value">${summary.performance.totalViewers}</div>
          <div class="card-label">Viewers</div>
        </div>
        <div class="summary-card">
          <div class="card-icon">🛒</div>
          <div class="card-value">${summary.sales.totalSold}</div>
          <div class="card-label">Items Sold</div>
        </div>
        <div class="summary-card">
          <div class="card-icon">💰</div>
          <div class="card-value">$${summary.sales.totalRevenue.toFixed(0)}</div>
          <div class="card-label">Revenue</div>
        </div>
        <div class="summary-card">
          <div class="card-icon">📈</div>
          <div class="card-value">${summary.sales.conversionRate}%</div>
          <div class="card-label">Conversion</div>
        </div>
      </div>
      
      <div class="summary-insights">
        <h3>💡 Insights</h3>
        ${summary.insights.map(i => `
          <div class="insight insight-${i.type}">
            <span class="insight-icon">${i.icon}</span>
            <span class="insight-text">${i.text}</span>
          </div>
        `).join('')}
      </div>
      
      ${summary.sales.topItems.length > 0 ? `
        <div class="summary-top-items">
          <h3>🏆 Top Sellers</h3>
          <ol>
            ${summary.sales.topItems.map(item => `
              <li>${item.name} (${item.count} sold)</li>
            `).join('')}
          </ol>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Show summary modal
 */
export async function showStreamSummaryModal() {
  const summary = await generateStreamSummary();
  
  const modal = document.createElement('div');
  modal.className = 'summary-modal';
  modal.innerHTML = `
    <div class="summary-backdrop"></div>
    <div class="summary-content">
      ${formatSummaryAsHTML(summary)}
      <div class="summary-actions">
        <button class="btn btn-secondary summary-copy">📋 Copy</button>
        <button class="btn btn-secondary summary-export">📊 Export CSV</button>
        <button class="btn btn-primary summary-close">Done</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event handlers
  modal.querySelector('.summary-backdrop').addEventListener('click', () => modal.remove());
  modal.querySelector('.summary-close').addEventListener('click', () => modal.remove());
  
  modal.querySelector('.summary-copy').addEventListener('click', () => {
    const text = formatSummaryAsText(summary);
    navigator.clipboard.writeText(text);
    Toast.success('Summary copied to clipboard!');
  });
  
  modal.querySelector('.summary-export').addEventListener('click', () => {
    exportSummaryCSV(summary);
  });
}

/**
 * Export summary as CSV
 */
export function exportSummaryCSV(summary) {
  let csv = 'Stream Summary Report\n';
  csv += `Date,${summary.streamDate}\n`;
  csv += `Duration,${summary.streamDuration}\n\n`;
  
  csv += 'Performance\n';
  csv += `Viewers,${summary.performance.totalViewers}\n`;
  csv += `Chat Rate,${summary.performance.avgChatRate}/min\n`;
  csv += `Engagement,${summary.performance.engagement}\n\n`;
  
  csv += 'Sales\n';
  csv += `Items Sold,${summary.sales.totalSold}\n`;
  csv += `Revenue,$${summary.sales.totalRevenue.toFixed(2)}\n`;
  csv += `Avg Price,$${summary.sales.avgItemPrice.toFixed(2)}\n`;
  csv += `Conversion Rate,${summary.sales.conversionRate}%\n\n`;
  
  if (summary.sales.topItems.length > 0) {
    csv += 'Top Sellers\n';
    csv += 'Item,Quantity Sold\n';
    summary.sales.topItems.forEach(item => {
      csv += `"${item.name}",${item.count}\n`;
    });
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stream-summary-${summary.streamDate.replace(/\//g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  Toast.success('Summary exported!');
}

/**
 * Compare current stream to average
 */
export async function compareToAverage() {
  const history = await getStreamHistory(10);
  if (history.length < 2) return null;
  
  const currentStream = history[0];
  const pastStreams = history.slice(1);
  
  const avgRevenue = pastStreams.reduce((sum, s) => sum + s.sales.totalRevenue, 0) / pastStreams.length;
  const avgSales = pastStreams.reduce((sum, s) => sum + s.sales.totalSold, 0) / pastStreams.length;
  const avgViewers = pastStreams.reduce((sum, s) => sum + s.performance.totalViewers, 0) / pastStreams.length;
  
  return {
    revenue: {
      current: currentStream.sales.totalRevenue,
      average: avgRevenue,
      percentChange: ((currentStream.sales.totalRevenue - avgRevenue) / avgRevenue * 100).toFixed(0)
    },
    sales: {
      current: currentStream.sales.totalSold,
      average: avgSales,
      percentChange: ((currentStream.sales.totalSold - avgSales) / avgSales * 100).toFixed(0)
    },
    viewers: {
      current: currentStream.performance.totalViewers,
      average: avgViewers,
      percentChange: ((currentStream.performance.totalViewers - avgViewers) / avgViewers * 100).toFixed(0)
    }
  };
}

export default {
  generateStreamSummary,
  getStreamHistory,
  formatSummaryAsText,
  formatSummaryAsHTML,
  showStreamSummaryModal,
  exportSummaryCSV,
  compareToAverage
};
