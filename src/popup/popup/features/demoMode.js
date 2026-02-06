// BuzzChat - Demo Mode
// Interactive demo mode for experiencing features without a live stream

import { browserAPI } from '../core/config.js';
import { settings } from '../core/state.js';
import { Toast } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { recordMessage, updateViewers, trackMention, addAlert, renderDashboard, ALERT_TYPES } from './dashboard.js';
import { getProducts, addProduct, markSold, detectPurchaseIntent, matchProductMention, renderInventoryList, updateStreamSummary } from './inventory.js';
import { recordInteraction, recordPurchase } from './buyers.js';

// ============================================
// Demo Mode State
// ============================================

let demoActive = false;
let messageIntervalId = null;
let viewerIntervalId = null;
let demoViewerCount = 0;
let messageIndex = 0;

// ============================================
// Demo Message Pool
// ============================================

const DEMO_MESSAGES = [
  // Greetings
  { user: 'sneaker_fan_22', text: 'Hey everyone! First time here 👋', type: 'greeting' },
  { user: 'repeat_buyer', text: 'Back again! Love this store', type: 'greeting' },
  { user: 'live_shopper', text: 'Just got here, what did I miss?', type: 'greeting' },
  { user: 'collector_joe', text: 'Yo! Hyped for tonight 🔥', type: 'greeting' },
  { user: 'newbie_viewer', text: 'Hi everyone, first live sale for me!', type: 'greeting' },
  { user: 'night_owl_23', text: 'Late night crew checking in 🦉', type: 'greeting' },
  
  // Questions about products
  { user: 'collector_mike', text: 'How much for the Jordans?', type: 'question', triggers: ['price', 'how much'] },
  { user: 'newbie_123', text: 'Do you ship to Canada?', type: 'question', triggers: ['shipping', 'ship'] },
  { user: 'curious_cat', text: 'What size are those?', type: 'question', triggers: ['size'] },
  { user: 'first_timer', text: 'How do I pay?', type: 'question', triggers: ['payment', 'pay'] },
  { user: 'savvy_shopper', text: 'Any bundle deals?', type: 'question', triggers: ['bundle', 'deal'] },
  { user: 'detail_queen', text: 'Is that authentic?', type: 'question', triggers: ['authentic', 'real'] },
  { user: 'careful_buyer', text: 'Can I see more pics?', type: 'question', triggers: ['pics', 'photos'] },
  { user: 'practical_paul', text: 'How long is shipping?', type: 'question', triggers: ['shipping', 'ship'] },
  { user: 'returnsCheckr', text: 'What's your return policy?', type: 'question', triggers: ['returns', 'refund'] },
  { user: 'condition_checker', text: 'Any flaws on this one?', type: 'question', triggers: ['condition', 'flaws'] },
  
  // Purchase Intent (SOLD signals)
  { user: 'sarah_buys', text: 'SOLD on the dunks! 🔥', type: 'sold' },
  { user: 'fast_bidder', text: 'I\'ll take it!', type: 'sold' },
  { user: 'impulse_buyer', text: 'Mine! Claiming this one', type: 'sold' },
  { user: 'serious_collector', text: 'SOLD! Don\'t skip me!', type: 'sold' },
  { user: 'quick_draw', text: 'Sold sold sold!!!', type: 'sold' },
  { user: 'sneaker_addict', text: 'claiming the 11s!', type: 'sold' },
  { user: 'must_have_it', text: 'I need those, SOLD!', type: 'sold' },
  { user: 'no_hesitation', text: 'Take my money! 💵', type: 'sold' },
  
  // Hype & Reactions
  { user: 'hype_beast', text: 'These are fire 🔥🔥🔥', type: 'hype' },
  { user: 'excitedFan', text: '🔥🔥🔥🔥🔥', type: 'hype' },
  { user: 'energy_emma', text: 'LET\'S GOOO!!!', type: 'hype' },
  { user: 'vibes_only', text: 'The energy tonight is crazy!', type: 'hype' },
  { user: 'real_recognize', text: 'This stream is 🔥', type: 'hype' },
  { user: 'hype_train', text: 'W STREAM 🏆', type: 'hype' },
  { user: 'excited_eric', text: 'Best stream of the week!', type: 'hype' },
  { user: 'love_this', text: '❤️❤️❤️ amazing!', type: 'hype' },
  
  // Price & Deal Focused
  { user: 'bargain_hunter', text: 'Any deals today?', type: 'question', triggers: ['deals'] },
  { user: 'deal_seeker', text: 'Can you do $50?', type: 'question' },
  { user: 'budget_buyer', text: 'That\'s a steal!', type: 'hype' },
  { user: 'value_queen', text: 'Great price 👏', type: 'hype' },
  { user: 'penny_pincher', text: 'Any discount for multiple?', type: 'question', triggers: ['discount'] },
  
  // Specific Product Mentions
  { user: 'jordans_lover', text: 'Need those Jordans in my life!', type: 'mention', product: 'Jordan' },
  { user: 'dunk_collector', text: 'Those dunks are clean!', type: 'mention', product: 'Dunk' },
  { user: 'vintage_vince', text: 'The vintage tee is sick', type: 'mention', product: 'Vintage' },
  { user: 'hoodie_hunter', text: 'That hoodie goes hard', type: 'mention', product: 'Hoodie' },
  
  // Social / Engagement
  { user: 'social_butterfly', text: 'Just shared this to my story!', type: 'social' },
  { user: 'supporter', text: 'Keep up the great streams!', type: 'social' },
  { user: 'regular_ray', text: 'Always here for these drops', type: 'social' },
  { user: 'community_carl', text: 'Love this community ❤️', type: 'social' },
  { user: 'follow_reminder', text: 'Don\'t forget to follow!', type: 'social' },
  
  // Giveaway Interest
  { user: 'giveaway_greg', text: 'entered!', type: 'giveaway' },
  { user: 'lucky_lucy', text: 'ENTERED 🍀', type: 'giveaway' },
  { user: 'hopeful_hannah', text: 'entry please!', type: 'giveaway' },
  { user: 'contest_king', text: 'Entering for the giveaway!', type: 'giveaway' },
];

// Demo Products
const DEMO_PRODUCTS = [
  { name: 'Jordan 4 Retro', price: 220, quantity: 3 },
  { name: 'Nike Dunk Low', price: 130, quantity: 5 },
  { name: 'Vintage Band Tee', price: 45, quantity: 8 },
  { name: 'Supreme Hoodie', price: 180, quantity: 2 },
  { name: 'Yeezy 350', price: 280, quantity: 1 },
];

// ============================================
// Demo Mode Functions
// ============================================

/**
 * Check if demo mode is currently active
 */
export function isDemoActive() {
  return demoActive;
}

/**
 * Start demo mode
 */
export async function startDemoMode() {
  if (demoActive) {
    Toast.warning('Demo mode is already running!');
    return;
  }
  
  demoActive = true;
  messageIndex = 0;
  demoViewerCount = Math.floor(Math.random() * 50) + 25; // 25-75 initial viewers
  
  // Show demo banner
  showDemoBanner();
  
  // Load demo products if inventory is empty
  await loadDemoProducts();
  
  // Start simulated message stream
  startMessageSimulation();
  
  // Start viewer count fluctuation
  startViewerSimulation();
  
  // Update dashboard to show live state
  await updateViewers(demoViewerCount);
  await renderDashboard();
  
  // Send initial welcome alert
  await addAlert(ALERT_TYPES.SUGGESTED_ACTION, '🎮 Demo Mode Active! Watch features in action.', { demo: true });
  
  Toast.success('🎮 Demo Mode Started! Watch the magic happen.');
  
  console.log('[BuzzChat Demo] Demo mode started');
}

/**
 * Stop demo mode
 */
export async function stopDemoMode() {
  if (!demoActive) return;
  
  demoActive = false;
  
  // Clear intervals
  if (messageIntervalId) {
    clearInterval(messageIntervalId);
    messageIntervalId = null;
  }
  
  if (viewerIntervalId) {
    clearInterval(viewerIntervalId);
    viewerIntervalId = null;
  }
  
  // Hide demo banner
  hideDemoBanner();
  
  // Reset viewer count
  await updateViewers(0);
  await renderDashboard();
  
  Toast.info('Demo mode ended. Try it on a real stream!');
  
  console.log('[BuzzChat Demo] Demo mode stopped');
}

/**
 * Toggle demo mode
 */
export async function toggleDemoMode() {
  if (demoActive) {
    await stopDemoMode();
  } else {
    await startDemoMode();
  }
}

// ============================================
// Simulation Functions
// ============================================

/**
 * Start message simulation
 */
function startMessageSimulation() {
  // Send first message quickly
  setTimeout(simulateMessage, 1000);
  
  // Continue with random intervals
  scheduleNextMessage();
}

/**
 * Schedule next message
 */
function scheduleNextMessage() {
  if (!demoActive) return;
  
  // Random interval between 2-5 seconds
  const delay = Math.floor(Math.random() * 3000) + 2000;
  
  messageIntervalId = setTimeout(() => {
    if (demoActive) {
      simulateMessage();
      scheduleNextMessage();
    }
  }, delay);
}

/**
 * Simulate a single chat message
 */
async function simulateMessage() {
  if (!demoActive) return;
  
  // Pick a message (weighted randomness for variety)
  const message = getRandomMessage();
  const timestamp = Date.now();
  
  console.log(`[BuzzChat Demo] ${message.user}: ${message.text}`);
  
  // Record the message in dashboard
  await recordMessage(message.text, message.user, timestamp);
  
  // Record buyer interaction
  await recordInteraction(message.user, 'demo');
  
  // Check for product mentions and track them
  if (message.product) {
    await trackMention(message.product);
  } else {
    // Check if message mentions any product
    const matchedProduct = await matchProductMention(message.text);
    if (matchedProduct) {
      await trackMention(matchedProduct.name);
    }
  }
  
  // Handle SOLD messages
  if (message.type === 'sold' || detectPurchaseIntent(message.text)) {
    await handleSoldMessage(message);
  }
  
  // Handle FAQ triggers
  if (message.triggers && settings.faq?.enabled) {
    await handleFaqTrigger(message);
  }
  
  // Handle giveaway entries
  if (message.type === 'giveaway' && settings.giveaway?.enabled) {
    await handleGiveawayEntry(message);
  }
  
  // Dispatch event for Smart Queue and other listeners
  dispatchDemoMessage(message, timestamp);
  
  // Update dashboard
  await renderDashboard();
  
  // Occasionally trigger special events
  if (Math.random() < 0.1) {
    await triggerRandomEvent(message);
  }
}

/**
 * Get a random message with weighted selection
 */
function getRandomMessage() {
  // Weighted distribution:
  // 30% questions, 25% hype, 20% sold, 15% greetings, 10% other
  const weights = {
    question: 0.30,
    hype: 0.25,
    sold: 0.20,
    greeting: 0.15,
    mention: 0.05,
    social: 0.03,
    giveaway: 0.02
  };
  
  const roll = Math.random();
  let cumulative = 0;
  let selectedType = 'hype';
  
  for (const [type, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll < cumulative) {
      selectedType = type;
      break;
    }
  }
  
  // Filter messages by type
  const typeMessages = DEMO_MESSAGES.filter(m => m.type === selectedType);
  
  if (typeMessages.length === 0) {
    // Fallback to any message
    return DEMO_MESSAGES[Math.floor(Math.random() * DEMO_MESSAGES.length)];
  }
  
  return typeMessages[Math.floor(Math.random() * typeMessages.length)];
}

/**
 * Handle a SOLD message
 */
async function handleSoldMessage(message) {
  // Try to find a product with stock
  const products = await getProducts();
  const availableProducts = products.filter(p => p.quantity > 0);
  
  if (availableProducts.length > 0) {
    // Pick a random available product
    const product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
    
    // Mark as sold
    await markSold(product.id, message.user);
    
    // Record purchase for buyer
    await recordPurchase(message.user, product.name, product.price, 'demo');
    
    // Add purchase alert
    await addAlert(ALERT_TYPES.PURCHASE_INTENT, `💰 ${message.user} bought ${product.name}!`, {
      username: message.user,
      product: product.name,
      price: product.price
    });
    
    // Update inventory display
    await renderInventoryList();
    await updateStreamSummary();
  }
}

/**
 * Handle FAQ trigger (simulate auto-reply)
 */
async function handleFaqTrigger(message) {
  // Check if any FAQ rules match
  const rules = settings.faq?.rules || [];
  
  for (const rule of rules) {
    if (!rule.triggers || !rule.reply) continue;
    
    const messageLower = message.text.toLowerCase();
    const matched = rule.triggers.some(trigger => {
      const triggerLower = trigger.toLowerCase();
      return rule.caseSensitive 
        ? message.text.includes(trigger)
        : messageLower.includes(triggerLower);
    });
    
    if (matched) {
      // Simulate FAQ auto-reply
      console.log(`[BuzzChat Demo] FAQ Auto-reply triggered: "${rule.reply}"`);
      
      // Add alert about FAQ trigger
      await addAlert(ALERT_TYPES.SUGGESTED_ACTION, `📝 FAQ replied to "${message.triggers[0]}"`, {
        trigger: message.triggers[0],
        reply: rule.reply
      });
      
      break;
    }
  }
}

/**
 * Handle giveaway entry
 */
async function handleGiveawayEntry(message) {
  // Simulate entry notification
  console.log(`[BuzzChat Demo] Giveaway entry from: ${message.user}`);
  
  // In real mode, this would be handled by the giveaway module
  // For demo, just show it's working
}

/**
 * Trigger random special events
 */
async function triggerRandomEvent(message) {
  const events = [
    async () => {
      // VIP arrived
      await addAlert(ALERT_TYPES.VIP_ARRIVED, `🌟 VIP ${message.user} joined the stream!`, { username: message.user });
    },
    async () => {
      // Hot item alert
      const products = await getProducts();
      if (products.length > 0) {
        const product = products[Math.floor(Math.random() * products.length)];
        await addAlert(ALERT_TYPES.HOT_ITEM, `🔥 "${product.name}" getting lots of attention!`, { product: product.name });
      }
    },
    async () => {
      // Low stock warning
      const products = await getProducts();
      const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 2);
      if (lowStock.length > 0) {
        const product = lowStock[0];
        await addAlert(ALERT_TYPES.LOW_STOCK, `⚠️ "${product.name}" almost gone! (${product.quantity} left)`, { product: product.name });
      }
    }
  ];
  
  const event = events[Math.floor(Math.random() * events.length)];
  await event();
}

/**
 * Start viewer count simulation
 */
function startViewerSimulation() {
  viewerIntervalId = setInterval(async () => {
    if (!demoActive) return;
    
    // Fluctuate viewer count by -5 to +10
    const change = Math.floor(Math.random() * 16) - 5;
    demoViewerCount = Math.max(10, demoViewerCount + change);
    
    await updateViewers(demoViewerCount);
    
    // Update viewer display if element exists
    if (elements.dashboardViewers) {
      elements.dashboardViewers.textContent = demoViewerCount.toLocaleString();
    }
  }, 8000); // Every 8 seconds
}

/**
 * Dispatch demo message event for other modules to consume
 */
function dispatchDemoMessage(message, timestamp) {
  // Send message via runtime for other listeners
  browserAPI.runtime.sendMessage({
    type: 'DEMO_CHAT_MESSAGE',
    data: {
      username: message.user,
      message: message.text,
      timestamp,
      isDemo: true,
      messageType: message.type
    }
  }).catch(() => {}); // Ignore errors if no listeners
  
  // Also dispatch DOM event for popup-internal listeners
  const event = new CustomEvent('buzzchat:demo-message', {
    detail: {
      username: message.user,
      message: message.text,
      timestamp,
      type: message.type
    }
  });
  document.dispatchEvent(event);
}

// ============================================
// Demo Products
// ============================================

/**
 * Load demo products if inventory is empty
 */
async function loadDemoProducts() {
  const products = await getProducts();
  
  if (products.length === 0) {
    console.log('[BuzzChat Demo] Loading demo products...');
    
    for (const product of DEMO_PRODUCTS) {
      await addProduct(product.name, product.price, product.quantity);
    }
    
    // Refresh inventory display
    await renderInventoryList();
    await updateStreamSummary();
    
    Toast.info('📦 Demo products loaded!');
  }
}

// ============================================
// UI Functions
// ============================================

/**
 * Show demo mode banner
 */
function showDemoBanner() {
  let banner = document.getElementById('demoBanner');
  
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'demoBanner';
    banner.className = 'demo-banner';
    banner.innerHTML = `
      <span class="demo-banner-icon">🎮</span>
      <span class="demo-banner-text">Demo Mode Active</span>
      <button id="stopDemoBtn" class="btn btn-sm btn-secondary demo-banner-stop" title="Stop Demo">Stop</button>
    `;
    
    // Insert after header
    const header = document.querySelector('.header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
    
    // Add stop button listener
    const stopBtn = document.getElementById('stopDemoBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', stopDemoMode);
    }
  }
  
  banner.classList.add('visible');
}

/**
 * Hide demo mode banner
 */
function hideDemoBanner() {
  const banner = document.getElementById('demoBanner');
  if (banner) {
    banner.classList.remove('visible');
    // Remove after animation
    setTimeout(() => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 300);
  }
}

/**
 * Initialize demo mode button
 */
export function initDemoMode() {
  const demoBtn = document.getElementById('demoModeBtn');
  
  if (demoBtn) {
    demoBtn.addEventListener('click', toggleDemoMode);
  }
  
  // Also add keyboard shortcut (Ctrl+Shift+D)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggleDemoMode();
    }
  });
}

// ============================================
// CSS Styles (injected)
// ============================================

/**
 * Inject demo mode styles
 */
export function injectDemoStyles() {
  if (document.getElementById('demoModeStyles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'demoModeStyles';
  styles.textContent = `
    /* Demo Banner */
    .demo-banner {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      margin: 8px 12px;
      animation: demoPulse 2s ease-in-out infinite;
    }
    
    .demo-banner.visible {
      display: flex;
    }
    
    .demo-banner-icon {
      font-size: 16px;
    }
    
    .demo-banner-text {
      flex: 1;
    }
    
    .demo-banner-stop {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 4px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .demo-banner-stop:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    @keyframes demoPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
    
    /* Demo Mode Button */
    .demo-mode-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .demo-mode-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .demo-mode-btn:active {
      transform: translateY(0);
    }
    
    .demo-mode-btn .demo-icon {
      font-size: 14px;
    }
    
    /* Demo message highlight in Smart Queue */
    .demo-message-indicator {
      display: inline-block;
      padding: 2px 6px;
      background: rgba(102, 126, 234, 0.15);
      color: #667eea;
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
      margin-left: 6px;
      text-transform: uppercase;
    }
  `;
  
  document.head.appendChild(styles);
}

// Auto-inject styles when module loads
if (typeof document !== 'undefined') {
  injectDemoStyles();
}

// Export for use in other modules
export default {
  isDemoActive,
  startDemoMode,
  stopDemoMode,
  toggleDemoMode,
  initDemoMode,
  DEMO_MESSAGES,
  DEMO_PRODUCTS
};
