// BuzzChat - Message Sending
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { browserAPI, CONFIG, RATE_LIMIT, StorageWriter } from './config.js';
import { state, getSelectors, selectorCache } from './state.js';
import { recordMessageSent } from './rateLimit.js';

// Find element using multiple selectors with caching
export function findElement(selectorList, cacheKey = null) {
  // If we have a cached working selector, try it first
  if (cacheKey && selectorCache[cacheKey]) {
    try {
      const element = document.querySelector(selectorCache[cacheKey]);
      if (element) return element;
      // Cached selector no longer works, clear it
      selectorCache[cacheKey] = null;
    } catch (e) {
      selectorCache[cacheKey] = null;
    }
  }

  // Try each selector in the list
  for (const selector of selectorList) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        // Cache this working selector for future use
        if (cacheKey) {
          selectorCache[cacheKey] = selector;
        }
        return element;
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }
  return null;
}

// Send a chat message
export function sendChatMessage(message) {
  if (!message) return false;

  // Validate and truncate message length
  let sanitizedMessage = message.trim();

  // Add watermark if enabled (free tier viral growth feature)
  if (state.settings?.settings?.watermark && state.settings.tier === 'free') {
    const watermark = ' - BuzzChat';
    const maxLengthWithWatermark = RATE_LIMIT.MAX_MESSAGE_LENGTH - watermark.length;
    if (sanitizedMessage.length > maxLengthWithWatermark) {
      sanitizedMessage = sanitizedMessage.substring(0, maxLengthWithWatermark);
    }
    sanitizedMessage += watermark;
  } else if (sanitizedMessage.length > RATE_LIMIT.MAX_MESSAGE_LENGTH) {
    console.warn(`[BuzzChat] Message truncated from ${sanitizedMessage.length} to ${RATE_LIMIT.MAX_MESSAGE_LENGTH} chars`);
    sanitizedMessage = sanitizedMessage.substring(0, RATE_LIMIT.MAX_MESSAGE_LENGTH);
  }

  if (!sanitizedMessage) return false;

  const selectors = getSelectors();

  // Try to find chat input if not already found (with caching)
  if (!state.chatInput) {
    state.chatInput = findElement(selectors.chatInput, 'chatInput');
    if (state.settings?.settings?.chatSelector) {
      try {
        state.chatInput = document.querySelector(state.settings.settings.chatSelector) || state.chatInput;
      } catch (_e) {
        // Invalid selector - ignore and use default
      }
    }
  }

  if (!state.chatInput) {
    console.error('[BuzzChat] Chat input not found');
    return false;
  }

  // Set the message value
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(state.chatInput, sanitizedMessage);
  } else {
    state.chatInput.value = sanitizedMessage;
  }

  // Record message for rate limiting
  recordMessageSent();

  // Update message count BEFORE sending (prevents race condition)
  if (state.settings.tier === 'free') {
    state.settings.messagesUsed++;
    // Use batched storage writer to reduce I/O
    StorageWriter.queue('whatnotBotSettings', state.settings);
    browserAPI.runtime.sendMessage({ type: 'MESSAGE_SENT' });
  }

  // Dispatch input event
  state.chatInput.dispatchEvent(new Event('input', { bubbles: true }));

  // Try to send the message
  setTimeout(() => {
    // Try clicking send button (with caching)
    state.sendButton = findElement(selectors.sendButton, 'sendButton');
    if (state.sendButton) {
      state.sendButton.click();
    } else {
      // Try Enter key
      state.chatInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));

      state.chatInput.dispatchEvent(new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));

      state.chatInput.dispatchEvent(new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
    }

    console.log(`[BuzzChat] Message sent: ${sanitizedMessage.substring(0, 50)}...`);
  }, CONFIG.SEND_DELAY_MS);

  return true;
}
