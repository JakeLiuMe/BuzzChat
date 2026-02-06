// BuzzChat - Professional Buyer Export to CSV
// Export buyer data for email marketing, retargeting, loyalty programs

import { getBuyers } from './buyers.js';
import { Toast } from '../ui/toast.js';

/**
 * CSV escape utility - handles commas, quotes, newlines
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Format date for CSV (YYYY-MM-DD HH:MM)
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return `$${(amount || 0).toFixed(2)}`;
}

/**
 * Get items bought as a summarized string
 */
function summarizeItems(purchaseHistory) {
  if (!purchaseHistory || purchaseHistory.length === 0) return '';
  
  // Count items by name
  const itemCounts = {};
  purchaseHistory.forEach(p => {
    const name = p.item || 'Unknown Item';
    itemCounts[name] = (itemCounts[name] || 0) + 1;
  });
  
  // Format as "Item1 (x2), Item2 (x1)"
  return Object.entries(itemCounts)
    .map(([name, count]) => count > 1 ? `${name} (x${count})` : name)
    .join('; ');
}

/**
 * Filter buyers based on options
 */
function filterBuyers(buyers, options = {}) {
  const {
    dateFrom = null,
    dateTo = null,
    vipOnly = false,
    minPurchases = 0,
    minSpent = 0,
    hasNotes = false,
    platform = null
  } = options;
  
  return buyers.filter(buyer => {
    // VIP filter
    if (vipOnly && !buyer.tags?.includes('vip')) return false;
    
    // Minimum purchases filter
    if (minPurchases > 0 && (buyer.totalPurchases || 0) < minPurchases) return false;
    
    // Minimum spent filter
    if (minSpent > 0 && (buyer.totalSpent || 0) < minSpent) return false;
    
    // Has notes filter
    if (hasNotes && !buyer.notes?.trim()) return false;
    
    // Platform filter
    if (platform && buyer.platform !== platform) return false;
    
    // Date range filter (based on firstSeen or lastSeen)
    if (dateFrom) {
      const fromDate = new Date(dateFrom).getTime();
      if (buyer.lastSeen < fromDate) return false;
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo).getTime() + 86400000; // Include end date
      if (buyer.firstSeen > toDate) return false;
    }
    
    return true;
  });
}

/**
 * Generate CSV content for buyer export
 */
function generateBuyerCSV(buyers, options = {}) {
  const { includeHistory = true, includeSummary = true } = options;
  
  const lines = [];
  
  // Header row
  const headers = [
    'Username',
    'Total Purchases',
    'Total Spent',
    'Items Bought',
    'First Seen',
    'Last Seen',
    'VIP Status',
    'Tags',
    'Interactions',
    'Platform',
    'Notes'
  ];
  
  if (includeHistory) {
    headers.push('Purchase History (Date | Item | Price)');
  }
  
  lines.push(headers.map(escapeCSV).join(','));
  
  // Data rows
  buyers.forEach(buyer => {
    const row = [
      buyer.username || '',
      buyer.totalPurchases || 0,
      formatCurrency(buyer.totalSpent),
      summarizeItems(buyer.purchaseHistory),
      formatDate(buyer.firstSeen),
      formatDate(buyer.lastSeen),
      buyer.tags?.includes('vip') ? 'VIP' : '',
      (buyer.tags || []).join('; '),
      buyer.interactions || 0,
      buyer.platform || '',
      buyer.notes || ''
    ];
    
    if (includeHistory) {
      // Format purchase history as multi-line cell
      const historyStr = (buyer.purchaseHistory || [])
        .map(p => `${formatDate(p.date)} | ${p.item || 'Unknown'} | ${formatCurrency(p.price)}`)
        .join('\n');
      row.push(historyStr);
    }
    
    lines.push(row.map(escapeCSV).join(','));
  });
  
  // Summary section
  if (includeSummary && buyers.length > 0) {
    lines.push(''); // Empty row
    lines.push('');
    lines.push('--- EXPORT SUMMARY ---');
    lines.push(`Total Buyers,${buyers.length}`);
    lines.push(`VIP Buyers,${buyers.filter(b => b.tags?.includes('vip')).length}`);
    lines.push(`Total Purchases,${buyers.reduce((sum, b) => sum + (b.totalPurchases || 0), 0)}`);
    lines.push(`Total Revenue,${formatCurrency(buyers.reduce((sum, b) => sum + (b.totalSpent || 0), 0))}`);
    lines.push(`Avg Per Buyer,${formatCurrency(buyers.reduce((sum, b) => sum + (b.totalSpent || 0), 0) / buyers.length)}`);
    lines.push(`Export Date,${formatDate(Date.now())}`);
  }
  
  return lines.join('\r\n');
}

/**
 * Download CSV file
 */
function downloadCSV(content, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export buyers with filter options (main export function)
 */
export async function exportBuyersCSV(options = {}) {
  const allBuyers = await getBuyers();
  const buyerList = Object.values(allBuyers);
  
  if (buyerList.length === 0) {
    Toast.warning('No buyers to export!');
    return { success: false, count: 0 };
  }
  
  // Apply filters
  const filteredBuyers = filterBuyers(buyerList, options);
  
  if (filteredBuyers.length === 0) {
    Toast.warning('No buyers match the selected filters');
    return { success: false, count: 0 };
  }
  
  // Sort by total spent (descending) by default
  const sortedBuyers = filteredBuyers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
  
  // Generate CSV
  const csv = generateBuyerCSV(sortedBuyers, {
    includeHistory: options.includeHistory !== false,
    includeSummary: options.includeSummary !== false
  });
  
  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  let filename = `buzzchat-buyers-${dateStr}`;
  if (options.vipOnly) filename += '-vip';
  if (options.minPurchases > 0) filename += `-min${options.minPurchases}`;
  filename += '.csv';
  
  // Download
  downloadCSV(csv, filename);
  
  Toast.success(`Exported ${filteredBuyers.length} buyers!`);
  return { success: true, count: filteredBuyers.length };
}

/**
 * Quick export - all buyers, no filters
 */
export async function quickExportBuyers() {
  return exportBuyersCSV({});
}

/**
 * Export VIP buyers only
 */
export async function exportVIPBuyers() {
  return exportBuyersCSV({ vipOnly: true });
}

/**
 * Export buyers with purchases only
 */
export async function exportActiveBuyers() {
  return exportBuyersCSV({ minPurchases: 1 });
}

/**
 * Export buyers from date range
 */
export async function exportBuyersByDateRange(dateFrom, dateTo) {
  return exportBuyersCSV({ dateFrom, dateTo });
}

/**
 * Show export modal with filter options
 */
export function showExportBuyersModal() {
  // Remove any existing modal
  const existing = document.getElementById('exportBuyersModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'exportBuyersModal';
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content export-buyers-modal">
      <div class="modal-header">
        <h2>📊 Export Buyers</h2>
        <button class="modal-close" id="closeExportBuyersModal" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <p class="help-text" style="margin-bottom: 16px;">
          Export your buyer list for email marketing, CRM import, or loyalty programs.
        </p>
        
        <!-- Quick Export Buttons -->
        <div class="export-quick-actions">
          <button class="btn btn-primary" id="exportAllBuyersBtn">
            📥 Export All Buyers
          </button>
          <button class="btn btn-secondary" id="exportVIPBuyersBtn">
            ⭐ VIP Buyers Only
          </button>
        </div>
        
        <hr class="section-divider">
        
        <!-- Advanced Filters -->
        <details class="export-filters-section">
          <summary>🔧 Advanced Filters</summary>
          <div class="export-filters">
            <div class="form-group">
              <label>Date Range</label>
              <div class="date-range-row">
                <input type="date" id="exportDateFrom" placeholder="From">
                <span>to</span>
                <input type="date" id="exportDateTo" placeholder="To">
              </div>
            </div>
            
            <div class="form-group">
              <label>Minimum Purchases</label>
              <select id="exportMinPurchases">
                <option value="0">Any</option>
                <option value="1">At least 1</option>
                <option value="2">At least 2 (Repeat buyers)</option>
                <option value="3">At least 3</option>
                <option value="5">At least 5</option>
                <option value="10">At least 10</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Minimum Spent</label>
              <select id="exportMinSpent">
                <option value="0">Any</option>
                <option value="25">$25+</option>
                <option value="50">$50+</option>
                <option value="100">$100+</option>
                <option value="200">$200+ (High value)</option>
                <option value="500">$500+</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="toggle-label">
                <span>VIP buyers only</span>
                <input type="checkbox" id="exportVIPOnly">
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div class="form-group">
              <label class="toggle-label">
                <span>Include purchase history</span>
                <input type="checkbox" id="exportIncludeHistory" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <button class="btn btn-primary" id="exportFilteredBtn" style="width: 100%; margin-top: 12px;">
              📥 Export with Filters
            </button>
          </div>
        </details>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  const closeModal = () => modal.remove();
  
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  modal.querySelector('#closeExportBuyersModal').addEventListener('click', closeModal);
  
  // Export All
  modal.querySelector('#exportAllBuyersBtn').addEventListener('click', async () => {
    await quickExportBuyers();
    closeModal();
  });
  
  // Export VIP Only
  modal.querySelector('#exportVIPBuyersBtn').addEventListener('click', async () => {
    await exportVIPBuyers();
    closeModal();
  });
  
  // Export with Filters
  modal.querySelector('#exportFilteredBtn').addEventListener('click', async () => {
    const options = {
      dateFrom: modal.querySelector('#exportDateFrom').value || null,
      dateTo: modal.querySelector('#exportDateTo').value || null,
      minPurchases: parseInt(modal.querySelector('#exportMinPurchases').value) || 0,
      minSpent: parseInt(modal.querySelector('#exportMinSpent').value) || 0,
      vipOnly: modal.querySelector('#exportVIPOnly').checked,
      includeHistory: modal.querySelector('#exportIncludeHistory').checked
    };
    
    await exportBuyersCSV(options);
    closeModal();
  });
  
  // Close on Escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Initialize export buyers button handler
 */
export function initExportBuyersButton() {
  const exportBtn = document.getElementById('exportBuyersBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showExportBuyersModal();
    });
  }
}

export default {
  exportBuyersCSV,
  quickExportBuyers,
  exportVIPBuyers,
  exportActiveBuyers,
  exportBuyersByDateRange,
  showExportBuyersModal,
  initExportBuyersButton
};
