// BuzzChat - FAQ Rules Feature
// FAQ rules UI management

import { settings } from '../core/state.js';
import { VALIDATION } from '../core/config.js';
import { saveSettings } from '../core/storage.js';
import { debounce, validateText } from '../core/utils.js';
import { Toast } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { canAddItem } from './featureAccess.js';

// Render FAQ rules list
export function renderFaqRules() {
  elements.faqItems.innerHTML = '';

  if (settings.faq.rules.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">❓</div>
      <h4>No FAQ Rules Yet</h4>
      <p>Auto-reply to common questions like "shipping?" or "payment?"</p>
      <button class="btn btn-primary empty-state-cta">Add Your First FAQ</button>
    `;
    emptyState.querySelector('.empty-state-cta').addEventListener('click', () => {
      if (canAddItem('faq')) addFaqRule();
    });
    elements.faqItems.appendChild(emptyState);
    return;
  }

  settings.faq.rules.forEach((rule, index) => {
    const item = createFaqItem(rule, index);
    elements.faqItems.appendChild(item);
  });
}

// Create a FAQ item
function createFaqItem(rule, index) {
  const template = elements.faqTemplate.content.cloneNode(true);
  const item = template.querySelector('.faq-item');

  const triggersInput = item.querySelector('.faq-triggers');
  const replyInput = item.querySelector('.faq-reply');
  const caseSensitiveInput = item.querySelector('.faq-case-sensitive');
  const removeBtn = item.querySelector('.remove-faq-btn');

  triggersInput.value = rule.triggers?.join(', ') || '';
  replyInput.value = rule.reply || '';
  caseSensitiveInput.checked = rule.caseSensitive || false;

  triggersInput.addEventListener('input', debounce(async () => {
    let triggers = triggersInput.value.split(',').map(t => t.trim()).filter(t => t);
    // Limit number of triggers per rule
    if (triggers.length > VALIDATION.MAX_FAQ_TRIGGERS) {
      triggers = triggers.slice(0, VALIDATION.MAX_FAQ_TRIGGERS);
      Toast.warning(`Maximum of ${VALIDATION.MAX_FAQ_TRIGGERS} triggers per rule`);
    }
    settings.faq.rules[index].triggers = triggers;
    await saveSettings();
  }, 500));

  replyInput.addEventListener('input', debounce(async () => {
    settings.faq.rules[index].reply = validateText(replyInput.value);
    await saveSettings();
  }, 500));

  caseSensitiveInput.addEventListener('change', async () => {
    settings.faq.rules[index].caseSensitive = caseSensitiveInput.checked;
    await saveSettings();
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Delete this FAQ rule? This cannot be undone.')) return;
    settings.faq.rules.splice(index, 1);
    renderFaqRules();
    await saveSettings();
    Toast.success('FAQ rule deleted');
  });

  return item;
}

// Add a new FAQ rule
export function addFaqRule() {
  if (!canAddItem('faq')) return;
  settings.faq.rules.push({ triggers: [], reply: '', caseSensitive: false });
  renderFaqRules();
  saveSettings();
}
