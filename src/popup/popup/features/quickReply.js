// BuzzChat - Quick Reply Feature
// Quick reply button editor UI

import { settings } from '../core/state.js';
import { saveSettings } from '../core/storage.js';
import { debounce } from '../core/utils.js';
import { Toast } from '../ui/toast.js';
import { elements } from '../ui/elements.js';

// Render quick reply buttons list
export function renderQuickReplyButtons() {
  if (!elements.quickReplyButtonsList) return;
  elements.quickReplyButtonsList.innerHTML = '';

  const buttons = settings.quickReply?.buttons || [];

  if (buttons.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'help-text';
    empty.textContent = 'No buttons configured. Add some quick reply buttons!';
    elements.quickReplyButtonsList.appendChild(empty);
    return;
  }

  buttons.forEach((btn, index) => {
    const item = createQuickReplyEditItem(btn, index);
    elements.quickReplyButtonsList.appendChild(item);
  });
}

// Create a quick reply edit item
function createQuickReplyEditItem(btn, index) {
  const template = elements.quickReplyTemplate.content.cloneNode(true);
  const item = template.querySelector('.quick-reply-edit-item');

  const emojiInput = item.querySelector('.quick-reply-emoji-input');
  const textInput = item.querySelector('.quick-reply-text-input');
  const removeBtn = item.querySelector('.remove-quick-reply-btn');

  emojiInput.value = btn.emoji || '';
  textInput.value = btn.text || '';

  emojiInput.addEventListener('input', debounce(async () => {
    // Basic emoji validation - allow only emoji characters (strip other input)
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Component}\p{Emoji_Modifier}\p{Emoji_Presentation}]*$/u;
    let value = emojiInput.value.slice(0, 2);
    // If input contains non-emoji characters, try to extract emoji or clear
    if (value && !emojiRegex.test(value)) {
      // Extract any emoji characters
      const emojiMatch = value.match(/[\p{Emoji}\p{Emoji_Presentation}]/gu);
      value = emojiMatch ? emojiMatch.slice(0, 1).join('') : '';
      emojiInput.value = value;
    }
    settings.quickReply.buttons[index].emoji = value;
    await saveSettings();
  }, 500));

  textInput.addEventListener('input', debounce(async () => {
    settings.quickReply.buttons[index].text = textInput.value.slice(0, 100);
    await saveSettings();
  }, 500));

  removeBtn.addEventListener('click', async () => {
    settings.quickReply.buttons.splice(index, 1);
    renderQuickReplyButtons();
    await saveSettings();
    Toast.success('Button removed');
  });

  return item;
}

// Add a new quick reply button
export function addQuickReplyButton() {
  if (!settings.quickReply) {
    settings.quickReply = { enabled: true, minimized: false, buttons: [] };
  }

  if (settings.quickReply.buttons.length >= 10) {
    Toast.warning('Maximum of 10 quick reply buttons');
    return;
  }

  settings.quickReply.buttons.push({ text: '', emoji: '' });
  renderQuickReplyButtons();
  saveSettings();
}

// Initialize quick reply position selector
export function initQuickReplyPosition() {
  if (!elements.quickReplyPosition) return;

  // Set initial value from settings
  const position = settings.quickReply?.position || 'bottom-right';
  elements.quickReplyPosition.value = position;

  // Listen for changes
  elements.quickReplyPosition.addEventListener('change', async () => {
    if (!settings.quickReply) {
      settings.quickReply = { enabled: true, minimized: false, buttons: [], position: 'bottom-right' };
    }
    settings.quickReply.position = elements.quickReplyPosition.value;
    await saveSettings();
    Toast.success('Position updated');
  });
}
