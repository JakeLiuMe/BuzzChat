// BuzzChat - Inventory SOLD Detection
// Detects purchase intent in chat messages

// Purchase intent patterns
const SOLD_PATTERNS = [
  /\bsold\b/i,
  /\bi['']?ll take it\b/i,
  /\bmine\b/i,
  /\bclaiming\b/i,
  /\bclaim this\b/i,
  /\bi want (?:this|it)\b/i,
  /\bgive it to me\b/i,
  /\bi['']?ll buy\b/i,
  /\btake my money\b/i,
  /\bdibs\b/i
];

// Check if a message contains purchase intent
export function detectPurchaseIntent(messageText) {
  if (!messageText || typeof messageText !== 'string') return false;
  
  for (const pattern of SOLD_PATTERNS) {
    if (pattern.test(messageText)) {
      return true;
    }
  }
  return false;
}

// Extract potential product reference from message
export function extractProductHint(messageText) {
  if (!messageText) return null;
  
  // Look for common product references
  // "sold on the Jordan 4" -> "Jordan 4"
  // "I'll take the red one" -> "red one"
  // "mine for the sneakers" -> "sneakers"
  
  const patterns = [
    /(?:sold|take|want|claiming|claim|dibs)(?:\s+(?:on|for))?\s+(?:the\s+)?(.+?)(?:!|$)/i,
    /(?:the\s+)?(.+?)\s+(?:sold|please|pls)/i
  ];
  
  for (const pattern of patterns) {
    const match = messageText.match(pattern);
    if (match && match[1]) {
      const hint = match[1].trim();
      // Filter out common non-product words
      if (hint.length > 2 && hint.length < 50 && !/^(it|this|that|one)$/i.test(hint)) {
        return hint;
      }
    }
  }
  
  return null;
}

// Notify popup about detected purchase intent
export function notifySoldDetection(username, message, browserAPI) {
  const productHint = extractProductHint(message);
  
  browserAPI.runtime.sendMessage({
    type: 'SOLD_DETECTION',
    data: {
      username,
      message,
      suggestedProduct: productHint,
      timestamp: Date.now()
    }
  }).catch(err => {
    // Popup might not be open - this is expected
    if (err?.message && !err.message.includes('Receiving end does not exist')) {
      console.warn('[BuzzChat] SOLD notification failed:', err.message);
    }
  });
}

// Initialize inventory detection in chat observer
export function initInventoryDetection(settings, browserAPI) {
  return function checkInventoryMessage(username, messageText) {
    // Check if auto-detect is enabled
    if (!settings?.inventory?.autoDetectSold) return;
    
    // Check for purchase intent
    if (detectPurchaseIntent(messageText)) {
      console.log(`[BuzzChat] Purchase intent detected from ${username}: ${messageText}`);
      notifySoldDetection(username, messageText, browserAPI);
    }
  };
}
