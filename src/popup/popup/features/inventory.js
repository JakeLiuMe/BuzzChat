// BuzzChat - Inventory Management
// Simple product tracking for live sellers

import { browserAPI } from '../core/config.js';
import { Toast } from '../ui/toast.js';
import { 
  getWaitlistCount, 
  showWaitlistModal, 
  generateSoldOutAnnouncement,
  renderWaitlistStats
} from './waitlist.js';

// Storage keys
const STORAGE_KEYS = {
  PRODUCTS: 'buzzchatInventory',
  SESSION: 'buzzchatInventorySession',
  SETTINGS: 'buzzchatInventorySettings'
};

// Default session state
const DEFAULT_SESSION = {
  startedAt: null,
  soldItems: [],
  totalRevenue: 0
};

// Product schema
// { id, name, price, quantity, originalQty, image?, createdAt, updatedAt }

/**
 * Parse quick-add input: "Jordan 4, $180, 3" or "Jordan 4, 180, 3"
 */
export function parseQuickAdd(input) {
  if (!input || typeof input !== 'string') return null;
  
  // Pattern: "name, $price, qty" or "name, price, qty"
  const parts = input.split(',').map(p => p.trim());
  if (parts.length < 2) return null;
  
  const name = parts[0];
  if (!name) return null;
  
  // Parse price (remove $ if present)
  let priceStr = parts[1].replace(/^\$/, '');
  const price = parseFloat(priceStr);
  if (isNaN(price) || price < 0) return null;
  
  // Parse quantity (default to 1)
  let quantity = 1;
  if (parts.length >= 3) {
    quantity = parseInt(parts[2], 10);
    if (isNaN(quantity) || quantity < 0) quantity = 1;
  }
  
  return { name, price, quantity };
}

/**
 * Generate unique product ID
 */
function generateId() {
  return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all products from storage
 */
export async function getProducts() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.PRODUCTS], (result) => {
      resolve(result[STORAGE_KEYS.PRODUCTS] || []);
    });
  });
}

/**
 * Save products to storage
 */
async function saveProducts(products) {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [STORAGE_KEYS.PRODUCTS]: products }, resolve);
  });
}

/**
 * Get current session data
 */
export async function getSession() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.SESSION], (result) => {
      resolve(result[STORAGE_KEYS.SESSION] || { ...DEFAULT_SESSION });
    });
  });
}

/**
 * Save session data
 */
async function saveSession(session) {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [STORAGE_KEYS.SESSION]: session }, resolve);
  });
}

/**
 * Add a new product
 */
export async function addProduct(name, price, quantity, image = null) {
  const products = await getProducts();
  
  const newProduct = {
    id: generateId(),
    name: name.trim(),
    price: parseFloat(price),
    quantity: parseInt(quantity, 10),
    originalQty: parseInt(quantity, 10),
    image,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  products.push(newProduct);
  await saveProducts(products);
  
  return newProduct;
}

/**
 * Update product quantity (delta can be positive or negative)
 */
export async function updateQuantity(productId, delta) {
  const products = await getProducts();
  const index = products.findIndex(p => p.id === productId);
  
  if (index === -1) return null;
  
  products[index].quantity = Math.max(0, products[index].quantity + delta);
  products[index].updatedAt = Date.now();
  
  await saveProducts(products);
  return products[index];
}

/**
 * Mark a product as sold (decrements quantity and logs sale)
 */
export async function markSold(productId, buyerUsername = null) {
  const products = await getProducts();
  const index = products.findIndex(p => p.id === productId);
  
  if (index === -1) return null;
  
  const product = products[index];
  if (product.quantity <= 0) {
    Toast.warning(`${product.name} is out of stock!`);
    return null;
  }
  
  // Decrement quantity
  product.quantity -= 1;
  product.updatedAt = Date.now();
  
  // Update session
  const session = await getSession();
  if (!session.startedAt) {
    session.startedAt = Date.now();
  }
  
  session.soldItems.push({
    productId: product.id,
    name: product.name,
    price: product.price,
    buyer: buyerUsername,
    soldAt: Date.now()
  });
  session.totalRevenue += product.price;
  
  await saveProducts(products);
  await saveSession(session);
  
  // Notify dashboard of sale
  browserAPI.runtime.sendMessage({
    type: 'DASHBOARD_SOLD',
    data: {
      productId: product.id,
      productName: product.name,
      price: product.price,
      buyer: buyerUsername,
      remainingQty: product.quantity
    }
  }).catch(() => {}); // Popup may not be open
  
  // Check for low stock alert
  if (product.quantity > 0 && product.quantity <= 2) {
    browserAPI.runtime.sendMessage({
      type: 'DASHBOARD_LOW_STOCK',
      data: {
        productId: product.id,
        productName: product.name,
        quantity: product.quantity
      }
    }).catch(() => {});
  }
  
  // Check for sold-out FOMO announcement
  if (product.quantity === 0) {
    const fomoAnnouncement = await generateSoldOutAnnouncement(product);
    browserAPI.runtime.sendMessage({
      type: 'INVENTORY_SOLD_OUT',
      data: {
        productId: product.id,
        productName: product.name,
        announcement: fomoAnnouncement
      }
    }).catch(() => {});
  }
  
  Toast.success(`🛒 SOLD: ${product.name} - $${product.price.toFixed(2)}`);
  
  return { product, session };
}

/**
 * Get products with low stock
 */
export async function getLowStock(threshold = 2) {
  const products = await getProducts();
  return products.filter(p => p.quantity > 0 && p.quantity <= threshold);
}

/**
 * Get out of stock products
 */
export async function getOutOfStock() {
  const products = await getProducts();
  return products.filter(p => p.quantity === 0);
}

/**
 * Get sales summary for current session
 */
export async function getSalesSummary() {
  const session = await getSession();
  const products = await getProducts();
  
  // Count items by name
  const itemCounts = {};
  session.soldItems.forEach(item => {
    itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
  });
  
  return {
    totalSold: session.soldItems.length,
    totalRevenue: session.totalRevenue,
    items: session.soldItems,
    itemCounts,
    startedAt: session.startedAt,
    duration: session.startedAt ? Date.now() - session.startedAt : 0,
    avgItemPrice: session.soldItems.length > 0 
      ? session.totalRevenue / session.soldItems.length 
      : 0,
    currentInventory: products.reduce((sum, p) => sum + p.quantity, 0)
  };
}

/**
 * Reset session (keep products, clear sales)
 */
export async function resetSession() {
  await saveSession({ ...DEFAULT_SESSION });
  Toast.success('Session reset! Products kept.');
}

/**
 * Delete a product
 */
export async function deleteProduct(productId) {
  const products = await getProducts();
  const filtered = products.filter(p => p.id !== productId);
  await saveProducts(filtered);
}

/**
 * Update product details
 */
export async function updateProduct(productId, updates) {
  const products = await getProducts();
  const index = products.findIndex(p => p.id === productId);
  
  if (index === -1) return null;
  
  products[index] = {
    ...products[index],
    ...updates,
    updatedAt: Date.now()
  };
  
  await saveProducts(products);
  return products[index];
}

/**
 * Export inventory to CSV
 */
export async function exportToCSV() {
  const products = await getProducts();
  const session = await getSession();
  
  // Products CSV
  let csv = 'Name,Price,Quantity,Original Qty,Status\n';
  products.forEach(p => {
    const status = p.quantity === 0 ? 'SOLD OUT' : p.quantity <= 2 ? 'LOW' : 'OK';
    csv += `"${p.name}",${p.price},${p.quantity},${p.originalQty},${status}\n`;
  });
  
  csv += '\n\nSales This Session\n';
  csv += 'Item,Price,Buyer,Time\n';
  session.soldItems.forEach(item => {
    const time = new Date(item.soldAt).toLocaleString();
    csv += `"${item.name}",${item.price},"${item.buyer || 'Unknown'}","${time}"\n`;
  });
  
  csv += `\nTotal Sold,${session.soldItems.length}\n`;
  csv += `Total Revenue,$${session.totalRevenue.toFixed(2)}\n`;
  
  return csv;
}

/**
 * Download CSV file
 */
export function downloadCSV(csv, filename = 'buzzchat-inventory.csv') {
  const blob = new Blob([csv], { type: 'text/csv' });
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
 * Get status badge for a product
 */
export function getStatusBadge(product) {
  if (product.quantity === 0) {
    return { class: 'status-sold', text: '❌ SOLD', color: 'red' };
  }
  if (product.quantity <= 2) {
    return { class: 'status-low', text: `⚠️ ${product.quantity} LEFT`, color: 'orange' };
  }
  return { class: 'status-ok', text: '✅ OK', color: 'green' };
}

// SOLD Detection patterns
const SOLD_PATTERNS = [
  /\b(sold|mine|i['']?ll take (it|this|that)|claiming|claim(ed)?|want (it|this|that))\b/i,
  /\b(i want (it|this|that|one)|dibs|got it|taking (it|this|that))\b/i,
  /\b(buy(ing)?|purchase|order(ing)?)\b/i
];

/**
 * Check if a message contains purchase intent
 */
export function detectPurchaseIntent(message) {
  if (!message || typeof message !== 'string') return false;
  return SOLD_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Find which product a message might be referring to
 */
export async function matchProductMention(message) {
  if (!message) return null;
  
  const products = await getProducts();
  const msgLower = message.toLowerCase();
  
  // Check for product name mentions
  for (const product of products) {
    const nameLower = product.name.toLowerCase();
    const nameWords = nameLower.split(/\s+/);
    
    // Check if any significant word from product name is in message
    const significantWords = nameWords.filter(w => w.length > 2);
    if (significantWords.some(word => msgLower.includes(word))) {
      return product;
    }
  }
  
  return null;
}

/**
 * Render inventory list in popup
 */
export async function renderInventoryList() {
  const container = document.getElementById('inventoryList');
  if (!container) return;
  
  const products = await getProducts();
  
  // Clear container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  if (products.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state-inline';
    empty.innerHTML = `
      <span class="empty-icon">📦</span>
      <p class="empty-entries">No products yet!</p>
      <p class="empty-hint">Quick add: "Jordan 4, $180, 3"</p>
    `;
    container.appendChild(empty);
    return;
  }
  
  for (const product of products) {
    const item = document.createElement('div');
    const statusClass = product.quantity === 0 ? 'sold' : product.quantity <= 2 ? 'low' : 'ok';
    item.className = `inventory-item status-${statusClass}`;
    item.dataset.productId = product.id;
    
    // Get waitlist count for sold-out items
    const waitlistCount = product.quantity === 0 ? await getWaitlistCount(product.id) : 0;
    
    const info = document.createElement('div');
    info.className = 'inventory-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'inventory-name';
    nameSpan.textContent = product.name;
    
    const priceSpan = document.createElement('span');
    priceSpan.className = 'inventory-price';
    priceSpan.textContent = `$${product.price.toFixed(2)}`;
    
    const qtySpan = document.createElement('span');
    qtySpan.className = 'inventory-qty';
    qtySpan.textContent = `× ${product.quantity}`;
    
    const badge = document.createElement('span');
    const statusInfo = getStatusBadge(product);
    badge.className = `inventory-badge badge-${statusClass}`;
    
    // Enhanced badge for sold-out items with waitlist
    if (product.quantity === 0 && waitlistCount > 0) {
      badge.textContent = `❌ SOLD (${waitlistCount} waiting)`;
      badge.classList.add('badge-waitlist');
    } else {
      badge.textContent = statusClass.toUpperCase();
    }
    
    info.appendChild(nameSpan);
    info.appendChild(priceSpan);
    info.appendChild(qtySpan);
    info.appendChild(badge);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'inventory-actions';
    
    const minusBtn = document.createElement('button');
    minusBtn.className = 'btn btn-sm btn-secondary';
    minusBtn.textContent = '−';
    minusBtn.title = 'Decrease quantity';
    minusBtn.onclick = async () => {
      await updateQuantity(product.id, -1);
      renderInventoryList();
      updateStreamSummary();
    };
    
    const plusBtn = document.createElement('button');
    plusBtn.className = 'btn btn-sm btn-secondary';
    plusBtn.textContent = '+';
    plusBtn.title = 'Increase quantity';
    plusBtn.onclick = async () => {
      await updateQuantity(product.id, 1);
      renderInventoryList();
      updateStreamSummary();
    };
    
    const soldBtn = document.createElement('button');
    soldBtn.className = 'btn btn-sm btn-primary';
    soldBtn.textContent = 'SOLD';
    soldBtn.title = 'Mark as sold';
    soldBtn.disabled = product.quantity === 0;
    soldBtn.onclick = async () => {
      await markSold(product.id);
      renderInventoryList();
      updateStreamSummary();
    };
    
    // Waitlist button for sold-out items
    const waitlistBtn = document.createElement('button');
    waitlistBtn.className = 'btn btn-sm btn-secondary';
    waitlistBtn.textContent = waitlistCount > 0 ? `📝 ${waitlistCount}` : '📝';
    waitlistBtn.title = waitlistCount > 0 ? `View ${waitlistCount} waiting` : 'View waitlist';
    waitlistBtn.style.display = product.quantity === 0 ? 'inline-block' : 'none';
    waitlistBtn.onclick = async () => {
      await showWaitlistModal(product.id);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete product';
    deleteBtn.onclick = async () => {
      if (confirm(`Delete "${product.name}"?`)) {
        await deleteProduct(product.id);
        renderInventoryList();
        updateStreamSummary();
      }
    };
    
    actions.appendChild(minusBtn);
    actions.appendChild(plusBtn);
    actions.appendChild(soldBtn);
    actions.appendChild(waitlistBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(info);
    item.appendChild(actions);
    container.appendChild(item);
  }
}

/**
 * Update stream summary display
 */
export async function updateStreamSummary() {
  const summary = document.getElementById('inventoryStreamSummary');
  if (!summary) return;
  
  const data = await getSalesSummary();
  summary.textContent = `This stream: ${data.totalSold} sold • $${data.totalRevenue.toFixed(2)} estimated`;
}

/**
 * Initialize inventory UI and event handlers
 */
export async function initInventory() {
  // Render initial list
  await renderInventoryList();
  await updateStreamSummary();
  await renderWaitlistStats();
  
  // Quick-add handler
  const quickAddInput = document.getElementById('inventoryQuickAdd');
  const quickAddBtn = document.getElementById('inventoryQuickAddBtn');
  
  if (quickAddInput && quickAddBtn) {
    const handleQuickAdd = async () => {
      const input = quickAddInput.value.trim();
      if (!input) return;
      
      const parsed = parseQuickAdd(input);
      if (parsed) {
        await addProduct(parsed.name, parsed.price, parsed.quantity);
        quickAddInput.value = '';
        await renderInventoryList();
        await updateStreamSummary();
        Toast.success(`Added: ${parsed.name}`);
      } else {
        Toast.warning('Format: "Product name, $price, qty"');
      }
    };
    
    quickAddBtn.addEventListener('click', handleQuickAdd);
    quickAddInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickAdd();
      }
    });
  }
  
  // Export button
  const exportBtn = document.getElementById('inventoryExportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const csv = await exportToCSV();
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `buzzchat-inventory-${date}.csv`);
      Toast.success('Inventory exported!');
    });
  }
  
  // Reset session button
  const resetBtn = document.getElementById('inventoryResetSessionBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      await resetSession();
      await updateStreamSummary();
    });
  }
}

// Export for use in other modules
export default {
  parseQuickAdd,
  getProducts,
  addProduct,
  updateQuantity,
  markSold,
  getLowStock,
  getOutOfStock,
  getSalesSummary,
  resetSession,
  deleteProduct,
  updateProduct,
  exportToCSV,
  downloadCSV,
  getStatusBadge,
  detectPurchaseIntent,
  matchProductMention,
  getSession,
  renderInventoryList,
  updateStreamSummary,
  initInventory
};
