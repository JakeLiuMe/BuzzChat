// BuzzChat - Inventory Management
// Simple product tracking for live sellers

import { browserAPI } from '../core/config.js';
import { Toast } from '../ui/toast.js';

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
  getSession
};
