/**
 * Test helper utilities for Whatnot Chat Bot tests
 */

/**
 * Default test settings that mirror the extension defaults
 */
const DEFAULT_SETTINGS = {
  enabled: true,
  tier: 'free',
  messageCount: 0,
  welcomeEnabled: false,
  welcomeMessage: 'Welcome to the stream, {username}! Thanks for joining us!',
  welcomeDelay: 2,
  timerEnabled: false,
  timerMessage: '',
  timerInterval: 5,
  faqEnabled: false,
  faqRules: [],
  faqCaseSensitive: false,
  giveawayEnabled: false,
  giveawayKeyword: '',
  giveawayEntries: [],
  templates: [],
  soundEnabled: false,
  customSelector: '',
  showMessageCount: true,
};

/**
 * Sample FAQ rules for testing
 */
const SAMPLE_FAQ_RULES = [
  { triggers: 'shipping, ship, deliver', response: 'We ship within 2-3 business days!' },
  { triggers: 'payment, pay, venmo', response: 'We accept all major cards and Venmo!' },
  { triggers: 'return, refund', response: 'Returns accepted within 30 days.' },
];

/**
 * Sample templates for testing
 */
const SAMPLE_TEMPLATES = [
  { name: 'Welcome', text: 'Welcome to the stream! Check out our amazing deals!' },
  { name: 'Thanks', text: 'Thank you for your purchase! You made a great choice!' },
  { name: 'Reminder', text: 'Don\'t forget to follow for notifications on future streams!' },
];

/**
 * Create mock chat message HTML
 */
function createMockMessage(username, text, id = null) {
  const messageId = id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return `
    <div class="chat-message" data-message-id="${messageId}">
      <span class="username">${username}</span>
      <span class="message-text">${text}</span>
    </div>
  `;
}

/**
 * Create a full mock Whatnot chat page HTML
 */
function createMockWhatnotPage(options = {}) {
  const {
    hasChat = true,
    isLive = true,
    messages = [],
    customSelector = false,
  } = options;

  const chatContainer = hasChat ? `
    <div data-testid="chat-container" class="ChatContainer">
      <div data-testid="chat-messages" class="ChatMessages">
        ${messages.map(m => createMockMessage(m.username, m.text, m.id)).join('\n')}
      </div>
      <div class="chat-input-wrapper">
        <textarea
          data-testid="chat-input"
          ${customSelector ? `id="${customSelector}"` : ''}
          placeholder="Type a message..."
          class="chat-textarea"
        ></textarea>
        <button data-testid="chat-send-button" type="submit" class="send-button">
          Send
        </button>
      </div>
    </div>
  ` : '';

  const liveIndicator = isLive ? '<div class="live-indicator">LIVE</div>' : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Whatnot Live Stream</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .ChatContainer { border: 1px solid #ccc; padding: 10px; }
        .ChatMessages { height: 300px; overflow-y: auto; }
        .chat-message { padding: 5px; margin: 5px 0; }
        .username { font-weight: bold; color: #7c3aed; }
        .message-text { margin-left: 5px; }
        .chat-textarea { width: 100%; padding: 10px; }
        .send-button { padding: 10px 20px; background: #7c3aed; color: white; border: none; cursor: pointer; }
        .live-indicator { background: red; color: white; padding: 5px 10px; display: inline-block; }
      </style>
    </head>
    <body>
      <h1>Mock Whatnot Stream</h1>
      ${liveIndicator}
      ${chatContainer}
      <script>
        // Mock some Whatnot-like behavior
        window.whatnotMock = {
          messages: [],
          addMessage: function(username, text) {
            const messagesContainer = document.querySelector('[data-testid="chat-messages"]');
            if (messagesContainer) {
              const msgId = 'msg-' + Date.now();
              const msgHtml = '<div class="chat-message" data-message-id="' + msgId + '">' +
                '<span class="username">' + username + '</span>' +
                '<span class="message-text">' + text + '</span>' +
                '</div>';
              messagesContainer.insertAdjacentHTML('beforeend', msgHtml);
              this.messages.push({ username, text, id: msgId });
              return msgId;
            }
            return null;
          }
        };

        // Make input work
        const input = document.querySelector('[data-testid="chat-input"]');
        const sendBtn = document.querySelector('[data-testid="chat-send-button"]');
        if (input && sendBtn) {
          sendBtn.addEventListener('click', function() {
            if (input.value.trim()) {
              window.whatnotMock.addMessage('You', input.value);
              input.value = '';
            }
          });
        }
      </script>
    </body>
    </html>
  `;
}

/**
 * Wait for condition with polling
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Timeout waiting for condition');
}

/**
 * Assert storage value matches expected
 */
async function assertStorageValue(storage, key, expected) {
  const actual = await storage.get(key);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Storage mismatch for ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  SAMPLE_FAQ_RULES,
  SAMPLE_TEMPLATES,
  createMockMessage,
  createMockWhatnotPage,
  waitFor,
  assertStorageValue,
};
