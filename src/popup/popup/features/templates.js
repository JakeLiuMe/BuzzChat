// BuzzChat - Quick Templates Feature
// Quick templates UI management

import { settings } from '../core/state.js';
import { saveSettings, sendMessageToContent } from '../core/storage.js';
import { debounce, validateText } from '../core/utils.js';
import { Toast, Loading } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { canAddItem } from './featureAccess.js';

// Render templates list
export function renderTemplates() {
  elements.templatesList.innerHTML = '';

  if (settings.templates.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">📝</div>
      <h4>No Templates Yet</h4>
      <p>Save frequently used messages for quick sending</p>
      <button class="btn btn-primary empty-state-cta">Add Your First Template</button>
    `;
    emptyState.querySelector('.empty-state-cta').addEventListener('click', () => {
      if (canAddItem('template')) addTemplate();
    });
    elements.templatesList.appendChild(emptyState);
    return;
  }

  settings.templates.forEach((template, index) => {
    const item = createTemplateItem(template, index);
    elements.templatesList.appendChild(item);
  });
}

// Create a template item
function createTemplateItem(template, index) {
  const templateEl = elements.templateTemplate.content.cloneNode(true);
  const item = templateEl.querySelector('.template-item');

  const nameInput = item.querySelector('.template-name');
  const textInput = item.querySelector('.template-text');
  const sendBtn = item.querySelector('.send-template-btn');
  const removeBtn = item.querySelector('.remove-template-btn');

  nameInput.value = template.name || '';
  textInput.value = template.text || '';

  nameInput.addEventListener('input', debounce(async () => {
    settings.templates[index].name = validateText(nameInput.value, 50); // Short name limit
    await saveSettings();
  }, 500));

  textInput.addEventListener('input', debounce(async () => {
    settings.templates[index].text = validateText(textInput.value);
    await saveSettings();
  }, 500));

  sendBtn.addEventListener('click', async () => {
    if (!textInput.value.trim()) {
      Toast.warning('Template is empty');
      return;
    }
    Loading.show(sendBtn);
    const success = await sendMessageToContent('SEND_TEMPLATE', { text: textInput.value });
    Loading.hide(sendBtn);
    if (success) {
      Toast.success('Template sent');
    }
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    settings.templates.splice(index, 1);
    renderTemplates();
    await saveSettings();
    Toast.success('Template deleted');
  });

  return item;
}

// Add a new template
export function addTemplate() {
  if (!canAddItem('template')) return;
  settings.templates.push({ name: '', text: '' });
  renderTemplates();
  saveSettings();
}
