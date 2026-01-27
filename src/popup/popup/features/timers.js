// BuzzChat - Timer Messages Feature
// Timer messages UI management

import { settings } from '../core/state.js';
import { VALIDATION } from '../core/config.js';
import { saveSettings } from '../core/storage.js';
import { debounce, validateText, validateNumber } from '../core/utils.js';
import { Toast } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { canAddItem } from './featureAccess.js';

// Render timer messages list
export function renderTimerMessages() {
  elements.timerMessages.innerHTML = '';

  if (settings.timer.messages.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">⏰</div>
      <h4>No Timer Messages Yet</h4>
      <p>Add timed promotions that repeat during your stream</p>
      <button class="btn btn-primary empty-state-cta">Add Your First Timer</button>
    `;
    emptyState.querySelector('.empty-state-cta').addEventListener('click', () => {
      if (canAddItem('timer')) addTimerMessage();
    });
    elements.timerMessages.appendChild(emptyState);
    return;
  }

  settings.timer.messages.forEach((msg, index) => {
    const item = createTimerMessageItem(msg, index);
    elements.timerMessages.appendChild(item);
  });
}

// Create a timer message item
function createTimerMessageItem(msg, index) {
  const template = elements.timerMessageTemplate.content.cloneNode(true);
  const item = template.querySelector('.timer-message-item');

  const textInput = item.querySelector('.timer-text');
  const intervalInput = item.querySelector('.timer-interval');
  const removeBtn = item.querySelector('.remove-timer-btn');

  textInput.value = msg.text || '';
  intervalInput.value = msg.interval || 5;

  textInput.addEventListener('input', debounce(async () => {
    settings.timer.messages[index].text = validateText(textInput.value);
    await saveSettings();
  }, 500));

  intervalInput.addEventListener('change', async () => {
    const validated = validateNumber(
      intervalInput.value,
      VALIDATION.MIN_TIMER_INTERVAL,
      VALIDATION.MAX_TIMER_INTERVAL,
      5
    );
    settings.timer.messages[index].interval = validated;
    intervalInput.value = validated;
    await saveSettings();
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Delete this timer message? This cannot be undone.')) return;
    settings.timer.messages.splice(index, 1);
    renderTimerMessages();
    await saveSettings();
    Toast.success('Timer message deleted');
  });

  return item;
}

// Add a new timer message
export function addTimerMessage() {
  if (!canAddItem('timer')) return;
  settings.timer.messages.push({ text: '', interval: 5 });
  renderTimerMessages();
  saveSettings();
}
