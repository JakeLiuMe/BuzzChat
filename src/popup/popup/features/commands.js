// BuzzChat - Commands Feature
// Commands UI management with import/export

import { settings } from '../core/state.js';
import { saveSettings } from '../core/storage.js';
import { debounce, validateText, validateNumber } from '../core/utils.js';
import { Toast } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { canAddItem } from './featureAccess.js';

// Render commands list
export function renderCommands() {
  if (!elements.commandsList) return;
  elements.commandsList.innerHTML = '';

  const commands = settings.commands?.list || [];

  if (commands.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">⌨️</div>
      <h4>No Commands Yet</h4>
      <p>Create chat commands like !shipping or !payment</p>
      <button class="btn btn-primary empty-state-cta">Add Your First Command</button>
    `;
    emptyState.querySelector('.empty-state-cta').addEventListener('click', () => {
      if (canAddItem('command')) addCommand();
    });
    elements.commandsList.appendChild(emptyState);
    return;
  }

  commands.forEach((cmd, index) => {
    const item = createCommandItem(cmd, index);
    elements.commandsList.appendChild(item);
  });
}

// Create a command item
function createCommandItem(cmd, index) {
  const template = elements.commandTemplate.content.cloneNode(true);
  const item = template.querySelector('.command-item');

  const triggerInput = item.querySelector('.command-trigger');
  const responseInput = item.querySelector('.command-response');
  const cooldownInput = item.querySelector('.command-cooldown');
  const usageCount = item.querySelector('.command-usage-count');
  const removeBtn = item.querySelector('.remove-command-btn');

  triggerInput.value = cmd.trigger || '';
  responseInput.value = cmd.response || '';
  cooldownInput.value = cmd.cooldown || 30;
  usageCount.textContent = `${cmd.usageCount || 0} uses`;

  triggerInput.addEventListener('input', debounce(async () => {
    // Remove ! prefix if user types it
    let trigger = triggerInput.value.replace(/^!+/, '').toLowerCase();
    // Only allow alphanumeric and underscore
    trigger = trigger.replace(/[^a-z0-9_]/g, '');
    triggerInput.value = trigger;
    settings.commands.list[index].trigger = trigger;
    await saveSettings();
  }, 500));

  responseInput.addEventListener('input', debounce(async () => {
    settings.commands.list[index].response = validateText(responseInput.value);
    await saveSettings();
  }, 500));

  cooldownInput.addEventListener('change', async () => {
    const validated = validateNumber(cooldownInput.value, 0, 300, 30);
    settings.commands.list[index].cooldown = validated;
    cooldownInput.value = validated;
    await saveSettings();
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Delete this command? This cannot be undone.')) return;
    settings.commands.list.splice(index, 1);
    renderCommands();
    await saveSettings();
    Toast.success('Command deleted');
  });

  return item;
}

// Add a new command
export function addCommand() {
  if (!canAddItem('command')) return;
  if (!settings.commands) settings.commands = { enabled: false, list: [] };
  settings.commands.list.push({
    trigger: '',
    response: '',
    cooldown: 30,
    usageCount: 0
  });
  renderCommands();
  saveSettings();
}

// Export commands to JSON file
export function exportCommands() {
  const commands = settings.commands?.list || [];
  if (commands.length === 0) {
    Toast.warning('No commands to export');
    return;
  }

  try {
    const data = JSON.stringify(commands, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'buzzchat-commands.json';
    a.click();

    URL.revokeObjectURL(url);
    Toast.success('Commands exported');
  } catch (e) {
    Toast.error('Export failed');
  }
}

// Import commands from JSON file
export async function importCommands(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);

    // Validate structure
    if (!Array.isArray(imported)) {
      Toast.error('Invalid commands file format');
      event.target.value = '';
      return;
    }

    // Validate and sanitize each command
    const validCommands = imported
      .filter(cmd => cmd && typeof cmd === 'object')
      .map(cmd => ({
        trigger: String(cmd.trigger || '').replace(/^!+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20),
        response: String(cmd.response || '').slice(0, 500),
        cooldown: Math.min(300, Math.max(0, parseInt(cmd.cooldown) || 30)),
        usageCount: 0 // Reset usage count on import
      }))
      .filter(cmd => cmd.trigger && cmd.response);

    if (validCommands.length === 0) {
      Toast.error('No valid commands found in file');
      event.target.value = '';
      return;
    }

    if (!settings.commands) settings.commands = { enabled: false, list: [] };
    settings.commands.list = [...settings.commands.list, ...validCommands];
    await saveSettings();
    renderCommands();
    Toast.success(`Imported ${validCommands.length} commands`);
  } catch (e) {
    Toast.error('Failed to parse commands file');
  }

  event.target.value = '';
}
