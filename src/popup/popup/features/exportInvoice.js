// BuzzChat - Export & Invoice Tools
// Export buyer lists, generate invoices, integrate with payment systems

import { browserAPI } from '../core/config.js';
import { getSalesSummary, getSession } from './inventory.js';
import { getBuyers, getBuyerProfile } from './buyers.js';
import { Toast } from '../ui/toast.js';

/**
 * Export sales as CSV for invoicing
 */
export async function exportSalesCSV() {
  const session = await getSession();
  const sales = session.soldItems || [];
  
  if (sales.length === 0) {
    Toast.warning('No sales to export!');
    return;
  }
  
  let csv = 'BuzzChat Sales Export\n';
  csv += `Date,${new Date().toLocaleDateString()}\n\n`;
  csv += 'Buyer,Item,Price,Time,Status\n';
  
  sales.forEach(sale => {
    const time = new Date(sale.soldAt).toLocaleString();
    const buyer = sale.buyer || 'Unknown';
    csv += `"${buyer}","${sale.name}",${sale.price.toFixed(2)},"${time}",Pending\n`;
  });
  
  csv += `\nTotal Sales,${sales.length}\n`;
  csv += `Total Revenue,$${sales.reduce((sum, s) => sum + s.price, 0).toFixed(2)}\n`;
  
  downloadCSV(csv, `sales-${new Date().toISOString().split('T')[0]}.csv`);
  Toast.success(`Exported ${sales.length} sales!`);
}

/**
 * Export buyer contact list
 */
export async function exportBuyerList() {
  const buyers = await getBuyers();
  const buyerList = Object.values(buyers);
  
  if (buyerList.length === 0) {
    Toast.warning('No buyers to export!');
    return;
  }
  
  let csv = 'BuzzChat Buyer List\n';
  csv += `Exported,${new Date().toLocaleDateString()}\n\n`;
  csv += 'Username,Total Purchases,Total Spent,First Seen,Last Seen,VIP,Notes\n';
  
  buyerList
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .forEach(buyer => {
      const firstSeen = new Date(buyer.firstSeen).toLocaleDateString();
      const lastSeen = new Date(buyer.lastSeen).toLocaleDateString();
      const isVIP = buyer.tags?.includes('vip') ? 'Yes' : 'No';
      const notes = (buyer.notes || '').replace(/"/g, '""');
      csv += `"${buyer.username}",${buyer.totalPurchases},$${buyer.totalSpent.toFixed(2)},"${firstSeen}","${lastSeen}",${isVIP},"${notes}"\n`;
    });
  
  csv += `\nTotal Buyers,${buyerList.length}\n`;
  csv += `VIP Buyers,${buyerList.filter(b => b.tags?.includes('vip')).length}\n`;
  csv += `Total Revenue,$${buyerList.reduce((sum, b) => sum + b.totalSpent, 0).toFixed(2)}\n`;
  
  downloadCSV(csv, `buyers-${new Date().toISOString().split('T')[0]}.csv`);
  Toast.success(`Exported ${buyerList.length} buyers!`);
}

/**
 * Generate invoice text for a buyer
 */
export async function generateInvoice(buyerUsername, items, options = {}) {
  const {
    sellerName = 'BuzzChat Seller',
    paymentMethods = ['PayPal', 'Venmo'],
    notes = '',
    dueDate = null
  } = options;
  
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const shipping = options.shipping || 0;
  const total = subtotal + shipping;
  
  const invoice = {
    id: `INV-${Date.now()}`,
    buyer: buyerUsername,
    seller: sellerName,
    date: new Date().toLocaleDateString(),
    dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    items,
    subtotal,
    shipping,
    total,
    paymentMethods,
    notes,
    status: 'pending'
  };
  
  return invoice;
}

/**
 * Format invoice as text message
 */
export function formatInvoiceAsMessage(invoice) {
  let msg = `📋 INVOICE #${invoice.id.slice(-6)}\n`;
  msg += `From: ${invoice.seller}\n`;
  msg += `Date: ${invoice.date}\n\n`;
  
  msg += `Items:\n`;
  invoice.items.forEach((item, i) => {
    msg += `${i + 1}. ${item.name} - $${item.price.toFixed(2)}\n`;
  });
  
  msg += `\n`;
  msg += `Subtotal: $${invoice.subtotal.toFixed(2)}\n`;
  if (invoice.shipping > 0) {
    msg += `Shipping: $${invoice.shipping.toFixed(2)}\n`;
  }
  msg += `TOTAL: $${invoice.total.toFixed(2)}\n\n`;
  
  msg += `💳 Payment Methods:\n`;
  invoice.paymentMethods.forEach(method => {
    msg += `• ${method}\n`;
  });
  
  if (invoice.notes) {
    msg += `\n📝 ${invoice.notes}\n`;
  }
  
  msg += `\nDue by: ${invoice.dueDate}`;
  msg += `\n\nThank you for your purchase! 🙏`;
  
  return msg;
}

/**
 * Generate PayPal.me link
 */
export function generatePayPalLink(email, amount, description = '') {
  const baseUrl = 'https://paypal.me';
  const encodedDesc = encodeURIComponent(description);
  return `${baseUrl}/${email}/${amount}?description=${encodedDesc}`;
}

/**
 * Generate Venmo link
 */
export function generateVenmoLink(username, amount, note = '') {
  const encodedNote = encodeURIComponent(note);
  return `https://venmo.com/${username}?txn=pay&amount=${amount}&note=${encodedNote}`;
}

/**
 * Generate invoice with payment links
 */
export function formatInvoiceWithLinks(invoice, paymentConfig = {}) {
  let msg = formatInvoiceAsMessage(invoice);
  
  msg += `\n\n🔗 Quick Pay Links:\n`;
  
  if (paymentConfig.paypal) {
    const link = generatePayPalLink(paymentConfig.paypal, invoice.total, `Invoice ${invoice.id}`);
    msg += `PayPal: ${link}\n`;
  }
  
  if (paymentConfig.venmo) {
    const link = generateVenmoLink(paymentConfig.venmo, invoice.total, `BuzzChat Invoice ${invoice.id}`);
    msg += `Venmo: ${link}\n`;
  }
  
  if (paymentConfig.cashapp) {
    msg += `CashApp: $${paymentConfig.cashapp} ($${invoice.total.toFixed(2)})\n`;
  }
  
  return msg;
}

/**
 * Batch export all pending invoices
 */
export async function exportPendingInvoices() {
  const session = await getSession();
  const sales = session.soldItems || [];
  
  // Group by buyer
  const byBuyer = {};
  sales.forEach(sale => {
    const buyer = sale.buyer || 'Unknown';
    if (!byBuyer[buyer]) {
      byBuyer[buyer] = [];
    }
    byBuyer[buyer].push(sale);
  });
  
  let allInvoices = '# BuzzChat Invoices\n';
  allInvoices += `Generated: ${new Date().toLocaleString()}\n\n`;
  allInvoices += '---\n\n';
  
  Object.entries(byBuyer).forEach(([buyer, items]) => {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    allInvoices += `## @${buyer}\n`;
    allInvoices += `Items: ${items.length} | Total: $${total.toFixed(2)}\n\n`;
    items.forEach(item => {
      allInvoices += `- ${item.name}: $${item.price.toFixed(2)}\n`;
    });
    allInvoices += '\n---\n\n';
  });
  
  // Download as text file
  const blob = new Blob([allInvoices], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoices-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  Toast.success(`Generated invoices for ${Object.keys(byBuyer).length} buyers!`);
}

/**
 * Download CSV helper
 */
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
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
 * Export for shipping labels (compatible with Pirate Ship)
 */
export async function exportForShipping() {
  const session = await getSession();
  const buyers = await getBuyers();
  const sales = session.soldItems || [];
  
  // Group by buyer
  const orders = {};
  sales.forEach(sale => {
    const buyer = sale.buyer || 'Unknown';
    if (!orders[buyer]) {
      orders[buyer] = {
        username: buyer,
        items: [],
        total: 0
      };
    }
    orders[buyer].items.push(sale);
    orders[buyer].total += sale.price;
  });
  
  // CSV format compatible with shipping platforms
  let csv = 'Name,Address Line 1,Address Line 2,City,State,Zip,Country,Items,Total\n';
  
  Object.values(orders).forEach(order => {
    const itemList = order.items.map(i => i.name).join('; ');
    // Address would come from buyer profile if available
    csv += `"${order.username}","","","","","","USA","${itemList}",$${order.total.toFixed(2)}\n`;
  });
  
  downloadCSV(csv, `shipping-export-${new Date().toISOString().split('T')[0]}.csv`);
  Toast.success('Exported for shipping! Add addresses in your shipping platform.');
}

/**
 * Show invoice generator modal
 */
export function showInvoiceModal(buyerUsername, items) {
  const invoice = generateInvoice(buyerUsername, items);
  const message = formatInvoiceAsMessage(invoice);
  
  const modal = document.createElement('div');
  modal.className = 'invoice-modal';
  modal.innerHTML = `
    <div class="invoice-backdrop"></div>
    <div class="invoice-content">
      <h2>📋 Invoice for @${buyerUsername}</h2>
      <pre class="invoice-preview">${message}</pre>
      <div class="invoice-actions">
        <button class="btn btn-secondary invoice-copy">📋 Copy</button>
        <button class="btn btn-primary invoice-close">Done</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.invoice-backdrop').addEventListener('click', () => modal.remove());
  modal.querySelector('.invoice-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.invoice-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(message);
    Toast.success('Invoice copied!');
  });
}

export default {
  exportSalesCSV,
  exportBuyerList,
  generateInvoice,
  formatInvoiceAsMessage,
  formatInvoiceWithLinks,
  generatePayPalLink,
  generateVenmoLink,
  exportPendingInvoices,
  exportForShipping,
  showInvoiceModal
};
